// frontend/src/api/api.js

import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auth ─────────────────────────
export const signup       = (data) => API.post('/auth/signup', data);
export const login        = (data) => API.post('/auth/login', data);   // ✅ added — Login.jsx uses this
export const loginUser    = (data) => API.post('/auth/login', data);   // kept for compatibility
export const registerUser = (data) => API.post('/auth/signup', data);  // kept for compatibility

// ─── Meetings ─────────────────────
export const createMeeting = (data)   => API.post('/meetings/create', data);
export const getMyMeetings = ()       => API.get('/meetings/my-meetings');
export const endMeeting    = (roomId) => API.post(`/meetings/${roomId}/end`);

// ─── Reports ──────────────────────
export const saveReport   = (data) => API.post('/reports/save', data);
export const getMyReports = ()     => API.get('/reports/my-reports');

// ─── AI ───────────────────────────

// Returns full axios response so callers read response.data.questions
export const generateQuestions = (role, count = 5) =>
  API.post('/ai/generate-questions', { role, count });

export const analyzeAnswer = (question, answer, role = '') =>
  API.post('/ai/analyze-answer', { question, answer, role });

export const getAIResponse = (context, userMessage) =>
  API.post('/ai/get-response', { context, userMessage });

export const generateFullReport = (role, records) =>
  API.post('/ai/full-report', { role, records });

export default API;