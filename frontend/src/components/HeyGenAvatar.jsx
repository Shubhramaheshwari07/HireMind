import { useState, useEffect, useRef, useCallback } from 'react';
import { generateQuestions, analyzeAnswer } from '../api/api';
import './HeyGenAvatar.css';

const AVATARS = [
  { avatar_id: 'Anna_public_3_20240108',  avatar_name: 'Anna',  emoji: '👩' },
  { avatar_id: 'Tyler-incasual-20220722',  avatar_name: 'Tyler', emoji: '👨' },
  { avatar_id: 'Susan_public_2_20240328',  avatar_name: 'Susan', emoji: '👩' },
  { avatar_id: 'Wayne_20240711',           avatar_name: 'Wayne', emoji: '👨' },
];

const QUESTION_TIME = 90; // seconds per question

const INTRO     = (role) => `Hello! I am ARIA, your AI interviewer. We will go through 5 questions for the ${role} role. You have 90 seconds per question. Let us begin.`;
const ACK       = (next, total) => next <= total ? `Got it. Question ${next}.` : `That was the last question. Great effort.`;
const CLOSING   = (avg) => `Interview complete. Your average score is ${avg} out of 100. Check your report below.`;
const TIME_WARN = () => `15 seconds remaining.`;

function ScoreRing({ score, size = 80 }) {
  const r = (size / 2) - 8;
  const c = 2 * Math.PI * r;
  const col = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth="7"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="7"
        strokeDasharray={`${(score/100)*c} ${c-(score/100)*c}`}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition:'stroke-dasharray 1.2s ease' }}/>
      <text x={size/2} y={size/2+5} textAnchor="middle" fontSize={size*0.2}
        fontWeight="800" fill={col}>{score}</text>
    </svg>
  );
}

function AvatarFace({ speaking, avatar }) {
  return (
    <div style={{
      width:160, height:160, borderRadius:'50%',
      background:`radial-gradient(circle at 35% 35%, #ffe0b2, ${avatar.color||'#667eea'}55)`,
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', gap:10, position:'relative',
      boxShadow: speaking
        ? `0 0 0 3px ${avatar.color||'#667eea'}, 0 0 24px ${avatar.color||'#667eea'}55`
        : '0 8px 32px rgba(0,0,0,0.5)',
      animation: speaking ? 'hgBob 0.45s ease-in-out infinite alternate' : 'none',
      transition:'box-shadow 0.3s',
    }}>
      <div style={{ display:'flex', gap:22, marginTop:28 }}>
        {[0,1].map(i => (
          <div key={i} style={{
            width:20, height:20, background:'white', borderRadius:'50%',
            display:'flex', alignItems:'center', justifyContent:'center',
            animation:'hgBlink 3.5s infinite',
          }}>
            <div style={{ width:9, height:9, background:'#1a1a2e', borderRadius:'50%' }}/>
          </div>
        ))}
      </div>
      <div style={{
        width:38, height: speaking ? 18 : 10,
        border:'3px solid #c0392b', borderTop:'none',
        borderRadius: speaking ? '0 0 50px 50px' : '0 0 38px 38px',
        marginTop:6,
        animation: speaking ? 'hgMouth 0.18s ease-in-out infinite alternate' : 'none',
        transition:'height 0.12s',
      }}/>
      <div style={{
        position:'absolute', bottom:-4, right:-4, fontSize:'1.4rem',
        background:'#0f0c1a', borderRadius:'50%', width:32, height:32,
        display:'flex', alignItems:'center', justifyContent:'center',
        border:'2px solid #333',
      }}>{avatar.emoji}</div>
    </div>
  );
}

const AVATAR_COLORS = {
  'Anna_public_3_20240108':  '#e91e63',
  'Tyler-incasual-20220722': '#2196f3',
  'Susan_public_2_20240328': '#9c27b0',
  'Wayne_20240711':          '#ff9800',
};

// ── Filler word detector ─────────────────────────────────────────────────────
const FILLERS = ['um','uh','like','you know','basically','literally','actually','so','right'];
const countFillers = (text) => {
  const lower = text.toLowerCase();
  return FILLERS.reduce((n, f) => {
    const re = new RegExp(`\\b${f}\\b`, 'g');
    return n + (lower.match(re)?.length || 0);
  }, 0);
};

