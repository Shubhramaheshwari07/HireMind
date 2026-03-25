// frontend/src/pages/ARIAInterview.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateQuestions, analyzeAnswer } from '../api/api';
import './ARIAInterview.css';

const QUESTION_TIME = 90;

const LANG_PROMPTS = {
  english:  { intro: (r,e) => `Hello! I'm ARIA. Let's begin your ${e} level ${r} interview. Here's your first question.`, ack: (n) => `Got it. Moving to question ${n}.`, done: () => `Interview complete. Great effort today.`, warn: () => `15 seconds remaining.` },
  hindi:    { intro: (r,e) => `नमस्ते! मैं ARIA हूँ। आपका ${r} इंटरव्यू शुरू करते हैं।`, ack: (n) => `ठीक है। अगला प्रश्न ${n}।`, done: () => `इंटरव्यू पूरा हुआ। बहुत अच्छा।`, warn: () => `15 सेकंड बचे हैं।` },
  hinglish: { intro: (r,e) => `Hello! Main ARIA hoon. Aapka ${r} interview start karte hain.`, ack: (n) => `Theek hai. Question ${n} pe chalte hain.`, done: () => `Interview complete. Bahut accha kiya!`, warn: () => `15 seconds bache hain.` },
  french:   { intro: (r,e) => `Bonjour! Je suis ARIA. Commençons votre entretien pour ${r}.`, ack: (n) => `Très bien. Question ${n}.`, done: () => `Entretien terminé. Bien joué!`, warn: () => `15 secondes restantes.` },
  spanish:  { intro: (r,e) => `¡Hola! Soy ARIA. Empecemos tu entrevista para ${r}.`, ack: (n) => `Entendido. Pregunta ${n}.`, done: () => `Entrevista completa. ¡Buen trabajo!`, warn: () => `15 segundos restantes.` },
  german:   { intro: (r,e) => `Hallo! Ich bin ARIA. Beginnen wir Ihr ${r} Interview.`, ack: (n) => `Verstanden. Frage ${n}.`, done: () => `Interview abgeschlossen. Gut gemacht!`, warn: () => `Noch 15 Sekunden.` },
  arabic:   { intro: (r,e) => `مرحباً! أنا ARIA. لنبدأ مقابلتك لوظيفة ${r}.`, ack: (n) => `حسناً. السؤال ${n}.`, done: () => `انتهت المقابلة. عمل رائع!`, warn: () => `تبقى 15 ثانية.` },
};

const FILLERS = ['um','uh','like','you know','basically','literally','actually'];
const countFillers = (t) => FILLERS.reduce((n,f) => n + (t.toLowerCase().match(new RegExp(`\\b${f}\\b`,'g'))?.length||0), 0);
const wordCount   = (t) => t.trim().split(/\s+/).filter(Boolean).length;

function ScoreRing({ score, size = 64 }) {
  const r = size/2 - 6, c = 2*Math.PI*r;
  const col = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth="5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="5"
        strokeDasharray={`${(score/100)*c} ${c-(score/100)*c}`}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{transition:'stroke-dasharray 1s ease'}}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" fontSize={size*0.22}
        fontWeight="800" fill={col}>{score}</text>
    </svg>
  );
}

