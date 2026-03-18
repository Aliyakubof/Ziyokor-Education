import { Router } from 'express';
import * as battleController from '../controllers/battleController';
import { requireRole } from '../middleware/auth';

const router = Router();

router.get('/leaderboard', requireRole('student', 'teacher', 'admin', 'manager'), battleController.getBattleLeaderboard);
router.get('/current/:groupId', requireRole('student', 'teacher', 'admin', 'manager'), battleController.getCurrentBattle);
router.get('/:id', requireRole('student', 'teacher', 'admin', 'manager'), battleController.getBattleById);
router.get('/:id/details', requireRole('student', 'teacher', 'admin', 'manager'), battleController.getBattleById);

export default router;
