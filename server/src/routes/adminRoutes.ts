import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { requireRole } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/stats', requireRole('admin'), adminController.getAdminStats);
router.get('/teachers', requireRole('admin', 'manager'), adminController.getTeachersList);
router.post('/teachers', requireRole('admin'), adminController.createTeacher);
router.put('/teachers/:id', requireRole('admin'), adminController.updateTeacher);
router.delete('/teachers/:id', requireRole('admin'), adminController.deleteTeacher);
router.get('/students', requireRole('admin'), adminController.getStudentsWithPagination);
router.put('/students/:id/password', requireRole('admin', 'manager'), adminController.updateStudentPassword);

// Vocab Battles
router.get('/vocab-battles', requireRole('admin', 'manager', 'teacher'), adminController.getVocabBattles);
router.post('/vocab-battles', requireRole('admin', 'teacher'), adminController.createVocabBattle);
router.put('/vocab-battles/:id', requireRole('admin', 'teacher'), adminController.updateVocabBattle);
router.get('/vocab-battles/:id', requireRole('admin', 'manager', 'teacher'), adminController.getVocabBattleById);
router.delete('/vocab-battles/:id', requireRole('admin', 'teacher'), adminController.deleteVocabBattle);

// Telegram Questions
router.get('/telegram-questions', requireRole('admin', 'teacher', 'manager'), adminController.getTelegramQuestions);
router.post('/telegram-questions', requireRole('admin', 'teacher'), adminController.createTelegramQuestion);
router.put('/telegram-questions/:id', requireRole('admin', 'teacher'), adminController.updateTelegramQuestion);
router.delete('/telegram-questions/:id', requireRole('admin', 'teacher'), adminController.deleteTelegramQuestion);

// Settings
router.get('/settings/:key', requireRole('admin'), adminController.getAdminSetting);
router.put('/settings', requireRole('admin'), adminController.updateAdminSetting);

// Booking Slots
router.get('/available-slots', requireRole('admin', 'manager', 'teacher'), adminController.getAvailableSlots);
router.post('/available-slots', requireRole('admin'), adminController.createAvailableSlot);
router.put('/available-slots/:id', requireRole('admin'), adminController.updateAvailableSlot);
router.delete('/available-slots/:id', requireRole('admin'), adminController.deleteAvailableSlot);

// Level Topics
router.get('/level-topics', adminController.getLevelTopics);
router.post('/level-topics', requireRole('admin'), adminController.createLevelTopic);
router.delete('/level-topics/:id', requireRole('admin'), adminController.deleteLevelTopic);

// Uploads
router.post('/upload', requireRole('admin', 'manager'), upload.single('image'), adminController.uploadImage);

export default router;
