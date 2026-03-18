import { Router } from 'express';
import authRoutes from './authRoutes';
import studentRoutes from './studentRoutes';
import teacherRoutes from './teacherRoutes';
import adminRoutes from './adminRoutes';
import shopRoutes from './shopRoutes';
import quizRoutes from './quizRoutes';
import settingsRoutes from './settingsRoutes';
import battleRoutes from './battleRoutes';
import * as adminController from '../controllers/adminController';

const router = Router();

router.use('/auth', authRoutes);
router.use('/student', studentRoutes);
router.use('/teacher', teacherRoutes);
router.use('/admin', adminRoutes);
router.use('/shop', shopRoutes);
router.use('/quizzes', quizRoutes);
router.use('/settings', settingsRoutes);
router.use('/battles', battleRoutes);

// Publicly accessible but logic in adminController
router.get('/level-topics', adminController.getLevelTopics);

export default router;
