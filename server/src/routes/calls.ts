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

    console.log('[calls/log] Received payload:', req.body);

    // Validate input with Zod — throws ZodError caught by centralized errorHandler
    const validated = callLogSchema.parse(req.body);

    console.log('[calls/log] Validated data:', validated);

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
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.error('[calls/log] Insert error:', logError);
      throw new ApiError(500, logError.message, 'db_error');
    }

    console.log('[calls/log] Inserted log:', logData);

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

    // Update campaign's leads_called counter based on actual called leads
    if (validated.campaign_id) {
      try {
        // Count leads in this campaign whose status is NOT 'new' or 'calling'
        const { count, error: countError } = await req.db!.database
          .from('campaign_leads')
          .select('lead_id, leads!inner(status)', { count: 'exact', head: true })
          .eq('campaign_id', validated.campaign_id)
          .not('leads.status', 'in', '("new","calling")');

        if (!countError && count !== null) {
          await req.db!.database
            .from('campaigns')
            .update({ leads_called: count, updated_at: new Date().toISOString() })
            .eq('id', validated.campaign_id);
        }
      } catch (e) {
        console.error('[calls/log] Campaign counter update error:', e);
        // Non-fatal
      }
    }

    res.status(200).json({ data: logData });
  } catch (err) {
    next(err);
  }
});
// GET /api/calls — List call logs for user
router.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { campaign_id, lead_id, limit = '50', offset = '0' } = req.query;

    let query = req.db!.database
      .from('call_logs')
      .select(`
        id,
        lead_id,
        campaign_id,
        provider,
        direction,
        from_number,
        to_number,
        status,
        disposition,
        disposition_sub,
        duration_seconds,
        recording_url,
        notes,
        started_at,
        ended_at,
        created_at,
        leads (first_name, last_name, company, phone),
        campaigns (name)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (campaign_id) {
      query = query.eq('campaign_id', campaign_id as string);
    }
    if (lead_id) {
      query = query.eq('lead_id', lead_id as string);
    }

    const { data, count, error } = await query.range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      console.error('[calls/list] Query error:', error);
      throw new ApiError(500, error.message, 'db_error');
    }

    const formattedData = data?.map((row: any) => ({
      ...row,
      lead: row.leads ? {
        first_name: row.leads.first_name,
        last_name: row.leads.last_name,
        company: row.leads.company,
        phone: row.leads.phone
      } : null,
      campaign: row.campaigns ? { name: row.campaigns.name } : null
    })) || [];

    res.json({ data: formattedData, meta: { total: count || 0, count: formattedData.length } });
  } catch (err) {
    next(err);
  }
});

// GET /api/calls/stats — Get call statistics
router.get('/stats', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { campaign_id } = req.query;

    let baseQuery = req.db!.database
      .from('call_logs')
      .select('id, status, disposition, duration_seconds', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (campaign_id) {
      baseQuery = baseQuery.eq('campaign_id', campaign_id as string);
    }

    const { data, error } = await baseQuery;

    if (error) throw new ApiError(500, error.message, 'db_error');

    const totalCalls = data?.length || 0;
    const answeredCalls = data?.filter((c: any) => c.status === 'completed' || c.status === 'answered').length || 0;
    const totalDuration = data?.reduce((sum: number, c: any) => sum + (c.duration_seconds || 0), 0) || 0;
    
    const dispositionCounts: Record<string, number> = {};
    data?.forEach((c: any) => {
      if (c.disposition) {
        dispositionCounts[c.disposition] = (dispositionCounts[c.disposition] || 0) + 1;
      }
    });

    res.json({
      data: {
        totalCalls,
        answeredCalls,
        totalDuration,
        avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
        dispositionCounts
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
