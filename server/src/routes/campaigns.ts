import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();
router.use(requireAuth);

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be under 100 characters'),
  dialer_mode: z.enum(['preview', 'power', 'predictive']).default('preview'),
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
