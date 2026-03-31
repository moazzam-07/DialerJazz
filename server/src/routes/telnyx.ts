import express, { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

// POST /api/telnyx/token
router.post('/token', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, 'Unauthorized', 'auth_required');

    // 1. Fetch user's Telnyx API Key and SIP login from settings
    const { data: settings, error } = await req.db!.database
      .from('user_settings')
      .select('telnyx_api_key, telnyx_sip_login, telnyx_sip_password, telnyx_caller_number')
      .eq('user_id', userId)
      .single();

    if (error || !settings?.telnyx_api_key) {
      throw new ApiError(400, 'Telnyx API Key not configured. Go to Connectors page.', 'config_missing');
    }

    if (!settings?.telnyx_sip_login || !settings?.telnyx_sip_password) {
      throw new ApiError(400, 'SIP credentials not configured. Go to Connectors page.', 'config_missing');
    }

    const telnyxApiKey = settings.telnyx_api_key;
    const sipLogin = settings.telnyx_sip_login;
    const sipPassword = settings.telnyx_sip_password;

    console.log('[telnyx/token] Using SIP login from settings:', sipLogin);

    // Try to get telephony credentials first, but fallback to using the connection directly
    let connectionId: string | null = null;

    try {
      // 2. Find credential connections via Telnyx REST API
      const credsRes = await fetch('https://api.telnyx.com/v2/telephony_credentials', {
        headers: {
          'Authorization': `Bearer ${telnyxApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (credsRes.ok) {
        const credsData = await credsRes.json();

        console.log('[telnyx/token] Found credentials:', JSON.stringify(credsData.data));

        // Filter to only telephony credentials (not mobile push)
        const validCredentials = credsData.data?.filter(
          (c: any) => c.resource_type === 'telephony_credential'
        ) || [];

        // Match by SIP login
        const matchingConn = validCredentials.find((c: any) => c.sip_username === sipLogin);

        if (matchingConn) {
          connectionId = matchingConn.id;
          console.log('[telnyx/token] Using telephony credential:', connectionId);
        }
      }
    } catch (e) {
      console.log('[telnyx/token] Could not fetch telephony credentials, will use connection directly');
    }

    // If no telephony credential found, try to find the credential connection
    if (!connectionId) {
      try {
        const connsRes = await fetch('https://api.telnyx.com/v2/credential_connections', {
          headers: {
            'Authorization': `Bearer ${telnyxApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (connsRes.ok) {
          const connsData = await connsRes.json();
          console.log('[telnyx/token] Found connections:', JSON.stringify(connsData.data));

          // Find connection by the SIP username
          const matchingConn = connsData.data?.find((c: any) => c.user_name === sipLogin);
          if (matchingConn) {
            connectionId = matchingConn.id;
            console.log('[telnyx/token] Using credential connection:', connectionId);
          }
        }
      } catch (e) {
        console.log('[telnyx/token] Could not fetch connections');
      }
    }

    // If we have a connection ID, try to generate a JWT
    if (connectionId) {
      try {
        const tokenRes = await fetch(
          `https://api.telnyx.com/v2/telephony_credentials/${connectionId}/token`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${telnyxApiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          const jwt = typeof tokenData === 'string' ? tokenData : (tokenData.data || tokenData);
          res.json({ token: jwt });
          return;
        }
      } catch (e) {
        console.log('[telnyx/token] Could not generate token from telephony credential');
      }
    }

    // Fallback: Return the SIP credentials for direct authentication
    console.log('[telnyx/token] Using direct SIP credentials (no JWT)');
    res.json({
      sip_login: sipLogin,
      sip_password: sipPassword,
      caller_number: settings.telnyx_caller_number
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/telnyx/webhook
// Receives unauthenticated Call Control callbacks from Telnyx.
// No auth middleware — Telnyx servers won't send a Bearer token.
router.post('/webhook', express.json(), async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const eventType = payload?.data?.event_type;
    console.log(`[Telnyx Webhook] Event: ${eventType}`);

    if (eventType === 'call.hangup') {
      const callSessionId = payload?.data?.payload?.call_session_id;
      console.log(`[Telnyx Webhook] Call ${callSessionId} hung up.`);
      // Future: update call_logs where provider_call_id = callSessionId
    }

    // Always acknowledge
    res.status(200).send('OK');
  } catch (err) {
    console.error('[Telnyx Webhook] Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
