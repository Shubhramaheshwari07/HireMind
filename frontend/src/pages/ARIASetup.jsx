// frontend/src/pages/ARIASetup.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ARIASetup.css';

const ROLES = [
  'Software Engineer', 'Frontend Developer', 'Backend Developer',
  'Full Stack Developer', 'Data Scientist', 'Data Analyst',
  'Product Manager', 'Finance Analyst', 'Marketing Manager',
  'HR Manager', 'Business Analyst', 'DevOps Engineer',
  'UI/UX Designer', 'Other'
];

const STEPS = ['Role', 'Experience', 'Focus', 'Settings'];

export default function ARIASetup() {
  const navigate = useNavigate();
  const [step, setStep]   = useState(0);
  const [form, setForm]   = useState({
    role:           '',
    customRole:     '',
    experience:     '',
    interviewType:  'general',
    difficulty:     'medium',
    duration:       '5',
    language:       'english',
    cameraOn:       true,
    micOn:          true,
  });
  const [error, setError] = useState('');

  const update = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const canNext = () => {
    if (step === 0) return form.role !== '' && (form.role !== 'Other' || form.customRole.trim());
    if (step === 1) return form.experience !== '';
    return true;
  };

  const next = () => {
    if (!canNext()) { setError('Please fill in this field before continuing.'); return; }
    setError('');
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else startInterview();
  };

  const startInterview = () => {
    const finalRole = form.role === 'Other' ? form.customRole : form.role;
    navigate('/aria-interview', {
      state: {
        role:          finalRole,
        experience:    form.experience,
        interviewType: form.interviewType,
        difficulty:    form.difficulty,
        duration:      parseInt(form.duration),
        language:      form.language,
        cameraOn:      form.cameraOn,
        micOn:         form.micOn,
      }
    });
  };

  return (
    <div className="aria-setup-page">

      {/* Left panel */}
      <div className="aria-setup-left">
        <div className="aria-brand" onClick={() => navigate('/dashboard')}>
          <span className="aria-brand-icon">🤖</span>
          <span className="aria-brand-name">ARIA</span>
        </div>
        <h1 className="aria-setup-heading">
          Your personal AI<br/>interview coach
        </h1>
        <p className="aria-setup-subheading">
          A lifelike interviewer who adapts to your role, experience, and pace.
          Practice until you're confident.
        </p>
        <div className="aria-features">
          {[
            { icon: '🎥', text: 'Live video session with ARIA' },
            { icon: '🧠', text: 'AI-adapted questions per answer' },
            { icon: '📊', text: 'Full scored report at the end' },
            { icon: '🎯', text: 'Role & experience specific' },
            { icon: '🌐', text: 'Multi-language support' },
            { icon: '🔒', text: 'Private — nothing is stored' },
          ].map(f => (
            <div key={f.text} className="aria-feature-item">
              <span className="aria-feature-icon">{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Step indicators */}
        <div className="aria-steps">
          {STEPS.map((s, i) => (
            <div key={s} className={`aria-step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
              <div className="aria-step-dot">{i < step ? '✓' : i + 1}</div>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="aria-setup-right">
        <div className="aria-form-card">

          {error && (
            <div className="aria-error">⚠️ {error}</div>
          )}

          {/* ── Step 0: Role ── */}
          {step === 0 && (
            <div className="aria-form-step">
              <h2>What role are you interviewing for?</h2>
              <p>We'll generate questions tailored to this position.</p>
              <div className="role-grid">
                {ROLES.map(r => (
                  <button key={r}
                    className={`role-chip ${form.role === r ? 'selected' : ''}`}
                    onClick={() => { update('role', r); setError(''); }}>
                    {r}
                  </button>
                ))}
              </div>
              {form.role === 'Other' && (
                <input
                  className="aria-input"
                  placeholder="Enter your role..."
                  value={form.customRole}
                  onChange={e => update('customRole', e.target.value)}
                  autoFocus
                />
              )}
            </div>
          )}

          {/* ── Step 1: Experience ── */}
          {step === 1 && (
            <div className="aria-form-step">
              <h2>What's your experience level?</h2>
              <p>This adjusts the difficulty and depth of questions.</p>
              <div className="exp-grid">
                {[
                  { val: 'fresher',      label: '🎓 Fresher',        sub: '0 years' },
                  { val: 'junior',       label: '🌱 Junior',          sub: '1–2 years' },
                  { val: 'mid',          label: '💼 Mid-level',       sub: '3–5 years' },
                  { val: 'senior',       label: '🚀 Senior',          sub: '6–10 years' },
                  { val: 'lead',         label: '👑 Lead / Manager',  sub: '10+ years' },
                ].map(e => (
                  <button key={e.val}
                    className={`exp-card ${form.experience === e.val ? 'selected' : ''}`}
                    onClick={() => { update('experience', e.val); setError(''); }}>
                    <span className="exp-label">{e.label}</span>
                    <span className="exp-sub">{e.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Focus ── */}
          {step === 2 && (
            <div className="aria-form-step">
              <h2>What type of interview?</h2>
              <p>Choose the focus area for your session.</p>

              <label className="aria-label">Interview Type</label>
              <div className="type-grid">
                {[
                  { val: 'general',      label: '🎯 General',      sub: 'Mix of all types' },
                  { val: 'behavioural',  label: '🧠 Behavioural',  sub: 'Situational & STAR' },
                  { val: 'technical',    label: '💻 Technical',    sub: 'Concepts & problem solving' },
                  { val: 'hr',           label: '👥 HR Round',     sub: 'Culture fit & soft skills' },
                ].map(t => (
                  <button key={t.val}
                    className={`type-card ${form.interviewType === t.val ? 'selected' : ''}`}
                    onClick={() => update('interviewType', t.val)}>
                    <span className="type-label">{t.label}</span>
                    <span className="type-sub">{t.sub}</span>
                  </button>
                ))}
              </div>

              <label className="aria-label" style={{ marginTop: 20 }}>Difficulty</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {['easy', 'medium', 'hard'].map(d => (
                  <button key={d}
                    className={`diff-btn ${form.difficulty === d ? 'selected' : ''}`}
                    onClick={() => update('difficulty', d)}>
                    {d === 'easy' ? '😊 Easy' : d === 'medium' ? '🔥 Medium' : '💀 Hard'}
                  </button>
                ))}
              </div>

              <label className="aria-label" style={{ marginTop: 20 }}>Number of Questions</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {['3', '5', '7', '10'].map(n => (
                  <button key={n}
                    className={`diff-btn ${form.duration === n ? 'selected' : ''}`}
                    onClick={() => update('duration', n)}>
                    {n} Qs
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Settings ── */}
          {step === 3 && (
            <div className="aria-form-step">
              <h2>Almost ready!</h2>
              <p>Check your setup before the interview begins.</p>

              <label className="aria-label">Language</label>
              <select className="aria-select"
                value={form.language}
                onChange={e => update('language', e.target.value)}>
                <option value="english">🇬🇧 English</option>
                <option value="hindi">🇮🇳 Hindi</option>
                <option value="hinglish">🇮🇳 Hinglish (Hindi + English)</option>
                <option value="french">🇫🇷 French</option>
                <option value="spanish">🇪🇸 Spanish</option>
                <option value="german">🇩🇪 German</option>
                <option value="arabic">🇸🇦 Arabic</option>
              </select>

              <div style={{ marginTop: 24 }}>
                <label className="aria-label">Device Check</label>
                <div className="device-row">
                  <div className={`device-card ${form.cameraOn ? 'on' : 'off'}`}
                    onClick={() => update('cameraOn', !form.cameraOn)}>
                    <span>{form.cameraOn ? '📹' : '📷'}</span>
                    <span>{form.cameraOn ? 'Camera On' : 'Camera Off'}</span>
                  </div>
                  <div className={`device-card ${form.micOn ? 'on' : 'off'}`}
                    onClick={() => update('micOn', !form.micOn)}>
                    <span>{form.micOn ? '🎤' : '🔇'}</span>
                    <span>{form.micOn ? 'Mic On' : 'Mic Off'}</span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="aria-summary">
                <h4>Your Session</h4>
                <div className="summary-row">
                  <span>Role</span>
                  <strong>{form.role === 'Other' ? form.customRole : form.role}</strong>
                </div>
                <div className="summary-row">
                  <span>Experience</span>
                  <strong style={{ textTransform: 'capitalize' }}>{form.experience}</strong>
                </div>
                <div className="summary-row">
                  <span>Type</span>
                  <strong style={{ textTransform: 'capitalize' }}>{form.interviewType}</strong>
                </div>
                <div className="summary-row">
                  <span>Difficulty</span>
                  <strong style={{ textTransform: 'capitalize' }}>{form.difficulty}</strong>
                </div>
                <div className="summary-row">
                  <span>Questions</span>
                  <strong>{form.duration}</strong>
                </div>
                <div className="summary-row">
                  <span>Language</span>
                  <strong style={{ textTransform: 'capitalize' }}>{form.language}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="aria-form-nav">
            {step > 0 && (
              <button className="aria-btn-back" onClick={() => { setStep(s => s - 1); setError(''); }}>
                ← Back
              </button>
            )}
            <button className="aria-btn-next" onClick={next} disabled={!canNext()}>
              {step === STEPS.length - 1 ? '🚀 Start Interview' : 'Continue →'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}