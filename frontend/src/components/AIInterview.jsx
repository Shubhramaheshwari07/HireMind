// frontend/src/components/AIInterview.jsx
// FULL REPLACEMENT — real Claude AI question generation + answer scoring

import { useState } from 'react';
import { generateQuestions, analyzeAnswer, getAIResponse } from '../api/api';
import './AIInterview.css';

function AIInterview({ roomId, onClose }) {
  const [role, setRole]                           = useState('');
  const [questions, setQuestions]                 = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer]               = useState('');
  const [analysis, setAnalysis]                   = useState('');
  const [score, setScore]                         = useState(null);
  const [strengths, setStrengths]                 = useState([]);
  const [improvements, setImprovements]           = useState([]);
  const [loading, setLoading]                     = useState(false);
  const [aiResponse, setAiResponse]               = useState('');
  const [interviewStarted, setInterviewStarted]   = useState(false);
  const [answers, setAnswers]                     = useState([]);
  const [error, setError]                         = useState('');

  // ─── Start interview — Claude generates domain-specific questions ────────
  const startInterview = async () => {
    if (!role.trim()) { setError('Please enter a job role'); return; }
    setLoading(true); setError('');
    try {
      const response = await generateQuestions(role.trim(), 5);
      setQuestions(response.data.questions);
      setInterviewStarted(true);
      setAiResponse(`Great! Let's begin the interview for the ${role} position. Here's your first question.`);
    } catch (err) {
      console.error('Error generating questions:', err);
      setError('Failed to generate questions. Please check your connection and try again.');
    } finally { setLoading(false); }
  };

  // ─── Submit answer — Claude grades it ────────────────────────────────────
  const submitAnswer = async () => {
    if (!userAnswer.trim()) { setError('Please provide an answer before submitting.'); return; }
    setLoading(true); setError('');

    try {
      const currentQuestion = questions[currentQuestionIndex];

      // Claude analyzes the answer in context of the role
      const analysisResponse = await analyzeAnswer(currentQuestion, userAnswer, role);
      const { analysis: aiAnalysis, score: aiScore, strengths: aiStrengths, improvements: aiImprovements } =
        analysisResponse.data;

      setAnalysis(aiAnalysis);
      setScore(aiScore);
      setStrengths(aiStrengths   || []);
      setImprovements(aiImprovements || []);

      // Save this Q&A with AI score
      setAnswers((prev) => [
        ...prev,
        {
          question:     currentQuestion,
          answer:       userAnswer,
          analysis:     aiAnalysis,
          score:        aiScore,
          strengths:    aiStrengths    || [],
          improvements: aiImprovements || [],
        },
      ]);

      // Short transition message from AI
      try {
        const aiResponseData = await getAIResponse(
          `Interview Q${currentQuestionIndex + 1} of ${questions.length} for ${role}`,
          userAnswer
        );
        setAiResponse(aiResponseData.data.response);
      } catch {
        setAiResponse('Thank you for your answer. Review the feedback below.');
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      setError('Failed to analyze answer. Please try again.');
    } finally { setLoading(false); }
  };

  // ─── Next question ────────────────────────────────────────────────────────
  const moveToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setUserAnswer('');
      setAnalysis('');
      setScore(null);
      setStrengths([]);
      setImprovements([]);
      setError('');
      setAiResponse(`Question ${currentQuestionIndex + 2} of ${questions.length}`);
    }
  };

  // ─── Skip question ────────────────────────────────────────────────────────
  const skipQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setUserAnswer('');
      setAnalysis('');
      setScore(null);
      setStrengths([]);
      setImprovements([]);
      setError('');
      setAiResponse("Let's move to the next question.");
    } else {
      setAiResponse('That was the last question. Review your answers above.');
    }
  };

  // ─── Score color helper ───────────────────────────────────────────────────
  const scoreColor = (s) => (s >= 75 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444');
  const scoreLabel = (s) =>
    s >= 75 ? '🌟 Strong' : s >= 50 ? '✨ Decent' : '📈 Needs Improvement';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="ai-interview-overlay">
      <div className="ai-interview-panel">
        <div className="ai-header">
          <h2>🤖 AI Interview Assistant</h2>
          <button onClick={onClose} className="close-ai">✕</button>
        </div>

        <div className="ai-content">
          {!interviewStarted ? (
            /* ── Setup screen ── */
            <div className="ai-setup">
              <h3>Start AI-Powered Interview</h3>
              <p>Enter the job role to generate relevant interview questions powered by Claude AI</p>

              {error && (
                <div className="error-message-ai">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="input-group">
                <label>Job Role:</label>
                <input
                  type="text"
                  placeholder="e.g., Software Engineer, Product Manager, Data Scientist"
                  value={role}
                  onChange={(e) => { setRole(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && startInterview()}
                  disabled={loading}
                  className="role-input"
                />
              </div>

              <button onClick={startInterview} className="btn-start-ai" disabled={loading}>
                {loading ? 'Generating Questions with Claude...' : 'Start Interview'}
              </button>

              <div className="ai-info">
                <p>✨ Claude AI generates 5 domain-specific questions</p>
                <p>📊 Get scored 0–100 based on answer quality, not just length</p>
                <p>🎯 Receive specific strengths and improvement tips per answer</p>
              </div>
            </div>
          ) : (
            /* ── Interview screen ── */
            <div className="ai-interview">

              {/* AI Response */}
              {aiResponse && (
                <div className="ai-message">
                  <div className="ai-avatar">🤖</div>
                  <div className="ai-text">{aiResponse}</div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="error-message-ai">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Progress */}
              <div className="progress-bar">
                <div className="progress-info">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Current Question */}
              {questions[currentQuestionIndex] && (
                <div className="question-card">
                  <h3>Question {currentQuestionIndex + 1}</h3>
                  <p>{questions[currentQuestionIndex]}</p>
                </div>
              )}

              {/* Answer Input — only shown before submission */}
              {!analysis && (
                <div className="answer-section">
                  <label>Your Answer:</label>
                  <textarea
                    value={userAnswer}
                    onChange={(e) => { setUserAnswer(e.target.value); setError(''); }}
                    placeholder="Type your answer here. Use specific examples and explain your actions and results."
                    rows={6}
                    disabled={loading}
                    className="answer-textarea"
                  />
                  <div className="answer-actions">
                    <button
                      onClick={submitAnswer}
                      disabled={loading || !userAnswer.trim()}
                      className="btn-submit-answer"
                    >
                      {loading ? 'Claude is analyzing...' : 'Submit Answer'}
                    </button>
                    <button onClick={skipQuestion} disabled={loading} className="btn-skip">
                      Skip
                    </button>
                  </div>
                </div>
              )}

              {/* Analysis — shown after submission */}
              {analysis && currentQuestionIndex < questions.length && (
                <div className="analysis-section">

                  {/* Score badge */}
                  {score !== null && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      background: `${scoreColor(score)}18`,
                      border: `1px solid ${scoreColor(score)}44`,
                      borderRadius: 12, padding: '14px 18px', marginBottom: 16,
                    }}>
                      <div style={{
                        fontSize: 36, fontWeight: 900, color: scoreColor(score), lineHeight: 1,
                        minWidth: 56, textAlign: 'center',
                      }}>
                        {score}
                      </div>
                      <div>
                        <div style={{ color: scoreColor(score), fontWeight: 700, fontSize: 15 }}>
                          {scoreLabel(score)}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>Claude AI Score / 100</div>
                      </div>
                    </div>
                  )}

                  {/* Main feedback */}
                  <div className="analysis-card">
                    <h4>📊 Claude's Feedback:</h4>
                    <p>{analysis}</p>
                  </div>

                  {/* Strengths */}
                  {strengths.length > 0 && (
                    <div style={{
                      background: 'rgba(16,185,129,.08)', borderLeft: '4px solid #10b981',
                      padding: 16, borderRadius: 10, marginBottom: 12,
                    }}>
                      <h4 style={{ color: '#10b981', margin: '0 0 8px', fontSize: 14 }}>✅ Strengths:</h4>
                      {strengths.map((s, i) => (
                        <p key={i} style={{ margin: '4px 0', color: '#333', fontSize: 14 }}>• {s}</p>
                      ))}
                    </div>
                  )}

                  {/* Improvements */}
                  {improvements.length > 0 && (
                    <div style={{
                      background: 'rgba(251,191,36,.08)', borderLeft: '4px solid #f59e0b',
                      padding: 16, borderRadius: 10, marginBottom: 16,
                    }}>
                      <h4 style={{ color: '#d97706', margin: '0 0 8px', fontSize: 14 }}>💡 Improvements:</h4>
                      {improvements.map((imp, i) => (
                        <p key={i} style={{ margin: '4px 0', color: '#333', fontSize: 14 }}>• {imp}</p>
                      ))}
                    </div>
                  )}

                  {/* Your answer */}
                  <div className="your-answer-display">
                    <h4>Your Answer:</h4>
                    <p>{userAnswer}</p>
                  </div>

                  {currentQuestionIndex < questions.length - 1 ? (
                    <button onClick={moveToNextQuestion} className="btn-next-question">
                      Next Question →
                    </button>
                  ) : (
                    <div className="interview-complete-message">
                      <p>🎉 You've completed all questions!</p>
                      <button onClick={onClose} className="btn-finish">
                        Close Interview
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Full summary — shown when all answers submitted */}
              {answers.length === questions.length && answers.length > 0 && (
                <div className="answers-summary">
                  <h3>Interview Summary</h3>
                  <p className="summary-intro">
                    Average Score:{' '}
                    <strong style={{ color: '#667eea' }}>
                      {Math.round(answers.reduce((s, a) => s + a.score, 0) / answers.length)}/100
                    </strong>
                  </p>
                  {answers.map((item, index) => (
                    <div key={index} className="answer-summary-card">
                      <div className="summary-question">
                        <strong>Q{index + 1}:</strong> {item.question}
                      </div>
                      <div className="summary-answer">
                        <strong>Your Answer:</strong> {item.answer}
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        marginBottom: 8,
                      }}>
                        <span style={{
                          background: `${scoreColor(item.score)}22`,
                          color: scoreColor(item.score),
                          fontWeight: 700, fontSize: 13,
                          padding: '2px 10px', borderRadius: 20,
                          border: `1px solid ${scoreColor(item.score)}44`,
                        }}>
                          {item.score}/100
                        </span>
                        <span style={{ color: '#888', fontSize: 12 }}>{scoreLabel(item.score)}</span>
                      </div>
                      <div className="summary-analysis">
                        <strong>AI Feedback:</strong> {item.analysis}
                      </div>
                      {item.improvements?.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 13, color: '#666' }}>
                          💡 {item.improvements.join(' · ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIInterview;