export default function ARIAInterview() {
  const location = useLocation();
  const navigate  = useNavigate();
  const config    = location.state || {};

  const {
    role          = 'Software Engineer',
    experience    = 'mid',
    interviewType = 'general',
    difficulty    = 'medium',
    duration      = 5,
    language      = 'english',
    cameraOn      = true,
    micOn         = true,
  } = config;

  const phrases = LANG_PROMPTS[language] || LANG_PROMPTS.english;

  // State
  const [phase, setPhase]           = useState('loading');
  const [questions, setQuestions]   = useState([]);
  const [qIndex, setQIndex]         = useState(0);
  const [answer, setAnswer]         = useState('');
  const [records, setRecords]       = useState([]);
  const [scores, setScores]         = useState([]);
  const [speaking, setSpeaking]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [ariaText, setAriaText]     = useState('');
  const [timeLeft, setTimeLeft]     = useState(QUESTION_TIME);
  const [timerOn, setTimerOn]       = useState(false);
  const [warned, setWarned]         = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isMuted, setIsMuted]       = useState(!micOn);
  const [isCamOff, setIsCamOff]     = useState(!cameraOn);

  // Refs
  const localVideoRef = useRef(null);
  const localStream   = useRef(null);
  const synthRef      = useRef(window.speechSynthesis);
  const timerRef      = useRef(null);
  const submitRef     = useRef(null);

  // ── Camera setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: cameraOn, audio: micOn
        });
        localStream.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch { /* camera/mic denied — still works */ }
    };
    startMedia();
    return () => localStream.current?.getTracks().forEach(t => t.stop());
  }, []);

  // ── TTS ───────────────────────────────────────────────────────────────────
  const speak = useCallback((text) => new Promise(resolve => {
    if (!text?.trim()) return resolve();
    synthRef.current.cancel();
    setAriaText(text);
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.88; utter.pitch = 1.1; utter.volume = 1;
    const voices = synthRef.current.getVoices();
    if (language === 'hindi' || language === 'hinglish') {
      const hi = voices.find(v => v.lang?.startsWith('hi'));
      if (hi) utter.voice = hi;
    } else {
      const preferred = ['Samantha','Google UK English Female','Microsoft Zira'];
      const v = voices.find(v => preferred.some(p => v.name.includes(p)));
      if (v) utter.voice = v;
    }
    utter.onstart = () => setSpeaking(true);
    utter.onend   = () => { setSpeaking(false); setAriaText(''); resolve(); };
    utter.onerror = () => { setSpeaking(false); setAriaText(''); resolve(); };
    synthRef.current.speak(utter);
  }), [language]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    setTimeLeft(QUESTION_TIME); setTimerOn(true); setWarned(false);
  }, []);

  const stopTimer = useCallback(() => {
    setTimerOn(false); clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (!timerOn) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { clearInterval(timerRef.current); setTimerOn(false); submitRef.current?.(); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerOn]);

  useEffect(() => {
    if (timerOn && timeLeft === 15 && !warned) {
      setWarned(true); speak(phrases.warn());
    }
  }, [timeLeft, timerOn, warned, phrases, speak]);

  // ── Load questions ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const prompt = `${difficulty} ${interviewType} ${role} ${experience} level`;
        const res = await generateQuestions(prompt, duration);
        const qs  = res.data.questions;
        setQuestions(qs);
        setPhase('interview');
        await speak(phrases.intro(role, experience));
        await speak(`Question 1: ${qs[0]}`);
        startTimer();
      } catch (e) {
        setPhase('error');
      }
    };
    synthRef.current.getVoices();
    window.speechSynthesis.onvoiceschanged = () => synthRef.current.getVoices();
    load();
    return () => { synthRef.current.cancel(); clearInterval(timerRef.current); };
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────
  const submitAnswer = useCallback(async (auto = false) => {
    stopTimer();
    const ans = answer.trim();
    const q   = questions[qIndex];
    setLoading(true);

    speak(phrases.ack(qIndex + 2));

    let result = { analysis:'', score:0, strengths:[], improvements:[] };
    try {
      if (ans) {
        const r = await analyzeAnswer(q, ans, role);
        result  = { analysis:r.data.analysis||'', score:r.data.score??0, strengths:r.data.strengths||[], improvements:r.data.improvements||[] };
      }
    } catch { /* use zero score */ }

    const rec = {
      question: q, answer: ans || '(no answer)', analysis: result.analysis,
      score: result.score, strengths: result.strengths, improvements: result.improvements,
      wordCount: wordCount(ans), fillerCount: countFillers(ans),
      skipped: !ans, autoSubmit: auto,
    };

    setScores(p  => [...p, result.score]);
    setRecords(p => [...p, rec]);
    setLoading(false);

    const next = qIndex + 1;
    if (next >= questions.length) {
      setPhase('done');
      const avg = Math.round([...scores, result.score].reduce((a,b)=>a+b,0) / ([...scores, result.score].length));
      await speak(phrases.done());
      setShowReport(true);
    } else {
      setQIndex(next);
      setAnswer('');
      await new Promise(r => setTimeout(r, 600));
      await speak(`Question ${next + 1}: ${questions[next]}`);
      startTimer();
    }
  }, [answer, questions, qIndex, role, scores, speak, stopTimer, startTimer, phrases]);

  useEffect(() => { submitRef.current = () => submitAnswer(true); }, [submitAnswer]);

  const skipQuestion = useCallback(async () => {
    stopTimer();
    const q = questions[qIndex];
    setScores(p  => [...p, 0]);
    setRecords(p => [...p, { question:q, answer:'(skipped)', analysis:'', score:0, strengths:[], improvements:['Question was skipped'], wordCount:0, fillerCount:0, skipped:true, autoSubmit:false }]);
    const next = qIndex + 1;
    if (next >= questions.length) { setPhase('done'); setShowReport(true); speak(phrases.done()); }
    else { setQIndex(next); setAnswer(''); await speak(`Question ${next+1}: ${questions[next]}`); startTimer(); }
  }, [questions, qIndex, speak, stopTimer, startTimer, phrases]);

  const toggleCam = () => {
    const track = localStream.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsCamOff(!track.enabled); }
  };
  const toggleMic = () => {
    const track = localStream.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
  };
  const endCall = () => { localStream.current?.getTracks().forEach(t=>t.stop()); synthRef.current.cancel(); navigate('/dashboard'); };

  const avgScore  = records.length ? Math.round(records.reduce((a,b)=>a+b.score,0)/records.length) : 0;
  const wc        = wordCount(answer);
  const fillers   = countFillers(answer);
  const timerCol  = timeLeft > 30 ? '#10b981' : timeLeft > 15 ? '#f59e0b' : '#ef4444';
  const timerPct  = (timeLeft / QUESTION_TIME) * 100;
  const quality   = wc < 20 ? { label:'Too short', col:'#ef4444' } : wc < 40 ? { label:'Build on this', col:'#f59e0b' } : wc <= 120 ? { label:'Good length', col:'#10b981' } : { label:'Keep it concise', col:'#f59e0b' };

  return (
    <div className="aria-interview-page">

      {/* ── Header bar ── */}
      <div className="aria-interview-header">
        <div className="aria-header-left">
          <span className="aria-live-dot"/>
          <span className="aria-header-title">ARIA Interview</span>
          <span className="aria-header-meta">{role} · {experience} · {interviewType}</span>
        </div>
        <div className="aria-header-right">
          {phase === 'interview' && (
            <span className="aria-header-q">
              Q{qIndex+1}/{questions.length}
            </span>
          )}
          <button className="aria-end-btn" onClick={endCall}>End Session</button>
        </div>
      </div>

      {/* ── Main split ── */}
      <div className="aria-interview-body">

        {/* ── Left: video feeds ── */}
        <div className="aria-video-col">

          {/* ARIA avatar feed */}
          <div className={`aria-avatar-feed ${speaking ? 'aria-speaking' : ''}`}>
            <div className="aria-avatar-bg">
              {/* Animated face */}
              <div className="aria-face">
                <div className="aria-eyes">
                  {[0,1].map(i=>(
                    <div key={i} className="aria-eye">
                      <div className="aria-pupil"/>
                    </div>
                  ))}
                </div>
                <div className={`aria-mouth ${speaking ? 'talking' : ''}`}/>
              </div>
              {speaking && (
                <div className="aria-bars">
                  {[...Array(10)].map((_,i)=>(
                    <div key={i} className="aria-bar" style={{animationDelay:`${i*0.08}s`}}/>
                  ))}
                </div>
              )}
            </div>
            <div className="aria-feed-label">
              <span className={`aria-status-dot ${speaking?'green':''}`}/>
              ARIA {speaking ? '· Speaking' : '· Listening'}
            </div>
            {ariaText && (
              <div className="aria-caption">{ariaText}</div>
            )}
          </div>

          {/* User camera feed */}
          <div className="aria-user-feed">
            {isCamOff ? (
              <div className="aria-cam-off">
                <span>📷</span>
                <span>Camera off</span>
              </div>
            ) : (
              <video ref={localVideoRef} autoPlay muted playsInline className="aria-user-video"/>
            )}
            <div className="aria-feed-label">
              <span className="aria-status-dot green"/>
              You
            </div>
          </div>

          {/* Controls */}
          <div className="aria-controls">
            <button onClick={toggleMic}  className={`aria-ctrl-btn ${isMuted?'danger':''}`} title={isMuted?'Unmute':'Mute'}>
              {isMuted ? '🔇' : '🎤'}
            </button>
            <button onClick={toggleCam} className={`aria-ctrl-btn ${isCamOff?'danger':''}`} title={isCamOff?'Camera on':'Camera off'}>
              {isCamOff ? '📷' : '📹'}
            </button>
            <button onClick={endCall} className="aria-ctrl-btn danger" title="End session">
              📞
            </button>
          </div>
        </div>

        {/* ── Right: question + answer ── */}
        <div className="aria-qa-col">

          {phase === 'loading' && (
            <div className="aria-loading">
              <div className="aria-spinner"/>
              <p>ARIA is preparing your interview...</p>
            </div>
          )}

          {phase === 'error' && (
            <div className="aria-loading">
              <p style={{color:'#ef4444'}}>Failed to load questions. Check your connection.</p>
              <button className="aria-btn-primary" onClick={()=>navigate('/aria-setup')}>← Back to Setup</button>
            </div>
          )}

          {phase === 'interview' && !showReport && (
            <>
              {/* Timer */}
              <div className="aria-timer-row">
                <span style={{fontSize:13,color:'#64748b'}}>Time remaining</span>
                <span style={{
                  fontSize:22, fontWeight:800, color:timerCol,
                  animation: timeLeft<=15 ? 'pulse 1s infinite' : 'none',
                }}>
                  {String(Math.floor(timeLeft/60)).padStart(2,'0')}:{String(timeLeft%60).padStart(2,'0')}
                </span>
              </div>
              <div className="aria-timer-bar">
                <div style={{width:`${timerPct}%`, background:timerCol, height:'100%', borderRadius:4, transition:'width 1s linear, background 0.5s'}}/>
              </div>

              {/* Question */}
              <div className="aria-question-box">
                <div className="aria-q-header">
                  <span className="aria-q-badge">Q{qIndex+1}</span>
                  <button onClick={()=>speak(`Question ${qIndex+1}: ${questions[qIndex]}`)}
                    disabled={speaking} className="aria-replay-btn">
                    🔊 Replay
                  </button>
                </div>
                <p className="aria-q-text">{questions[qIndex]}</p>
              </div>

              {/* Answer area */}
              <label className="aria-ans-label">Your Answer</label>
              <textarea
                className="aria-textarea"
                rows={6}
                placeholder="Type your answer... Use specific examples and measurable results."
                value={answer}
                onChange={e=>setAnswer(e.target.value)}
                disabled={loading||speaking}
              />

              {/* Live indicators */}
              <div className="aria-indicators">
                <span className="aria-indicator" style={{background:`${quality.col}18`,color:quality.col,border:`1px solid ${quality.col}44`}}>
                  {wc} words · {quality.label}
                </span>
                {fillers > 0 && (
                  <span className="aria-indicator" style={{background:'#f59e0b18',color:'#f59e0b',border:'1px solid #f59e0b44'}}>
                    ⚠️ {fillers} filler word{fillers>1?'s':''}
                  </span>
                )}
              </div>

              <div className="aria-action-row">
                <button className="aria-btn-primary"
                  onClick={()=>submitAnswer(false)}
                  disabled={loading||!answer.trim()||speaking}>
                  {loading ? '⏳ Analyzing...' : '✅ Submit Answer'}
                </button>
                <button className="aria-btn-ghost" onClick={skipQuestion} disabled={loading||speaking}>
                  Skip (0 pts)
                </button>
              </div>
            </>
          )}

          {/* ── Report ── */}
          {showReport && (
            <div className="aria-report">
              <div className="aria-report-header">
                <div>
                  <h2>Interview Complete</h2>
                  <p>{role} · {experience} · {interviewType}</p>
                </div>
                <div className="aria-overall-score">
                  <div className="aria-score-num">{avgScore}</div>
                  <div className="aria-score-label">Overall</div>
                </div>
              </div>

              <div className="aria-report-stats">
                {[
                  { n: questions.length,                              l:'Questions'  },
                  { n: records.filter(r=>!r.skipped).length,          l:'Answered'   },
                  { n: records.filter(r=>r.score>=70).length,         l:'Strong'     },
                  { n: records.filter(r=>r.skipped||r.autoSubmit).length, l:'Missed' },
                ].map(s=>(
                  <div key={s.l} className="aria-stat">
                    <div className="aria-stat-n">{s.n}</div>
                    <div className="aria-stat-l">{s.l}</div>
                  </div>
                ))}
              </div>

              {records.map((r,i)=>(
                <div key={i} className="aria-report-card">
                  <div className="aria-rc-top">
                    <div style={{flex:1}}>
                      <span className="aria-rc-badge">
                        Q{i+1} {r.skipped?'· Skipped':r.autoSubmit?'· Time ran out':''}
                      </span>
                      <p className="aria-rc-q">{r.question}</p>
                    </div>
                    <ScoreRing score={r.score}/>
                  </div>
                  {!r.skipped && (
                    <div className="aria-rc-meta">
                      <span>📝 {r.wordCount} words</span>
                      {r.fillerCount>0 && <span style={{color:'#f59e0b'}}>⚠️ {r.fillerCount} fillers</span>}
                    </div>
                  )}
                  <div className="aria-rc-answer">"{r.answer}"</div>
                  {r.analysis && <p className="aria-rc-analysis">💬 {r.analysis}</p>}
                  {r.strengths?.length>0 && (
                    <div className="aria-rc-strengths">
                      <p className="aria-rc-section-title" style={{color:'#10b981'}}>✅ What worked</p>
                      {r.strengths.map((s,j)=><p key={j} className="aria-rc-point">• {s}</p>)}
                    </div>
                  )}
                  {r.improvements?.length>0 && (
                    <div className="aria-rc-improvements">
                      <p className="aria-rc-section-title" style={{color:'#f59e0b'}}>💡 What to improve</p>
                      {r.improvements.map((s,j)=><p key={j} className="aria-rc-point">• {s}</p>)}
                    </div>
                  )}
                </div>
              ))}

              <div style={{display:'flex',gap:12,marginTop:16}}>
                <button className="aria-btn-primary" onClick={()=>navigate('/aria-setup')}>
                  🔄 Practice Again
                </button>
                <button className="aria-btn-ghost" onClick={()=>navigate('/dashboard')}>
                  Dashboard
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}