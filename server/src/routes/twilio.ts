import express, { Router, Request, Response } from 'express';
import twilio from 'twilio';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
import { getInsforgeClient } from '../lib/insforge.js';

const router = Router();
const { AccessToken } = twilio.jwt;
const { VoiceGrant } = AccessToken;

// Lazy-initialize Twilio REST client (requires account credentials)
function getTwilioClient(accountSid: string, authToken: string) {
  return twilio(accountSid, authToken);
}

// ── POST /api/twilio/token ─────────────────────────────────────────
// Authenticated. Generates a short-lived Twilio Access Token with VoiceGrant.
router.post('/token', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, 'Unauthorized', 'auth_required');

    // Fetch Twilio credentials from user_settings
    const { data: settings, error } = await req.db!.database
      .from('user_settings')
      .select('twilio_account_sid, twilio_api_key, twilio_api_secret, twilio_twiml_app_sid')
      .eq('user_id', userId)
      .single();

    if (error || !settings?.twilio_account_sid) {
      throw new ApiError(400, 'Twilio Account SID not configured. Go to Connectors page.', 'config_missing');
    }
    if (!settings?.twilio_api_key || !settings?.twilio_api_secret) {
      throw new ApiError(400, 'Twilio API Key/Secret not configured. Go to Connectors page.', 'config_missing');
    }
    if (!settings?.twilio_twiml_app_sid) {
      throw new ApiError(400, 'TwiML App SID not configured. Go to Connectors page.', 'config_missing');
    }

    console.log('[twilio/token] Generating token for user:', userId);

    const token = new AccessToken(
      settings.twilio_account_sid,
      settings.twilio_api_key,
      settings.twilio_api_secret,
      { identity: `user_${userId}` }
    );

    const grant = new VoiceGrant({
      outgoingApplicationSid: settings.twilio_twiml_app_sid,
      incomingAllow: true,
    });
    token.addGrant(grant);

    console.log('[twilio/token] Token generated successfully');
    res.json({ data: { token: token.toJwt() } });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/twilio/voice ─────────────────────────────────────────
// Unauthenticated TwiML webhook. Twilio calls this when a browser
// client initiates an outbound call via device.connect().
// Returns TwiML XML instructing Twilio how to route the call.
router.post('/voice', express.urlencoded({ extended: false }), async (req: Request, res: Response) => {
  try {
    const twiml = new twilio.twiml.VoiceResponse();
    const to = req.body.To;
    const from = req.body.From || req.body.Caller;
    const callSid = req.body.CallSid;

    console.log(`[Twilio Voice Webhook] To=${to}, From=${from}, CallSid=${callSid}`);
    console.log(`[Twilio Voice Webhook] Raw body:`, JSON.stringify(req.body));

    let verifiedCallerId: string | null = null;
    let userId: string | null = null;

    // Extract user identity from From field (Twilio Voice SDK sends "client:user_123")
    const clientMatch = from?.match(/^client:(.+)$/);
    if (clientMatch) {
      const identity = clientMatch[1];
      // Identity format is "user_<id>" from token generation
      const userIdMatch = identity.match(/^user_(.+)$/);
      if (userIdMatch) {
        userId = userIdMatch[1];
        console.log(`[Twilio Voice Webhook] Identified user: ${userId} from identity: ${identity}`);

        // Use admin client to fetch user's verified Twilio caller number from settings
        const adminDb = getInsforgeClient();
        const { data: settings, error } = await adminDb.database
          .from('user_settings')
          .select('twilio_caller_number')
          .eq('user_id', userId)
          .single();

        if (settings?.twilio_caller_number) {
          verifiedCallerId = settings.twilio_caller_number;
          console.log(`[Twilio Voice Webhook] Using verified caller ID from settings: ${verifiedCallerId}`);
        } else {
          console.error(`[Twilio Voice Webhook] No twilio_caller_number found for user ${userId}`);
        }
      }
    }

    // Use verified caller ID from settings, fallback to SDK's From if extraction failed
    const callerId = verifiedCallerId || from;

    // Validate callerId - Twilio requires a verified phone number for outbound calls
    if (!callerId || !/^\+?\d{10,15}$/.test(callerId.replace(/[\s\-()]/g, ''))) {
      console.error('[Twilio Voice Webhook] Missing or invalid callerId:', callerId);
      twiml.say('Caller ID not configured. Please set a verified phone number in your connector settings.');
      res.type('text/xml').send(twiml.toString());
      return;
    }

    if (to) {
      // If "To" looks like a phone number, dial it
      if (/^[\d+\-() ]+$/.test(to)) {
        const dial = twiml.dial({ callerId });
        dial.number(to);
      } else {
        // Could be a client identity — dial as client
        const dial = twiml.dial({ callerId });
        dial.client(to);
      }
    } else {
      twiml.say('No destination number was provided.');
    }

    res.type('text/xml').send(twiml.toString());
  } catch (err) {
    console.error('[Twilio Voice Webhook] Error:', err);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('An application error occurred.');
    res.type('text/xml').status(500).send(twiml.toString());
  }
});

// ── POST /api/twilio/webhook ───────────────────────────────────────
// Status callback webhook for call events (optional, for future use)
router.post('/webhook', express.json(), async (req: Request, res: Response) => {
  try {
    const eventType = req.body?.CallStatus;
    console.log(`[Twilio Webhook] Status: ${eventType}`);
    res.status(200).send('OK');
  } catch (err) {
    console.error('[Twilio Webhook] Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
