import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();
router.use(requireAuth);

const leadSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  linkedin_url: z.string().optional().or(z.literal('')),
  google_maps_url: z.string().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  google_rating: z.number().optional(),
  review_count: z.number().optional(),
  business_category: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.string().default('new'),
  priority: z.number().default(0),
  custom_fields: z.record(z.string(), z.any()).optional()
});

const bulkLeadsSchema = z.object({
  campaign_id: z.string().uuid(),
  leads: z.array(leadSchema).min(1).max(2000)
});

// Mini-CRM: Fetch all leads globally for this user with server-side search/filter
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(req.query.per_page) || 25));
    const offset = (page - 1) * perPage;

    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const tags = req.query.tags as string | undefined;

    let query = req.db!.database
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id);

    // Server-side search across name, company, email, and phone
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.or(`first_name.ilike.*${searchTerm}*,last_name.ilike.*${searchTerm}*,company.ilike.*${searchTerm}*,email.ilike.*${searchTerm}*,phone.ilike.*${searchTerm}*`);
    }

    // Filter by status
    if (status && status.trim()) {
      query = query.eq('status', status);
    }

    // Filter by tags (contains any of the specified tags)
    if (tags && tags.trim()) {
      const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (tagArray.length > 0) {
        query = query.overlaps('tags', tagArray);
      }
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (error) throw new ApiError(500, error.message, 'db_error');

    const total = count || 0;

    res.json({
      data: data || [],
      meta: {
        total,
        page,
        per_page: perPage,
        total_pages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Bulk Insert CSV into CRM and assign to campaign
router.post('/bulk', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const body = bulkLeadsSchema.parse(req.body);

    // Deduplicate leads by phone before interacting with DB
    const uniqueLeads = new Map();
    for (const l of body.leads) {
      uniqueLeads.set(l.phone, l);
    }

    const leadsToUpsert = Array.from(uniqueLeads.values()).map(lead => ({
      ...lead,
      user_id: req.user.id
    }));

    // Step 1: Upsert all leads based on User ID & Phone (prevents duplicate contacts globally)
    const { data: upsertedLeads, error: upsertError } = await req.db!
      .database.from('leads')
      .upsert(leadsToUpsert, { onConflict: 'user_id,phone' })
      .select('id');

    if (upsertError || !upsertedLeads) throw new ApiError(500, upsertError?.message || 'Failed to upsert leads', 'db_error');

    // Step 2: Map these lead IDs to the Campaign in the junction table
    const campaignLeadsToUpsert = upsertedLeads.map(lead => ({
      campaign_id: body.campaign_id,
      lead_id: lead.id,
      user_id: req.user.id
    }));

    const { error: junctionError } = await req.db!
      .database.from('campaign_leads')
      .upsert(campaignLeadsToUpsert, { onConflict: 'campaign_id,lead_id' });

    if (junctionError) throw new ApiError(500, junctionError.message, 'db_error');

    // Step 3: Update campaign total_leads count
    const { count } = await req.db!
      .database.from('campaign_leads')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', body.campaign_id);

    if (count !== null) {
      await req.db!
        .database.from('campaigns')
        .update({
          total_leads: count,
          updated_at: new Date().toISOString()
        })
        .eq('id', body.campaign_id);
    }

    res.status(201).json({ data: upsertedLeads, count: upsertedLeads.length });
  } catch (error) {
    next(error);
  }
});

// Fetch Leads specifically bound to a campaign via Junction Table
router.get('/campaign/:campaignId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { limit = '50', offset = '0' } = req.query;

    const { data, count, error } = await req.db!
      .database.from('campaign_leads')
      .select(`
        id,
        leads (*)
      `, { count: 'exact' })
      .eq('campaign_id', req.params.campaignId)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw new ApiError(500, error.message, 'db_error');

    // Flatten PostgREST structure for the frontend
    const flatData = data?.map((row: any) => ({
      ...row.leads,
      _campaign_lead_id: row.id,
      // override tracking status/tags if we intend to track state per campaign later
    })) || [];

    res.json({ data: flatData, meta: { total: count || 0, count: flatData.length } });
  } catch (error) {
    next(error);
  }
});

// Assign EXISTING leads from CRM to a campaign
router.post('/assign', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const assignSchema = z.object({
      campaign_id: z.string().uuid(),
      lead_ids: z.array(z.string().uuid()).min(1)
    });
    const body = assignSchema.parse(req.body);

    const campaignLeadsToUpsert = body.lead_ids.map(lead_id => ({
      campaign_id: body.campaign_id,
      lead_id,
      user_id: req.user.id
    }));

    const { error: junctionError } = await req.db!
      .database.from('campaign_leads')
      .upsert(campaignLeadsToUpsert, { onConflict: 'campaign_id,lead_id' });

    if (junctionError) throw new ApiError(500, junctionError.message, 'db_error');
    
    // Update count
    const { count } = await req.db!
      .database.from('campaign_leads')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', body.campaign_id);
      
    if (count !== null) {
      await req.db!.database.from('campaigns').update({ total_leads: count }).eq('id', body.campaign_id);
    }

    res.status(201).json({ success: true, count: body.lead_ids.length });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/disposition', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const dispositionSchema = z.object({
      status: z.enum(['new', 'calling', 'answered', 'no_answer', 'voicemail', 'busy', 'failed', 'dnc'])
    });
    const { status } = dispositionSchema.parse(req.body);

    const { data, error } = await req.db!
      .database.from('leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw new ApiError(500, error.message, 'db_error');

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

export default router;