const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;

export default function HeyGenAvatar({ onClose }) {
  const [phase, setPhase]                   = useState('setup');
  const [role, setRole]                     = useState('');
  const [interviewType, setInterviewType]   = useState('general');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].avatar_id);
  const [speaking, setSpeaking]             = useState(false);
  const [error, setError]                   = useState('');
  const [questions, setQuestions]           = useState([]);
  const [qIndex, setQIndex]                 = useState(0);
  const [answer, setAnswer]                 = useState('');
  const [scores, setScores]                 = useState([]);
  const [records, setRecords]               = useState([]);
  const [loading, setLoading]               = useState(false);

  // Timer
  const [timeLeft, setTimeLeft]             = useState(QUESTION_TIME);
  const [timerActive, setTimerActive]       = useState(false);
  const [warnedAt15, setWarnedAt15]         = useState(false);
  const timerRef                            = useRef(null);

  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    synthRef.current.getVoices();
    window.speechSynthesis.onvoiceschanged = () => synthRef.current.getVoices();
    return () => {
      synthRef.current.cancel();
      clearInterval(timerRef.current);
    };
  }, []);

  // ── Timer logic ────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    setTimeLeft(QUESTION_TIME);
    setWarnedAt15(false);
    setTimerActive(true);
  }, []);

  const stopTimer = useCallback(() => {
    setTimerActive(false);
    clearInterval(timerRef.current);
  }, []);

  // submitAnswer declared below — use ref to call from timer
  const submitRef = useRef(null);

  useEffect(() => {
    if (!timerActive) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTimerActive(false);
          submitRef.current?.();   // auto-submit
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  // Warn at 15s
  useEffect(() => {
    if (timerActive && timeLeft === 15 && !warnedAt15) {
      setWarnedAt15(true);
      speak(TIME_WARN());
    }
  }, [timeLeft, timerActive, warnedAt15]);

  // ── TTS ────────────────────────────────────────────────────────────────────
  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      if (!text?.trim()) return resolve();
      synthRef.current.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.88; utter.pitch = 1.1; utter.volume = 1;
      const voices = synthRef.current.getVoices();
      const preferred = ['Samantha','Google UK English Female','Microsoft Zira'];
      const voice = voices.find(v => preferred.some(p => v.name.includes(p)));
      if (voice) utter.voice = voice;
      utter.onstart = () => setSpeaking(true);
      utter.onend   = () => { setSpeaking(false); resolve(); };
      utter.onerror = () => { setSpeaking(false); resolve(); };
      synthRef.current.speak(utter);
    });
  }, []);

  const replayQuestion = useCallback(() => {
    if (questions[qIndex]) speak(`Question ${qIndex + 1}: ${questions[qIndex]}`);
  }, [questions, qIndex, speak]);

  // ── Launch ─────────────────────────────────────────────────────────────────
  const launch = useCallback(async () => {
    if (!role.trim()) return setError('Please enter a job role');
    setLoading(true); setError('');
    setPhase('connecting');
    try {
      const typePrefix = interviewType !== 'general' ? `${interviewType} ` : '';
      const qRes = await generateQuestions(`${typePrefix}${role}`, 5);
      const qs = qRes.data.questions;
      if (!qs || qs.length === 0) throw new Error('No questions returned');
      setQuestions(qs);
      setPhase('interview');
      await speak(INTRO(role));
      await speak(`Question 1: ${qs[0]}`);
      startTimer();
    } catch (err) {
      setError('Failed to generate questions: ' + (err.response?.data?.message || err.message));
      setPhase('setup');
    } finally { setLoading(false); }
  }, [role, interviewType, speak, startTimer]);

  // ── Submit answer ──────────────────────────────────────────────────────────
  const submitAnswer = useCallback(async (isAutoSubmit = false) => {
    stopTimer();
    const currentAnswer = answer.trim();
    const currentQ      = questions[qIndex];
    const wc            = wordCount(currentAnswer);
    const fillers       = countFillers(currentAnswer);

    setLoading(true); setError('');

    // Short ACK from ARIA — no feedback, just move on
    const next = qIndex + 2; // 1-based next
    speak(ACK(next, questions.length));

    try {
      let result = { analysis: '', score: 0, strengths: [], improvements: [] };

      if (currentAnswer.length > 0) {
        const res = await analyzeAnswer(currentQ, currentAnswer, role);
        result = {
          analysis:     res.data.analysis     || '',
          score:        res.data.score        ?? 0,
          strengths:    res.data.strengths    || [],
          improvements: res.data.improvements || [],
        };
      }

      setScores(prev  => [...prev, result.score]);
      setRecords(prev => [...prev, {
        question:     currentQ,
        answer:       currentAnswer || '(no answer — time ran out)',
        analysis:     result.analysis,
        score:        result.score,
        strengths:    result.strengths,
        improvements: result.improvements,
        wordCount:    wc,
        fillerCount:  fillers,
        skipped:      currentAnswer.length === 0,
        autoSubmit:   isAutoSubmit,
      }]);

    } catch {
      setScores(prev  => [...prev, 0]);
      setRecords(prev => [...prev, {
        question:    currentQ,
        answer:      currentAnswer || '(no answer)',
        analysis:    '',
        score:       0,
        strengths:   [],
        improvements:['Analysis unavailable'],
        wordCount:   wc,
        fillerCount: fillers,
        skipped:     false,
        autoSubmit:  isAutoSubmit,
      }]);
    } finally { setLoading(false); }

    // Move to next question or finish
    const nextIndex = qIndex + 1;
    if (nextIndex >= questions.length) {
      const avg = scores.length + 1 > 0
        ? Math.round([...scores].reduce((a,b)=>a+b,0) / (scores.length + 1))
        : 0;
      setPhase('complete');
      speak(CLOSING(avg));
    } else {
      setQIndex(nextIndex);
      setAnswer('');
      await new Promise(r => setTimeout(r, 800));
      await speak(`Question ${nextIndex + 1}: ${questions[nextIndex]}`);
      startTimer();
    }
  }, [answer, questions, qIndex, role, scores, speak, stopTimer, startTimer]);

  // Keep submitRef in sync
  useEffect(() => { submitRef.current = () => submitAnswer(true); }, [submitAnswer]);

  const skipQuestion = useCallback(async () => {
    stopTimer();
    setAnswer('');
    const currentQ = questions[qIndex];
    setScores(prev  => [...prev, 0]);
    setRecords(prev => [...prev, {
      question: currentQ, answer: '(skipped)', analysis: '',
      score: 0, strengths: [], improvements: ['Question was skipped'],
      wordCount: 0, fillerCount: 0, skipped: true, autoSubmit: false,
    }]);
    const nextIndex = qIndex + 1;
    if (nextIndex >= questions.length) {
      setPhase('complete');
      speak(CLOSING(0));
    } else {
      setQIndex(nextIndex);
      speak(ACK(nextIndex + 1, questions.length));
      await new Promise(r => setTimeout(r, 600));
      await speak(`Question ${nextIndex + 1}: ${questions[nextIndex]}`);
      startTimer();
    }
  }, [questions, qIndex, scores, speak, stopTimer, startTimer]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const avgScore    = records.length
    ? Math.round(records.reduce((a,b)=>a+b.score,0) / records.length) : 0;
  const wc          = wordCount(answer);
  const fillers     = countFillers(answer);
  const isLive      = ['interview','complete'].includes(phase);
  const currentAvatarObj = {
    ...AVATARS.find(a => a.avatar_id === selectedAvatar),
    color: AVATAR_COLORS[selectedAvatar],
  };

  // Timer colour
  const timerColor  = timeLeft > 30 ? '#10b981' : timeLeft > 15 ? '#f59e0b' : '#ef4444';
  const timerPct    = (timeLeft / QUESTION_TIME) * 100;

  // Answer quality
  const answerQuality = wc < 20 ? { label:'Too short', color:'#ef4444' }
    : wc < 40 ? { label:'Could be longer', color:'#f59e0b' }
    : wc <= 120 ? { label:'Good length', color:'#10b981' }
    : { label:'Too long', color:'#f59e0b' };

  return (
    <div className="hg-overlay">
      <style>{`
        @keyframes hgBob   { from{transform:translateY(0) rotate(-1deg)} to{transform:translateY(-7px) rotate(1deg)} }
        @keyframes hgBlink { 0%,94%,100%{transform:scaleY(1)} 97%{transform:scaleY(0.08)} }
        @keyframes hgMouth { from{height:5px} to{height:18px} }
        @keyframes hgBarW  { from{height:20%} to{height:100%} }
        @keyframes timerPulse { 0%,100%{opacity:1} 50%{opacity:.6} }
      `}</style>

      <div className="hg-panel">

        {/* Header */}
        <div className="hg-header">
          <div className="hg-header-left">
            <div className="hg-live-dot"/>
            <span className="hg-title">ARIA · AI Interviewer</span>
          </div>
          <button className="hg-close" onClick={onClose}>✕</button>
        </div>

        <div className="hg-body">

          {/* ── Avatar column ── */}
          <div className="hg-video-col">
            <div className={`hg-video-wrap ${speaking ? 'hg-speaking' : ''}`}>
              <div style={{
                position:'absolute', inset:0, display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center', gap:16,
                background:'radial-gradient(ellipse at center,#1a1040 0%,#06040f 70%)',
              }}>
                <AvatarFace speaking={speaking} avatar={currentAvatarObj}/>
                {speaking && (
                  <div className="hg-speaking-bar">
                    {[...Array(12)].map((_,i)=>(
                      <div key={i} className="hg-bar"
                        style={{ animationDelay:`${i*0.07}s`, animationName:'hgBarW' }}/>
                    ))}
                  </div>
                )}
              </div>
              <div className={`hg-status-badge ${speaking ? 'badge-speaking' : isLive ? 'badge-ready' : 'badge-idle'}`}>
                {speaking ? '🎙 Speaking' : isLive ? '✅ Listening' : '⏳ Idle'}
              </div>
            </div>

            {/* Avatar selector — setup only */}
            {phase === 'setup' && (
              <div className="hg-avatar-grid">
                <p className="hg-avatar-label">Choose Your Interviewer</p>
                <div className="hg-avatar-list">
                  {AVATARS.map(a => (
                    <button key={a.avatar_id}
                      className={`hg-avatar-btn ${selectedAvatar===a.avatar_id?'selected':''}`}
                      onClick={()=>setSelectedAvatar(a.avatar_id)}>
                      <div className="hg-avatar-thumb-placeholder">{a.emoji}</div>
                      <span className="hg-avatar-name">{a.avatar_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Interaction column ── */}
          <div className="hg-interact-col">

            {error && (
              <div className="hg-error" style={{margin:'16px'}}>
                <span>⚠️</span><span style={{flex:1}}>{error}</span>
              </div>
            )}

            {/* ── SETUP ── */}
            {phase === 'setup' && (
              <div className="hg-section">
                <h2 className="hg-section-title">Start Your AI Interview</h2>
                <p className="hg-section-sub">ARIA asks 5 questions, scores each answer, and gives a full report at the end.</p>

                <label className="hg-label">Job Role</label>
                <input className="hg-input"
                  placeholder="e.g., Software Engineer, Finance Analyst"
                  value={role}
                  onChange={e=>{setRole(e.target.value);setError('');}}
                  onKeyDown={e=>e.key==='Enter'&&launch()}
                  disabled={loading}/>

                <label className="hg-label" style={{marginTop:12}}>Interview Type</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
                  {[
                    {val:'general',   label:'🎯 General'},
                    {val:'behavioural',label:'🧠 Behavioural'},
                    {val:'technical', label:'💻 Technical'},
                    {val:'hr',        label:'👥 HR Round'},
                  ].map(t=>(
                    <button key={t.val}
                      onClick={()=>setInterviewType(t.val)}
                      style={{
                        padding:'6px 14px', borderRadius:20, fontSize:13, cursor:'pointer',
                        border: interviewType===t.val ? '2px solid #667eea' : '1px solid #333',
                        background: interviewType===t.val ? '#667eea22' : 'transparent',
                        color: interviewType===t.val ? '#667eea' : '#888',
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>

                <div style={{
                  background:'#1e293b', borderRadius:10, padding:'12px 16px',
                  marginBottom:16, fontSize:13, color:'#94a3b8', lineHeight:1.7,
                }}>
                  ⏱ <strong style={{color:'#fff'}}>90 seconds</strong> per question · Auto-submits when time runs out<br/>
                  📊 Full scored report shown at the end<br/>
                  🔁 You can replay any question aloud
                </div>

                <button className="hg-btn-primary" onClick={launch} disabled={loading||!role.trim()}>
                  {loading ? '⏳ Launching...' : '🚀 Start Interview with ARIA'}
                </button>
              </div>
            )}

            {/* ── CONNECTING ── */}
            {phase === 'connecting' && (
              <div className="hg-section hg-centered">
                <div className="hg-spinner"/>
                <p className="hg-connect-msg">Generating your questions...</p>
              </div>
            )}

            {/* ── INTERVIEW ── */}
            {phase === 'interview' && (
              <div className="hg-section">

                {/* Progress */}
                <div className="hg-progress-wrap">
                  <div className="hg-progress-label">
                    <span>Question {qIndex+1} of {questions.length}</span>
                    <span style={{color:'#94a3b8',fontSize:12}}>
                      {records.length} answered
                    </span>
                  </div>
                  <div className="hg-progress-track">
                    <div className="hg-progress-fill"
                      style={{width:`${((qIndex+1)/questions.length)*100}%`}}/>
                  </div>
                </div>

                {/* Timer */}
                <div style={{marginBottom:14}}>
                  <div style={{
                    display:'flex', justifyContent:'space-between',
                    alignItems:'center', marginBottom:6,
                  }}>
                    <span style={{fontSize:13,color:'#94a3b8'}}>Time remaining</span>
                    <span style={{
                      fontSize:20, fontWeight:800, color:timerColor,
                      animation: timeLeft<=15 ? 'timerPulse 1s infinite' : 'none',
                    }}>
                      {String(Math.floor(timeLeft/60)).padStart(2,'0')}:{String(timeLeft%60).padStart(2,'0')}
                    </span>
                  </div>
                  <div style={{
                    height:6, background:'#1e293b', borderRadius:4, overflow:'hidden',
                  }}>
                    <div style={{
                      height:'100%', width:`${timerPct}%`,
                      background:timerColor, borderRadius:4,
                      transition:'width 1s linear, background 0.5s',
                    }}/>
                  </div>
                </div>

                {/* Question */}
                <div className="hg-question-card">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div className="hg-q-label">Question {qIndex+1}</div>
                    <button onClick={replayQuestion} disabled={speaking}
                      title="Replay question"
                      style={{
                        background:'none', border:'1px solid #333', borderRadius:8,
                        color:'#94a3b8', fontSize:12, padding:'3px 10px', cursor:'pointer',
                      }}>
                      🔊 Replay
                    </button>
                  </div>
                  <p className="hg-q-text">{questions[qIndex]}</p>
                </div>

                {/* Answer textarea */}
                <label className="hg-label">Your Answer</label>
                <textarea className="hg-textarea" rows={5}
                  placeholder="Type your answer... Use specific examples and measurable results."
                  value={answer}
                  onChange={e=>setAnswer(e.target.value)}
                  disabled={loading||speaking}/>

                {/* Live answer quality indicators */}
                <div style={{
                  display:'flex', gap:12, alignItems:'center',
                  marginBottom:12, flexWrap:'wrap',
                }}>
                  {/* Word count + quality */}
                  <span style={{
                    fontSize:12, padding:'3px 10px', borderRadius:12,
                    background:`${answerQuality.color}18`,
                    color:answerQuality.color,
                    border:`1px solid ${answerQuality.color}44`,
                  }}>
                    {wc} words · {answerQuality.label}
                  </span>

                  {/* Filler word warning */}
                  {fillers > 0 && (
                    <span style={{
                      fontSize:12, padding:'3px 10px', borderRadius:12,
                      background:'#f59e0b18', color:'#f59e0b',
                      border:'1px solid #f59e0b44',
                    }}>
                      ⚠️ {fillers} filler word{fillers>1?'s':''}
                    </span>
                  )}
                </div>

                <div className="hg-btn-row">
                  <button className="hg-btn-primary"
                    onClick={()=>submitAnswer(false)}
                    disabled={loading||!answer.trim()||speaking}>
                    {loading ? '⏳ Submitting...' : '✅ Submit Answer'}
                  </button>
                  <button className="hg-btn-ghost" onClick={skipQuestion}
                    disabled={loading||speaking}>
                    Skip (0 pts)
                  </button>
                </div>
              </div>
            )}

            {/* ── COMPLETE ── */}
            {phase === 'complete' && (
              <div className="hg-section">

                {/* Overall score header */}
                <div className="hg-complete-header">
                  <div className="hg-complete-score">{avgScore}</div>
                  <div className="hg-complete-label">Overall Score</div>
                  <div className="hg-complete-stars">
                    {'★'.repeat(Math.round(avgScore/20))}
                    {'☆'.repeat(5-Math.round(avgScore/20))}
                  </div>
                </div>

                {/* Stats row */}
                <div className="hg-stat-row">
                  {[
                    { n: questions.length,                              l:'Questions'  },
                    { n: records.filter(r=>!r.skipped).length,          l:'Answered'   },
                    { n: records.filter(r=>r.score>=70).length,         l:'Strong'     },
                    { n: records.filter(r=>r.skipped||r.autoSubmit).length, l:'Missed' },
                  ].map(s=>(
                    <div key={s.l} className="hg-stat-box">
                      <div className="hg-stat-n">{s.n}</div>
                      <div className="hg-stat-l">{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Per-answer report */}
                <div className="hg-records">
                  {records.map((r,i)=>(
                    <div key={i} className="hg-record-card">

                      {/* Question + score */}
                      <div className="hg-record-top">
                        <div style={{flex:1}}>
                          <span style={{
                            fontSize:11, color:'#64748b', fontWeight:600,
                            textTransform:'uppercase', letterSpacing:1,
                          }}>
                            Q{i+1} {r.skipped?'· Skipped':r.autoSubmit?'· Time ran out':''}
                          </span>
                          <p style={{margin:'4px 0 0',fontSize:14,color:'#e2e8f0',fontWeight:500}}>
                            {r.question}
                          </p>
                        </div>
                        <ScoreRing score={r.score} size={64}/>
                      </div>

                      {/* Answer stats */}
                      {!r.skipped && (
                        <div style={{
                          display:'flex', gap:8, flexWrap:'wrap', margin:'8px 0',
                        }}>
                          <span style={{fontSize:12,color:'#94a3b8'}}>
                            📝 {r.wordCount} words
                          </span>
                          {r.fillerCount > 0 && (
                            <span style={{fontSize:12,color:'#f59e0b'}}>
                              ⚠️ {r.fillerCount} filler word{r.fillerCount>1?'s':''}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Their answer */}
                      <div style={{
                        background:'#0f172a', borderRadius:8, padding:'10px 14px',
                        marginBottom:10, fontSize:13, color:'#94a3b8', fontStyle:'italic',
                      }}>
                        "{r.answer}"
                      </div>

                      {/* AI analysis */}
                      {r.analysis && (
                        <p style={{fontSize:13,color:'#cbd5e1',marginBottom:10}}>
                          💬 {r.analysis}
                        </p>
                      )}

                      {/* Strengths */}
                      {r.strengths?.length > 0 && (
                        <div style={{
                          background:'rgba(16,185,129,.08)',
                          borderLeft:'3px solid #10b981',
                          padding:'8px 12px', borderRadius:'0 8px 8px 0', marginBottom:8,
                        }}>
                          <p style={{fontSize:12,color:'#10b981',fontWeight:600,margin:'0 0 4px'}}>
                            ✅ What worked
                          </p>
                          {r.strengths.map((s,j)=>(
                            <p key={j} style={{fontSize:13,color:'#94a3b8',margin:'2px 0'}}>• {s}</p>
                          ))}
                        </div>
                      )}

                      {/* Improvements */}
                      {r.improvements?.length > 0 && (
                        <div style={{
                          background:'rgba(251,191,36,.08)',
                          borderLeft:'3px solid #f59e0b',
                          padding:'8px 12px', borderRadius:'0 8px 8px 0',
                        }}>
                          <p style={{fontSize:12,color:'#f59e0b',fontWeight:600,margin:'0 0 4px'}}>
                            💡 What to improve
                          </p>
                          {r.improvements.map((imp,j)=>(
                            <p key={j} style={{fontSize:13,color:'#94a3b8',margin:'2px 0'}}>• {imp}</p>
                          ))}
                        </div>
                      )}

                    </div>
                  ))}
                </div>

                <button className="hg-btn-primary" onClick={onClose}
                  style={{marginTop:16}}>
                  ✅ Close Report
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}