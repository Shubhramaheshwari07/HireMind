// Backend/models/Report.js
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  user:              { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role:              { type: String,  required: true },
  avgScore:          { type: Number,  required: true },
  totalQuestions:    { type: Number,  default: 5 },
  answeredQuestions: { type: Number },
  strongAnswers:     { type: Number },
  records: [{
    question: String,
    answer:   String,
    analysis: String,
    score:    Number
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);