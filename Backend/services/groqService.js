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
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
};

const extractJSONObject = (text) => {
  try {
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
};

// ===============================
// 🎯 GENERATE QUESTIONS
// ===============================
exports.generateQuestions = async (role, count = 5) => {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are a JSON-only responder. Never output markdown, never explain. Output raw JSON only."
        },
        {
          role: "user",
          content: `Generate ${count} interview questions for a ${role} role.
For EACH question, also give expected key points (3-5).
Return a JSON array ONLY:
[
  {
    "question": "Question?",
    "expected": ["point1", "point2"]
  }
]`
        }
      ],
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content || "";
    console.log("🎯 Groq generateQuestions raw:", raw);
    const data = extractJSONArray(raw);
    if (!data) throw new Error("Invalid AI response");
    return data;

  } catch (error) {
    console.error("Question generation error:", error.message);
    return [
      { question: "Tell me about yourself and your background.", expected: ["experience", "skills", "goals"] },
      { question: "What is your greatest technical strength?", expected: ["specific skill", "example", "impact"] },
      { question: "Describe a challenging project you worked on.", expected: ["context", "actions", "result"] },
      { question: "How do you handle tight deadlines?", expected: ["prioritisation", "communication", "example"] },
      { question: "Where do you see yourself in 5 years?", expected: ["growth", "alignment", "ambition"] },
    ];
  }
};

// ===============================
// 🧠 ANALYZE ANSWER
// ===============================
exports.analyzeAnswer = async (question, answer, role = '', expected = []) => {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are a JSON-only responder. Never output markdown, never explain. Output raw JSON only."
        },
        {
          role: "user",
          content: `You are an expert interviewer for a ${role || 'software'} role.
Evaluate this interview answer.

Question: ${question}
${expected.length ? `Expected key points: ${expected.join(", ")}` : ''}
Candidate answer: ${answer}

Return ONLY this JSON object:
{
  "analysis": "2-3 sentence qualitative feedback",
  "score": 70,
  "strengths": ["strength one", "strength two"],
  "improvements": ["improvement one", "improvement two"]
}`
        }
      ],
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content || "";
    console.log("🧠 Groq analyzeAnswer raw:", raw);
    const result = extractJSONObject(raw);
    if (!result) throw new Error("Invalid AI response — could not parse: " + raw);
    return result;

  } catch (error) {
    console.error("Analysis error:", error.message);
    return {
      analysis: "Your answer has been noted. Please ensure you use specific examples and quantifiable results for stronger responses.",
      score: 50,
      strengths: ["Attempted to answer the question"],
      improvements: ["Add specific examples", "Use the STAR method", "Include measurable outcomes"],
    };
  }
};

// ===============================
// 🤖 AI CHAT RESPONSE
// ===============================
exports.generateAIResponse = async (context, message) => {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are a professional interviewer. Reply in 1-2 lines naturally and concisely."
        },
        {
          role: "user",
          content: `Context: ${context}\nCandidate said: ${message}`
        }
      ],
      temperature: 0.5,
    });

    return completion.choices[0]?.message?.content || "Thank you. Let's continue.";

  } catch (error) {
    console.error("AI response error:", error.message);
    return "Thank you for your answer. Let's continue.";
  }
};