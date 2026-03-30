import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();
router.use(requireAuth);

router.get('/dashboard', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user.id;

    // Run parallel queries since postgrest doesn't easily let us do multi-table aggregate in one query
    const [campaignsResult, leadsResult, callsResult] = await Promise.all([
      req.db!.database.from('campaigns').select('id', { count: 'exact', head: true }).eq('user_id', user_id),
      req.db!.database.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', user_id),
      // Approximate answered/called stats by looking at junction statuses
      req.db!.database.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', user_id).neq('status', 'new')
    ]);

    if (campaignsResult.error) throw new ApiError(500, campaignsResult.error.message, 'db_error');
    if (leadsResult.error) throw new ApiError(500, leadsResult.error.message, 'db_error');
    if (callsResult.error) throw new ApiError(500, callsResult.error.message, 'db_error');

    res.json({
      data: {
        totalCampaigns: campaignsResult.count || 0,
        totalLeads: leadsResult.count || 0,
        totalCallsMade: callsResult.count || 0,
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
