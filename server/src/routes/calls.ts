import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

// ── Zod Validation Schema ──────────────────────────────────────────
const callLogSchema = z.object({
  lead_id: z.string().uuid('lead_id must be a valid UUID'),
  campaign_id: z.string().uuid('campaign_id must be a valid UUID').optional().or(z.literal('')),
  duration_seconds: z.number().int().min(0).default(0),
  status: z.string().min(1).max(50).default('completed'),
  disposition: z.string().min(1).max(50).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

// POST /api/calls/log
router.post('/log', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, 'Unauthorized', 'auth_required');

    // Validate input with Zod — throws ZodError caught by centralized errorHandler
    const validated = callLogSchema.parse(req.body);

    // Insert call log
    const { data: logData, error: logError } = await req.db!.database
      .from('call_logs')
      .insert({
        user_id: userId,
        lead_id: validated.lead_id,
        campaign_id: validated.campaign_id || null,
        provider: 'telnyx',
        direction: 'outbound',
        duration_seconds: validated.duration_seconds,
        status: validated.status,
        disposition: validated.disposition || null,
        notes: validated.notes || null,
      })
      .select()
      .single();

    if (logError) {
      console.error('[calls/log] Insert error:', logError);
      throw new ApiError(500, logError.message, 'db_error');
    }

    // Update lead status to match disposition
    if (validated.disposition) {
      const { error: leadError } = await req.db!.database
        .from('leads')
        .update({ status: validated.disposition })
        .eq('id', validated.lead_id)
        .eq('user_id', userId);

      if (leadError) {
        console.error('[calls/log] Lead update error:', leadError);
        // Non-fatal — log was still created
      }
    }

    res.status(200).json({ data: logData });
  } catch (err) {
    next(err);
  }
});

export default router;
