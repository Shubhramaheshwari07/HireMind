// frontend/src/pages/CandidateDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/api';
import { getMyReports } from '../api/api';
import './CandidateDashboard.css';

export default function CandidateDashboard() {
  const [user, setUser]               = useState(null);
  const [meetings, setMeetings]       = useState([]);
  const [reports, setReports]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [roomInput, setRoomInput]     = useState('');
  const [showJoinBox, setShowJoinBox] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showAllReports, setShowAllReports] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) { navigate('/login'); return; }
    const parsed = JSON.parse(userData);
    if (parsed.role === 'recruiter' || parsed.role === 'admin') {
      navigate('/recruiter-dashboard'); return;
    }
    setUser(parsed);
    fetchMeetings();
    fetchReports();
  }, [navigate]);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const res = await API.get('/meetings/my-meetings');
      setMeetings(res.data.meetings || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchReports = async () => {
    try {
      const res = await getMyReports();
      setReports(res.data.reports || []);
    } catch (e) { console.error('Could not fetch reports:', e); }
  };

  const startPractice = () => navigate('/aria-setup');

  const joinRoom = () => {
    const id = roomInput.trim();
    if (!id) return;
    navigate(`/room/${id}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const practiceCount = meetings.filter(m => m.title?.toLowerCase().includes('practice')).length;
  const avgScore = reports.length
    ? Math.round(reports.reduce((s, r) => s + r.avgScore, 0) / reports.length)
    : 0;
  const latestReport = reports[0] || null;

  if (!user) return <div className="cd-loading"><div className="cd-spin" />Loading...</div>;

  return (
    <div className="cd-root">

      {/* Nav */}
      <nav className="cd-nav">
        <div className="cd-nav-brand">
          <span className="cd-brand-rocket">🚀</span>
          <span className="cd-brand-name">HireMind</span>
        </div>
        <div className="cd-nav-center">
          <span className="cd-nav-greeting">Good {getGreeting()}, {user.name.split(' ')[0]}! 👋</span>
        </div>
        <div className="cd-nav-right">
          <div className="cd-nav-avatar">{user.name.charAt(0).toUpperCase()}</div>
          <span className="cd-nav-name">{user.name}</span>
          <span className="cd-role-chip">Candidate</span>
          <button className="cd-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="cd-content">

        {/* Hero */}
        <div className="cd-hero">
          <div className="cd-hero-left">
            <div className="cd-hero-label">INTERVIEW PREP PLATFORM</div>
            <h1 className="cd-hero-title">
              Practice. Improve.<br/>
              <span className="cd-hero-accent">Get Hired.</span>
            </h1>
            <p className="cd-hero-sub">
              Practice with ARIA, our live AI interviewer, or join a recruiter's session.
              Get instant feedback and real scores on every answer.
            </p>
            <div className="cd-hero-btns">
              <button className="cd-btn-primary" onClick={startPractice} disabled={loading}>
                <span>🤖</span> Practice with ARIA
              </button>
              <button className="cd-btn-secondary" onClick={() => setShowJoinBox(!showJoinBox)}>
                <span>🔗</span> Join Recruiter Session
              </button>
            </div>
            {showJoinBox && (
              <div className="cd-join-box">
                <div className="cd-join-label">Enter the Room ID your recruiter shared:</div>
                <div className="cd-join-row">
                  <input className="cd-join-input"
                    placeholder="Paste Room ID here..."
                    value={roomInput}
                    onChange={e => setRoomInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && joinRoom()}
                    autoFocus />
                  <button className="cd-join-go" onClick={joinRoom} disabled={!roomInput.trim()}>Join →</button>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="cd-hero-right">
            <div className="cd-stats-grid">
              <div className="cd-stat">
                <div className="cd-stat-val">{meetings.length}</div>
                <div className="cd-stat-label">Sessions</div>
              </div>
              <div className="cd-stat">
                <div className="cd-stat-val">{reports.length}</div>
                <div className="cd-stat-label">Reports</div>
              </div>
              <div className="cd-stat">
                <div className="cd-stat-val">{practiceCount}</div>
                <div className="cd-stat-label">AI Practice</div>
              </div>
              <div className="cd-stat">
                <div className="cd-stat-val">{avgScore || '—'}</div>
                <div className="cd-stat-label">Avg Score</div>
              </div>
            </div>

            {latestReport && (
              <div className="cd-latest-report">
                <div className="cd-report-header">
                  <span className="cd-report-icon">📊</span>
                  <span className="cd-report-title">Latest Performance</span>
                </div>
                <div className="cd-report-body">
                  <div className="cd-report-score-circle">
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="32" fill="none" stroke="#f1f5f9" strokeWidth="6"/>
                      <circle cx="40" cy="40" r="32" fill="none" stroke="#7c3aed" strokeWidth="6"
                        strokeDasharray={`${(latestReport.avgScore/100)*201} 201`}
                        strokeLinecap="round" transform="rotate(-90 40 40)"
                        style={{ transition:'stroke-dasharray 1s ease' }}/>
                      <text x="40" y="45" textAnchor="middle" fontSize="20" fontWeight="800" fill="#7c3aed">
                        {latestReport.avgScore}
                      </text>
                    </svg>
                  </div>
                  <div className="cd-report-meta">
                    <div className="cd-report-session">{latestReport.role} Interview</div>
                    <div className="cd-report-date">
                      {new Date(latestReport.createdAt).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
                    </div>
                  </div>
                  <button className="cd-view-report-btn" onClick={() => setSelectedReport(latestReport)}>
                    View Full Report →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feature Cards */}
        <div className="cd-features">
          <div className="cd-feature-card cd-feature-ai" onClick={startPractice}>
            <div className="cd-feature-glow" />
            <div className="cd-feature-icon">🤖</div>
            <div className="cd-feature-content">
              <h3>Practice with ARIA</h3>
              <p>A live AI interviewer asks role-specific questions, speaks out loud, and scores every answer instantly.</p>
              <div className="cd-feature-tags">
                <span>HD Video Avatar</span><span>Live Scoring</span><span>Instant Feedback</span>
              </div>
            </div>
            <div className="cd-feature-arrow">→</div>
          </div>

          <div className="cd-feature-card cd-feature-join" onClick={() => setShowJoinBox(true)}>
            <div className="cd-feature-icon">🎯</div>
            <div className="cd-feature-content">
              <h3>Join Real Interview</h3>
              <p>Your recruiter sends you a Room ID. Join a live interview session with video and chat.</p>
              <div className="cd-feature-tags">
                <span>Live Video</span><span>AI Assistance</span><span>Screen Share</span>
              </div>
            </div>
            <div className="cd-feature-arrow">→</div>
          </div>

          <div className="cd-feature-card cd-feature-reports"
            onClick={() => setShowAllReports(true)}
            style={{ cursor: 'pointer' }}>
            <div className="cd-feature-icon">📈</div>
            <div className="cd-feature-content">
              <h3>Performance Reports</h3>
              <p>
                {reports.length > 0
                  ? `You have ${reports.length} saved report${reports.length > 1 ? 's' : ''}. Click to view all.`
                  : 'Complete an ARIA interview to see your performance report here.'}
              </p>
              <div className="cd-feature-tags">
                <span>AI Analysis</span><span>Score Breakdown</span><span>Action Items</span>
              </div>
            </div>
            {reports.length === 0
              ? <span className="cd-soon-tag">Complete 1st Session</span>
              : <div className="cd-feature-arrow">→</div>}
          </div>
        </div>

        {/* Session History */}
        <div className="cd-history-section">
          <div className="cd-history-header">
            <h2>My Sessions</h2>
            <span className="cd-history-count">{meetings.length} total</span>
          </div>
          {loading ? (
            <div className="cd-loading-sessions"><div className="cd-spin" /><span>Loading...</span></div>
          ) : meetings.length === 0 ? (
            <div className="cd-no-sessions">
              <div className="cd-no-sessions-visual">
                <div className="cd-empty-rings">
                  <div className="cd-ring cd-ring-1" /><div className="cd-ring cd-ring-2" /><div className="cd-ring cd-ring-3" />
                  <span className="cd-empty-emoji">🎯</span>
                </div>
              </div>
              <h3>Ready to start?</h3>
              <p>Your first practice session is just one click away.</p>
              <button className="cd-btn-primary" onClick={startPractice} disabled={loading}>
                <span>🤖</span> Start First Practice
              </button>
            </div>
          ) : (
            <div className="cd-sessions-list">
              {meetings.map((m) => (
                <div key={m._id} className="cd-session-card">
                  <div className="cd-session-left">
                    <div className={`cd-session-icon ${m.title?.includes('Practice') ? 'icon-practice' : 'icon-live'}`}>
                      {m.title?.includes('Practice') ? '🤖' : '🎯'}
                    </div>
                    <div className="cd-session-info">
                      <div className="cd-session-title">{m.title}</div>
                      <div className="cd-session-time">
                        {new Date(m.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                        {' at '}
                        {new Date(m.createdAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                      </div>
                      <div className="cd-session-meta">
                        <span className={`cd-session-status status-${m.status}`}>{m.status}</span>
                        {m.duration && <span className="cd-session-dur">⏱ {m.duration} min</span>}
                      </div>
                    </div>
                  </div>
                  <div className="cd-session-right">
                    {m.status === 'ongoing' && (
                      <button className="cd-rejoin-btn" onClick={() => navigate(`/room/${m.roomId}`)}>
                        Rejoin →
                      </button>
                    )}
                    {m.status === 'completed' && (
                      <button className="cd-view-report-sm" onClick={() => setShowAllReports(true)}>
                        View Reports
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account */}
        <div className="cd-account-card">
          <h3>Account Details</h3>
          <div className="cd-account-grid">
            <div className="cd-account-field">
              <div className="cd-field-label">Full Name</div>
              <div className="cd-field-val">{user.name}</div>
            </div>
            <div className="cd-account-field">
              <div className="cd-field-label">Email</div>
              <div className="cd-field-val">{user.email}</div>
            </div>
            <div className="cd-account-field">
              <div className="cd-field-label">Account Type</div>
              <div className="cd-field-val">🎓 Candidate</div>
            </div>
            <div className="cd-account-field">
              <div className="cd-field-label">Reports Saved</div>
              <div className="cd-field-val">{reports.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ALL REPORTS MODAL */}
      {showAllReports && (
        <div className="cd-modal-overlay" onClick={() => setShowAllReports(false)}>
          <div className="cd-modal" onClick={e => e.stopPropagation()}>
            <div className="cd-modal-header">
              <div className="cd-modal-title-group">
                <h3>📊 All Performance Reports</h3>
                <p>{reports.length} report{reports.length !== 1 ? 's' : ''} saved</p>
              </div>
              <button className="cd-modal-close" onClick={() => setShowAllReports(false)}>✕</button>
            </div>
            <div className="cd-modal-body">
              {reports.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 20px', color:'#64748b' }}>
                  <div style={{ fontSize:'48px', marginBottom:'16px' }}>📭</div>
                  <p style={{ fontSize:'16px', fontWeight:600, marginBottom:'8px' }}>No reports yet</p>
                  <p>Complete an ARIA interview to see your report here.</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                  {reports.map((r, i) => (
                    <div key={r._id || i} style={{
                      background:'#faf5ff', border:'1px solid #ede9fe',
                      borderRadius:'14px', padding:'18px 20px',
                      display:'flex', justifyContent:'space-between', alignItems:'center',
                      cursor:'pointer', transition:'all .18s'
                    }}
                      onClick={() => { setSelectedReport(r); setShowAllReports(false); }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:'15px', color:'#1e1b4b', marginBottom:'4px' }}>
                          {r.role} Interview
                        </div>
                        <div style={{ fontSize:'12px', color:'#94a3b8', marginBottom:'8px' }}>
                          {new Date(r.createdAt).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
                          {' · '}
                          {r.answeredQuestions}/{r.totalQuestions} questions answered
                        </div>
                        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                          <span style={{ fontSize:'11px', fontWeight:700, background:'#ede9fe', color:'#7c3aed', padding:'2px 10px', borderRadius:'20px' }}>
                            {r.strongAnswers} Strong
                          </span>
                          <span style={{ fontSize:'11px', fontWeight:700, background:'#f0fdf4', color:'#166534', padding:'2px 10px', borderRadius:'20px' }}>
                            Score: {r.avgScore}/100
                          </span>
                        </div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}>
                        <svg width="60" height="60" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="32" fill="none" stroke="#f1f5f9" strokeWidth="6"/>
                          <circle cx="40" cy="40" r="32" fill="none"
                            stroke={r.avgScore >= 75 ? '#10b981' : r.avgScore >= 50 ? '#f59e0b' : '#ef4444'}
                            strokeWidth="6"
                            strokeDasharray={`${(r.avgScore/100)*201} 201`}
                            strokeLinecap="round" transform="rotate(-90 40 40)"/>
                          <text x="40" y="45" textAnchor="middle" fontSize="18" fontWeight="800"
                            fill={r.avgScore >= 75 ? '#10b981' : r.avgScore >= 50 ? '#f59e0b' : '#ef4444'}>
                            {r.avgScore}
                          </text>
                        </svg>
                        <span style={{ fontSize:'11px', color:'#94a3b8' }}>View →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="cd-modal-footer">
              <button className="cd-modal-btn-secondary" onClick={() => setShowAllReports(false)}>Close</button>
              <button className="cd-modal-btn-primary" onClick={() => { setShowAllReports(false); navigate('/aria-setup'); }}>
                🤖 New Practice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE REPORT DETAIL MODAL */}
      {selectedReport && (
        <div className="cd-modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="cd-modal" onClick={e => e.stopPropagation()}>
            <div className="cd-modal-header">
              <div className="cd-modal-title-group">
                <h3>📊 Interview Performance Report</h3>
                <p>{selectedReport.role} Interview</p>
              </div>
              <button className="cd-modal-close" onClick={() => setSelectedReport(null)}>✕</button>
            </div>
            <div className="cd-modal-body">
              <div className="cd-modal-score-section">
                <div className="cd-modal-score-circle">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="48" fill="none" stroke="#f1f5f9" strokeWidth="8"/>
                    <circle cx="60" cy="60" r="48" fill="none" stroke="#7c3aed" strokeWidth="8"
                      strokeDasharray={`${(selectedReport.avgScore/100)*301.6} 301.6`}
                      strokeLinecap="round" transform="rotate(-90 60 60)"
                      style={{ transition:'stroke-dasharray 1s ease' }}/>
                    <text x="60" y="68" textAnchor="middle" fontSize="32" fontWeight="800" fill="#7c3aed">
                      {selectedReport.avgScore}
                    </text>
                  </svg>
                </div>
                <div className="cd-modal-score-info">
                  <div className="cd-modal-score-label">Overall Performance</div>
                  <div className="cd-modal-score-rating">
                    {selectedReport.avgScore >= 85 ? '🌟 Excellent' :
                     selectedReport.avgScore >= 70 ? '✨ Good' : '📈 Keep Practising'}
                  </div>
                  <div className="cd-modal-meta">
                    <span>{new Date(selectedReport.createdAt).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</span>
                    <span>•</span>
                    <span>{selectedReport.answeredQuestions}/{selectedReport.totalQuestions} answered</span>
                    <span>•</span>
                    <span>{selectedReport.strongAnswers} strong answers</span>
                  </div>
                </div>
              </div>

              {selectedReport.records && selectedReport.records.length > 0 && (
                <div className="cd-modal-section">
                  <h4>Question by Question Breakdown</h4>
                  <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                    {selectedReport.records.map((rec, i) => (
                      <div key={i} style={{
                        background:'#f8f7ff', border:'1px solid #ede9fe',
                        borderRadius:'12px', padding:'16px'
                      }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                          <div style={{ fontWeight:700, fontSize:'13px', color:'#7c3aed' }}>Q{i+1}</div>
                          <span style={{
                            fontSize:'12px', fontWeight:700, padding:'2px 10px', borderRadius:'20px',
                            background: rec.score >= 70 ? '#d1fae5' : rec.score >= 50 ? '#fef3c7' : '#fee2e2',
                            color:      rec.score >= 70 ? '#065f46' : rec.score >= 50 ? '#78350f' : '#991b1b'
                          }}>{rec.score}/100</span>
                        </div>
                        <p style={{ fontSize:'14px', fontWeight:600, color:'#1e1b4b', marginBottom:'8px', lineHeight:1.5 }}>
                          {rec.question}
                        </p>
                        <p style={{ fontSize:'13px', color:'#475569', marginBottom:'10px', lineHeight:1.6,
                          paddingLeft:'12px', borderLeft:'3px solid #ddd6fe' }}>
                          {rec.answer}
                        </p>
                        <div style={{ fontSize:'13px', color:'#166534', background:'#f0fdf4',
                          border:'1px solid #bbf7d0', borderRadius:'8px', padding:'10px 12px', lineHeight:1.6 }}>
                          {rec.analysis}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="cd-modal-action-box">
                <div className="cd-action-icon">💡</div>
                <div>
                  <div className="cd-action-title">Next Steps</div>
                  <div className="cd-action-text">
                    Practice again to improve your score. Focus on specific examples and the STAR method
                    (Situation, Task, Action, Result) for stronger answers.
                  </div>
                </div>
              </div>
            </div>
            <div className="cd-modal-footer">
              <button className="cd-modal-btn-secondary" onClick={() => setSelectedReport(null)}>Close</button>
              <button className="cd-modal-btn-primary" onClick={() => { setSelectedReport(null); navigate('/aria-setup'); }}>
                🤖 Practice Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
