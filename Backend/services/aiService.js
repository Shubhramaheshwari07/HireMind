console.log("🔥 GROQ SERVICE RUNNING");
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ===============================
// 🧹 JSON HELPERS
// ===============================
const extractJSONArray = (text) => {
  try {
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
};

const extractJSONObject = (text) => {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
};

// ===============================
// 🎯 GENERATE QUESTIONS
// Exported as generateQuestions to match aiService/aiController calls
// ===============================
exports.generateQuestions = async (role, count = 5) => {
  try {
    const prompt = `Generate ${count} interview questions for a ${role} role.

For EACH question, also give expected key points (3-5).

Return JSON array ONLY — no explanation, no markdown:
[
  {
    "question": "Question?",
    "expected": ["point1", "point2"]
  }
]`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || "";
    const data = extractJSONArray(response);
    if (!data) throw new Error("Invalid AI response");
    return data;

  } catch (error) {
    console.error("Question generation error:", error.message);
    return [
      { question: "What is a stack?", expected: ["LIFO", "push", "pop"] }
    ];
  }
};

// ===============================
// 🧠 ANALYZE ANSWER
// ===============================
exports.analyzeAnswer = async (question, answer, role = '', expected = []) => {
  try {
    const prompt = `You are an expert interviewer for a ${role || 'software'} role.

Evaluate this interview answer and return ONLY a JSON object — no explanation, no markdown:

Question: ${question}
${expected.length ? `Expected key points: ${expected.join(", ")}` : ''}
Candidate answer: ${answer}

{
  "analysis": "2-3 sentence qualitative feedback",
  "score": <number 0-100>,
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"]
}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content || "";
    const result = extractJSONObject(response);
    if (!result) throw new Error("Invalid AI response");
    return result;

  } catch (error) {
    console.error("Analysis error:", error.message);
    return {
      analysis: "Could not evaluate the answer at this time.",
      score: 50,
      strengths: [],
      improvements: ["Please try again."],
    };
  }
};

// ===============================
// 🤖 AI CHAT RESPONSE
// ===============================
exports.generateAIResponse = async (context, message) => {
  try {
    const prompt = `You are a professional interviewer.

Context: ${context}
User: ${message}

Reply in 1-2 lines naturally.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
    });

    return completion.choices[0]?.message?.content || "Okay, let's continue.";

  } catch (error) {
    console.error("AI response error:", error.message);
    return "Let's continue.";
  }
};