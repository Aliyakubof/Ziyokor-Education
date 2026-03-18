import express from 'express';
import * as quizController from '../controllers/quizController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

// Unit Quizzes
router.get('/unit-quizzes', quizController.getUnitQuizzes);
router.get('/unit-quizzes/:id', quizController.getUnitQuizById);
router.post('/unit-quizzes', quizController.createUnitQuiz);
router.put('/unit-quizzes/:id', quizController.updateUnitQuiz);
router.delete('/unit-quizzes/:id', quizController.deleteUnitQuiz);

// Solo Quizzes (Practice Mode)
router.get('/solo-quizzes', quizController.getSoloQuizzes);
router.get('/solo-quizzes/:id', quizController.getSoloQuizById);
router.post('/solo-quizzes', quizController.createSoloQuiz);
router.put('/solo-quizzes/:id', quizController.updateSoloQuiz);
router.delete('/solo-quizzes/:id', quizController.deleteSoloQuiz);
router.post('/solo-quizzes/submit', quizController.submitSoloQuizPDFReport);

// Duel Quizzes
router.get('/duel-quizzes', quizController.getDuelQuizzes);
router.post('/duel-quizzes', quizController.createDuelQuiz);
router.put('/duel-quizzes/:id', quizController.updateDuelQuiz);
router.delete('/duel-quizzes/:id', quizController.deleteDuelQuiz);

// Student Submissions
router.post('/student/quiz/submit', quizController.submitStudentQuiz);
router.post('/student/vocab-battles/submit', quizController.submitVocabBattle);

// Group Battles
router.get('/battles/leaderboard', quizController.getBattleLeaderboard);
router.get('/battles/current/:groupId', quizController.getCurrentBattleByGroup);
router.get('/battles/:id/details', quizController.getBattleDetails);

export default router;
