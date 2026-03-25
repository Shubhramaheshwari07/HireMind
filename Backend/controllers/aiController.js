const Report    = require('../models/Report');
const aiService = require('../services/groqService'); // ✅ exact filename

// ✅ GENERATE QUESTIONS
exports.generateQuestions = async (req, res) => {
  try {
    const { role, count = 5 } = req.body;

    if (!role) {
      return res.status(400).json({ success: false, message: 'Role is required' });
    }

    const rawQuestions = await aiService.generateQuestions(role, count);

    const questions = rawQuestions.map((q) =>
      typeof q === 'string' ? q : q.question
    );

    res.status(200).json({ success: true, questions });

  } catch (error) {
    console.error("Question generation error:", error.message);
    res.status(500).json({ success: false, message: "Failed to generate questions" });
  }
};

// ✅ ANALYZE ANSWER
exports.analyzeAnswer = async (req, res) => {
  try {
    const { question, answer, role = '' } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ success: false, message: 'question and answer are required' });
    }

    console.log("📥 analyzeAnswer called for role:", role);

    const result = await aiService.analyzeAnswer(question, answer, role);

    console.log("📤 analyzeAnswer result:", result);

    res.status(200).json({
      success:      true,
      analysis:     result.analysis     || '',
      score:        result.score        ?? 50,
      strengths:    result.strengths    || [],
      improvements: result.improvements || [],
    });

  } catch (error) {
    console.error("Analyze answer error:", error.message);
    res.status(500).json({ success: false, message: "Failed to analyze answer" });
  }
};

// ✅ GET AI RESPONSE
exports.getAIResponse = async (req, res) => {
  try {
    const { context = '', userMessage = '' } = req.body;
    const response = await aiService.generateAIResponse(context, userMessage);
    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error("AI response error:", error.message);
    res.status(500).json({ success: false, message: "Failed to get AI response" });
  }
};

// ✅ SAVE REPORT
exports.saveReport = async (req, res) => {
  try {
    const { answers, feedback } = req.body;
    const report = await Report.create({
      user:     req.user ? req.user.id : null,
      answers,
      feedback,
    });
    res.status(201).json({ success: true, report });
  } catch (error) {
    console.error("Save report error:", error.message);
    res.status(500).json({ success: false, message: "Failed to save report" });
  }
};

// ✅ GET REPORTS
exports.getMyReports = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }
    const reports = await Report.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, reports });
  } catch (error) {
    console.error("Get reports error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch reports" });
  }
};