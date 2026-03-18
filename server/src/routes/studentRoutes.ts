import { Router } from 'express';
import * as studentController from '../controllers/studentController';
import { requireRole } from '../middleware/auth';

const router = Router();

// Public routes for student login
router.post('/check-id', studentController.checkStudentId);
router.post('/login', studentController.login);

// Protected student routes
router.get('/leaderboard', studentController.getLeaderboard);
router.get('/:id/stats', requireRole('student', 'teacher', 'admin', 'manager'), studentController.getStats);
router.get('/:id/history', requireRole('student', 'teacher', 'admin', 'manager'), studentController.getHistory);
router.put('/:id/avatar', requireRole('student'), studentController.updateAvatar);
router.post('/:id/usage', studentController.reportUsage);

// Themes & Avatar Store Actions
router.post('/active-theme', requireRole('student'), studentController.setActiveTheme);
router.post('/active-avatar', requireRole('student'), studentController.setActiveAvatar);

// Vocab Battles (Student View)
router.get('/vocab-battles/levels', requireRole('student'), studentController.getVocabBattleLevels);
router.get('/vocab-battles/:id', requireRole('student'), studentController.getVocabBattleById);

// Extra Class Bookings (Student View)
router.post('/:studentId/book-extra-class', requireRole('student'), studentController.bookExtraClass);
router.delete('/extra-class-bookings/:id', requireRole('student'), studentController.cancelBooking);

// Contact History
router.post('/:id/contact', requireRole('teacher', 'admin'), studentController.updateContactLog);
router.get('/:id/contact-logs', requireRole('teacher', 'admin'), studentController.getContactLogs);

export default router;
