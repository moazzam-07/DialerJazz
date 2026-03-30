import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();
router.use(requireAuth);

const updateSettingsSchema = z.object({
  telnyx_api_key: z.string().optional(),
  telnyx_sip_login: z.string().optional(),
  telnyx_sip_password: z.string().optional(),
  telnyx_caller_number: z.string().optional(),
});

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await req.db!
      .database.from('user_settings')
      .select('telnyx_api_key, telnyx_sip_login, telnyx_sip_password, telnyx_caller_number, created_at, updated_at')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) throw new ApiError(500, error.message, 'db_error');

    res.json({ data: data || {} });
  } catch (error) {
    next(error);
  }
});

router.put('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const body = updateSettingsSchema.parse(req.body);

    const updatePayload: Record<string, unknown> = {
      user_id: req.user.id,
      updated_at: new Date().toISOString(),
    };
    if (body.telnyx_api_key !== undefined) updatePayload.telnyx_api_key = body.telnyx_api_key;
    if (body.telnyx_sip_login !== undefined) updatePayload.telnyx_sip_login = body.telnyx_sip_login;
    if (body.telnyx_sip_password !== undefined) updatePayload.telnyx_sip_password = body.telnyx_sip_password;
    if (body.telnyx_caller_number !== undefined) updatePayload.telnyx_caller_number = body.telnyx_caller_number;

    const { data, error } = await req.db!
      .database.from('user_settings')
      .upsert(updatePayload, { onConflict: 'user_id' })
      .select('telnyx_api_key, telnyx_sip_login, telnyx_sip_password, telnyx_caller_number, updated_at')
      .single();

    if (error) throw new ApiError(500, error.message, 'db_error');

    res.json({ data });
  } catch (error) {
    next(error);
  }
});
router.post('/verify-telnyx', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { apiKey } = z.object({ apiKey: z.string().min(10) }).parse(req.body);

    // Verify key against Telnyx real endpoint
    const telnyxRes = await fetch('https://api.telnyx.com/v2/balance', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!telnyxRes.ok) {
      return res.status(400).json({ error: { code: 'invalid_key', message: 'Invalid Telnyx API Key' } });
    }

    // Save to user_settings if valid
    const { error } = await req.db!
      .database.from('user_settings')
      .upsert({
        user_id: req.user.id,
        telnyx_api_key: apiKey,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) throw new ApiError(500, error.message, 'db_error');

    res.json({ data: { success: true, message: 'Telnyx Key Validated and Saved' } });
  } catch (error) {
    next(error);
  }
});

export default router;
