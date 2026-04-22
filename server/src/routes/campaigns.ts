import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();
router.use(requireAuth);

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be under 100 characters'),
  dialer_mode: z.enum(['preview', 'power', 'predictive']).default('preview'),
  provider: z.enum(['telnyx', 'twilio', 'local']).default('telnyx'),
});

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await req.db!
      .database.from('campaigns')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw new ApiError(500, error.message, 'db_error');

    res.json({ data: data || [] });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await req.db!
      .database.from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new ApiError(404, 'Campaign not found', 'not_found');
      throw new ApiError(500, error.message, 'db_error');
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const body = createCampaignSchema.parse(req.body);

    const { data, error } = await req.db!
      .database.from('campaigns')
      .insert({
        user_id: req.user.id,
        name: body.name,
        dialer_mode: body.dialer_mode,
        provider: body.provider,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw new ApiError(500, error.message, 'db_error');

    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const statusSchema = z.object({ status: z.enum(['draft', 'active', 'paused', 'completed']) });
    const { status } = statusSchema.parse(req.body);

    const { data, error } = await req.db!
      .database.from('campaigns')
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

router.patch('/:id/config', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const configSchema = z.object({
      dialer_mode: z.enum(['preview', 'power', 'predictive', 'click']).optional(),
      provider: z.enum(['telnyx', 'twilio', 'local']).optional(),
      caller_number: z.string().optional().nullable(),
    });
    const updates = configSchema.parse(req.body);

    // Fetch current status to enforce the lock
    const { data: campaign, error: fetchError } = await req.db!
      .database.from('campaigns')
      .select('status')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !campaign) {
      throw new ApiError(404, 'Campaign not found', 'not_found');
    }

    if (campaign.status !== 'draft') {
      throw new ApiError(400, 'Cannot modify campaign configuration after it has been launched (status is not draft)', 'bad_request');
    }

    const { data, error } = await req.db!
      .database.from('campaigns')
      .update({ ...updates, updated_at: new Date().toISOString() })
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

router.patch('/:id/rename', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const renameSchema = z.object({ name: z.string().min(1).max(100) });
    const { name } = renameSchema.parse(req.body);

    const { data, error } = await req.db!
      .database.from('campaigns')
      .update({ name, updated_at: new Date().toISOString() })
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

router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Delete the campaign (Supabase cascade deletes leads if configured, otherwise we just delete campaign)
    const { error } = await req.db!
      .database.from('campaigns')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw new ApiError(500, error.message, 'db_error');
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
