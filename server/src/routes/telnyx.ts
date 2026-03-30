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
      .select('telnyx_api_key, telnyx_sip_login')
      .eq('user_id', userId)
      .single();

    if (error || !settings?.telnyx_api_key) {
      throw new ApiError(400, 'Telnyx API Key not configured. Go to Connectors page.', 'config_missing');
    }

    const telnyxApiKey = settings.telnyx_api_key;
    const sipLogin = settings.telnyx_sip_login;

    // 2. Find credential connections via Telnyx REST API
    const credsRes = await fetch('https://api.telnyx.com/v2/telephony_credentials', {
      headers: {
        'Authorization': `Bearer ${telnyxApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!credsRes.ok) {
      throw new ApiError(502, 'Failed to reach Telnyx API', 'telnyx_upstream');
    }

    const credsData = await credsRes.json();

    // Match by SIP login or fallback to the first credential
    const matchingConn =
      credsData.data?.find((c: any) => c.sip_username === sipLogin) ||
      credsData.data?.[0];

    if (!matchingConn) {
      throw new ApiError(400, 'No Telnyx SIP Credential found. Create one in Telnyx dashboard.', 'no_credential');
    }

    const connectionId = matchingConn.id;

    // 3. Generate a short-lived WebRTC JWT
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

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[telnyx/token] Token generation failed:', errText);
      throw new ApiError(502, 'Failed to generate Telnyx WebRTC token', 'token_failed');
    }

    const tokenData = await tokenRes.json();
    const jwt = typeof tokenData === 'string' ? tokenData : (tokenData.data || tokenData);

    res.json({ token: jwt });
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
