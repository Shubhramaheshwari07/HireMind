const express      = require('express');
const router       = express.Router();
const aiController = require('../controllers/aiController');
const { protect }  = require('../middleware/auth');

console.log("🚨 THIS ROUTE FILE IS BEING USED");

router.post('/generate-questions', aiController.generateQuestions);
router.post('/analyze-answer',     aiController.analyzeAnswer);
router.post('/get-response',       aiController.getAIResponse);
router.post('/save-report',  protect, aiController.saveReport);
router.get('/my-reports',    protect, aiController.getMyReports);

module.exports = router;