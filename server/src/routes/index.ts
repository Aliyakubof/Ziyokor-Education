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
import * as authController from '../controllers/authController';
import * as studentController from '../controllers/studentController';

const router = Router();

router.use('/auth', authRoutes);
router.use('/student', studentRoutes);
router.use('/teacher', teacherRoutes);
router.use('/manager', teacherRoutes); // Mount teacherRoutes under /manager
router.use('/admin', adminRoutes);
router.use('/manager', adminRoutes); // Mount adminRoutes under /manager
router.use('/shop', shopRoutes);
router.use('/quizzes', quizRoutes);
router.use('/settings', settingsRoutes);
router.use('/manager/settings', settingsRoutes);
router.use('/battles', battleRoutes);

// Publicly accessible but logic in adminController
router.get('/level-topics', adminController.getLevelTopics);

// --- Compatibility Aliases for Frontend (Flat Paths) ---
import * as teacherController from '../controllers/teacherController';
import * as quizController from '../controllers/quizController';
import { requireRole } from '../middleware/auth';

router.get('/groups', requireRole('admin', 'teacher', 'manager'), teacherController.getGroups);
router.get('/admin/groups', requireRole('admin', 'teacher', 'manager'), teacherController.getGroups);
router.get('/unit-quizzes', requireRole('admin', 'teacher', 'manager'), quizController.getUnitQuizzes);
router.get('/solo-quizzes', requireRole('admin', 'teacher', 'manager'), quizController.getSoloQuizzes);
router.get('/duel-quizzes', requireRole('admin', 'teacher', 'manager', 'student'), quizController.getDuelQuizzes);
router.post('/duel-quizzes', requireRole('admin', 'teacher'), quizController.createDuelQuiz);
router.put('/duel-quizzes/:id', requireRole('admin', 'teacher'), quizController.updateDuelQuiz);
router.delete('/duel-quizzes/:id', requireRole('admin', 'teacher'), quizController.deleteDuelQuiz);
router.get('/available-slots', requireRole('admin', 'manager', 'teacher'), adminController.getAvailableSlots);
router.get('/slots', requireRole('admin', 'manager', 'teacher'), adminController.getAvailableSlots);

// Additional common flat routes
import * as shopController from '../controllers/shopController';
router.get('/teachers', requireRole('admin', 'manager'), adminController.getTeachersList);
router.get('/students', requireRole('admin'), adminController.getStudentsWithPagination);
router.get('/leaderboard', requireRole('admin', 'teacher', 'manager', 'student'), studentController.getLeaderboard);
router.get('/shop-items', requireRole('admin', 'teacher', 'student', 'manager'), shopController.getItems);

// Critical legacy redirects
router.post('/login', authController.login);
router.get('/groups/:groupId', requireRole('admin', 'teacher', 'manager', 'student'), teacherController.getGroupById);
router.get('/groups/:groupId/extra-class-bookings', requireRole('admin', 'teacher', 'manager', 'student'), teacherController.getExtraClassBookings);
router.get('/student/:id/purchases', requireRole('student', 'teacher', 'admin', 'manager'), shopController.getPurchases);

// Extra aliasing for Manager specifically if they use flat /manager paths
router.get('/manager/groups', requireRole('admin', 'manager', 'teacher'), teacherController.getGroups);
router.get('/manager/weekly-report', requireRole('admin', 'manager', 'teacher'), teacherController.getWeeklyReport);

// GroupDetails compatibility (Round 2 Fixes)
router.get('/groups/:groupId/results', requireRole('admin', 'teacher', 'manager'), teacherController.getGroupResults);
router.get('/groups/:groupId/contact-logs', requireRole('admin', 'teacher', 'manager'), teacherController.getGroupContactLogs);
router.get('/groups/:groupId/contact-info-pdf', requireRole('admin', 'teacher', 'manager'), teacherController.getGroupContactInfoPDF);
router.get('/students/:groupId', requireRole('admin', 'teacher', 'manager'), teacherController.getStudentsByGroup);

export default router;
