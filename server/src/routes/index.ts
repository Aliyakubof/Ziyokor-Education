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
import { upload } from '../middleware/upload';

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
router.get('/unit-quizzes/:id', requireRole('admin', 'teacher', 'manager'), quizController.getUnitQuizById);
router.get('/solo-quizzes', requireRole('admin', 'teacher', 'manager'), quizController.getSoloQuizzes);
router.get('/solo-quizzes/:id', requireRole('admin', 'teacher', 'manager'), quizController.getSoloQuizById);
router.get('/duel-quizzes', requireRole('admin', 'teacher', 'manager', 'student'), quizController.getDuelQuizzes);
router.get('/duel-quizzes/:id', requireRole('admin', 'teacher', 'manager', 'student'), quizController.getDuelQuizById);
router.post('/duel-quizzes', requireRole('admin', 'teacher', 'manager'), quizController.createDuelQuiz);
router.put('/duel-quizzes/:id', requireRole('admin', 'teacher', 'manager'), quizController.updateDuelQuiz);
router.delete('/duel-quizzes/:id', requireRole('admin', 'teacher', 'manager'), quizController.deleteDuelQuiz);

router.get('/available-slots', requireRole('admin', 'manager', 'teacher'), adminController.getAvailableSlots);
router.get('/slots', requireRole('admin', 'manager', 'teacher'), adminController.getAvailableSlots);

// Additional common flat routes
import * as shopController from '../controllers/shopController';
router.get('/teachers', requireRole('admin', 'manager'), adminController.getTeachersList);
router.get('/students', requireRole('admin', 'manager'), adminController.getStudentsWithPagination);
router.get('/students/search', requireRole('admin', 'teacher', 'student', 'manager'), teacherController.searchStudents);
router.get('/students/:studentId/available-duel-quizzes', requireRole('admin', 'teacher', 'student', 'manager'), quizController.getAvailableDuelQuizzes);
router.put('/students/:id', requireRole('admin', 'teacher', 'manager'), teacherController.updateStudent);
router.delete('/students/:id', requireRole('admin', 'manager'), teacherController.deleteStudent);
router.put('/students/:id/move', requireRole('admin', 'manager'), teacherController.moveStudent);
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
router.get('/manager/groups/:groupId/results', requireRole('admin', 'manager', 'teacher'), teacherController.getGroupResults);
router.get('/manager/groups/:groupId/students', requireRole('admin', 'manager', 'teacher'), teacherController.getStudentsByGroup);
router.get('/manager/shop/items', requireRole('admin', 'manager'), shopController.getManagerShopItems);
router.post('/manager/shop/items', requireRole('admin', 'manager'), shopController.createShopItem);
router.put('/manager/shop/items/:id', requireRole('admin', 'manager'), shopController.updateShopItem);
router.delete('/manager/shop/items/:id', requireRole('admin', 'manager'), shopController.deleteShopItem);

// GroupDetails compatibility (Round 2 Fixes)
router.get('/groups/:groupId/results', requireRole('admin', 'teacher', 'manager'), teacherController.getGroupResults);
router.get('/groups/:groupId/students', requireRole('admin', 'teacher', 'manager'), teacherController.getStudentsByGroup);
router.get('/groups/:groupId/contact-logs', requireRole('admin', 'teacher', 'manager'), teacherController.getGroupContactLogs);
router.get('/groups/:groupId/contact-info-pdf', requireRole('admin', 'teacher', 'manager'), teacherController.getGroupContactInfoPDF);
router.get('/students/:groupId', requireRole('admin', 'teacher', 'manager'), teacherController.getStudentsByGroup);
router.post('/students/:id/contact', requireRole('admin', 'teacher', 'manager'), teacherController.updateStudentContact);

// Teacher/Manager Dashboard Plural Aliases (Round 3 Fixes)
router.get('/teachers/:teacherId/groups', requireRole('admin', 'teacher', 'manager'), teacherController.getTeacherGroups);
router.get('/manager/teachers/:teacherId/groups', requireRole('admin', 'manager'), teacherController.getTeacherGroups);
router.post('/groups', requireRole('admin', 'teacher'), teacherController.createGroup);
router.put('/groups/:id', requireRole('admin', 'teacher'), teacherController.updateGroup);
router.delete('/groups/:id', requireRole('admin', 'manager'), teacherController.deleteGroup);
router.post('/students', requireRole('admin', 'teacher', 'manager'), teacherController.createStudent);
router.post('/student/purchase', requireRole('student'), shopController.purchaseItem);
router.post('/student/vocab-battles/submit', requireRole('student'), quizController.submitVocabBattle);
router.get('/student/quizzes', requireRole('student'), quizController.getSoloQuizzes);
router.post('/students/:studentId/book-extra-class', requireRole('student', 'admin', 'teacher'), studentController.bookExtraClass);
router.patch('/extra-class-bookings/:id/complete', requireRole('admin', 'teacher', 'manager'), teacherController.completeBooking);
router.delete('/extra-class-bookings/:id', requireRole('admin', 'teacher', 'manager', 'student'), teacherController.deleteBooking);

// Unit Quizzes (Plural Management)
router.post('/unit-quizzes', requireRole('admin', 'teacher', 'manager'), quizController.createUnitQuiz);
router.put('/unit-quizzes/:id', requireRole('admin', 'teacher', 'manager'), quizController.updateUnitQuiz);
router.delete('/unit-quizzes/:id', requireRole('admin', 'teacher', 'manager'), quizController.deleteUnitQuiz);

// Solo Quizzes (Plural Management)
router.post('/solo-quizzes', requireRole('admin', 'teacher', 'manager'), quizController.createSoloQuiz);
router.put('/solo-quizzes/:id', requireRole('admin', 'teacher', 'manager'), quizController.updateSoloQuiz);
router.delete('/solo-quizzes/:id', requireRole('admin', 'teacher', 'manager'), quizController.deleteSoloQuiz);
router.post('/solo-quizzes/submit', requireRole('admin', 'teacher', 'student'), quizController.submitSoloQuizPDFReport);

// Telegram Questions (Plural Management)
router.get('/telegram-questions', requireRole('admin', 'teacher', 'manager'), adminController.getTelegramQuestions);
router.post('/telegram-questions', requireRole('admin', 'teacher', 'manager'), adminController.createTelegramQuestion);
router.put('/telegram-questions/:id', requireRole('admin', 'teacher', 'manager'), adminController.updateTelegramQuestion);
router.delete('/telegram-questions/:id', requireRole('admin', 'teacher', 'manager'), adminController.deleteTelegramQuestion);

// Booking Slots (Plural Management)
router.post('/available-slots', requireRole('admin', 'manager'), adminController.createAvailableSlot);
router.put('/available-slots/:id', requireRole('admin', 'manager'), adminController.updateAvailableSlot);
router.delete('/available-slots/:id', requireRole('admin', 'manager'), adminController.deleteAvailableSlot);

// Level Topics (Plural Management)
router.post('/level-topics', requireRole('admin', 'teacher', 'manager'), adminController.createLevelTopic);
router.delete('/level-topics/:id', requireRole('admin', 'teacher', 'manager'), adminController.deleteLevelTopic);

// Carousel Management
router.get('/carousel', adminController.getCarouselSlides);
router.post('/manager/carousel', requireRole('admin', 'manager'), upload.single('image'), adminController.createCarouselSlide);
router.delete('/manager/carousel/:id', requireRole('admin', 'manager'), adminController.deleteCarouselSlide);

export default router;
