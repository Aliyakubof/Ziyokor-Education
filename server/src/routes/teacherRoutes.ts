import { Router } from 'express';
import * as teacherController from '../controllers/teacherController';
import { requireRole } from '../middleware/auth';

const router = Router();

router.get('/:id/stats', requireRole('teacher'), teacherController.getTeacherStats);
router.get('/groups', requireRole('admin', 'teacher', 'manager'), teacherController.getGroups);
router.get('/:teacherId/groups', requireRole('admin', 'manager', 'teacher'), teacherController.getTeacherGroups);
router.get('/groups/:groupId', requireRole('admin', 'manager', 'teacher'), teacherController.getGroupById);
router.get('/groups/:groupId/results', requireRole('admin', 'manager', 'teacher'), teacherController.getGroupResults);
router.get('/groups/:groupId/contact-logs', requireRole('admin', 'manager', 'teacher'), teacherController.getGroupContactLogs);
router.post('/students/:id/contact', requireRole('teacher'), teacherController.updateStudentContact);
router.get('/students/:id/contact-logs', requireRole('teacher'), teacherController.getStudentContactLogs);

// Group Management
router.post('/groups', requireRole('admin', 'teacher'), teacherController.createGroup);
router.put('/groups/:id', requireRole('admin', 'teacher'), teacherController.updateGroup);
router.delete('/groups/:id', requireRole('admin'), teacherController.deleteGroup);
router.get('/groups/:groupId/students-short', requireRole('admin', 'teacher', 'manager'), teacherController.getGroupStudentsShort);

// Extra Class Bookings (Teacher View)
router.get('/groups/:groupId/extra-class-bookings', requireRole('admin', 'teacher', 'manager'), teacherController.getExtraClassBookings);
router.get('/groups/:groupId/contact-info-pdf', requireRole('admin', 'teacher', 'manager'), teacherController.getGroupContactInfoPDF);
router.patch('/extra-class-bookings/:id/complete', requireRole('teacher'), teacherController.completeBooking);
router.delete('/extra-class-bookings/:id', requireRole('admin', 'teacher', 'manager'), teacherController.deleteBooking);

// Reports
router.get('/weekly-report', requireRole('admin', 'teacher', 'manager'), teacherController.getWeeklyReport);

export default router;
