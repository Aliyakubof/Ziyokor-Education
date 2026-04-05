import express from 'express';
import * as quizController from '../controllers/quizController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = express.Router();
const largePayloadLimit = express.json({ limit: '50mb' });

router.use(requireAuth);

// Unit Quizzes
router.get('/unit-quizzes', quizController.getUnitQuizzes);
router.get('/unit-quizzes/:id', quizController.getUnitQuizById);
router.post('/unit-quizzes', largePayloadLimit, quizController.createUnitQuiz);
router.put('/unit-quizzes/:id', largePayloadLimit, quizController.updateUnitQuiz);
router.delete('/unit-quizzes/:id', quizController.deleteUnitQuiz);

// Solo Quizzes (Practice Mode)
router.get('/solo-quizzes', quizController.getSoloQuizzes);
router.get('/solo-quizzes/:id', quizController.getSoloQuizById);
router.post('/solo-quizzes', largePayloadLimit, quizController.createSoloQuiz);
router.put('/solo-quizzes/:id', largePayloadLimit, quizController.updateSoloQuiz);
router.delete('/solo-quizzes/:id', quizController.deleteSoloQuiz);
router.post('/solo-quizzes/submit', largePayloadLimit, quizController.submitSoloQuizPDFReport);

// Duel Quizzes
router.get('/duel-quizzes', quizController.getDuelQuizzes);
router.get('/duel-quizzes/:id', quizController.getDuelQuizById);
router.post('/duel-quizzes', largePayloadLimit, quizController.createDuelQuiz);

router.put('/duel-quizzes/:id', largePayloadLimit, quizController.updateDuelQuiz);
router.delete('/duel-quizzes/:id', quizController.deleteDuelQuiz);

// Student Submissions
router.post('/student/quiz/submit', quizController.submitStudentQuiz);
router.post('/student/vocab-battles/submit', quizController.submitVocabBattle);


export default router;
