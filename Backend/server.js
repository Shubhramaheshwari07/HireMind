// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== DATABASE CONNECTION ====================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hiremind';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully!');
    console.log('📊 Database: hiremind');
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });

// ==================== ROUTES ====================
const authRoutes = require('./routes/auth');
const meetingRoutes = require('./routes/meetings');
const aiRoutes = require('./routes/ai');
const avatarRoutes = require('./routes/avatar');

app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/avatar', avatarRoutes);

app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 HireMind Backend is Running!',
    status: 'active',
    timestamp: new Date()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ==================== SOCKET.IO LOGIC ====================
const rooms = new Map(); // Store active rooms

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  // Join room
  socket.on('join-room', ({ roomId, userId, userName }) => {
    socket.join(roomId);
    
    // Add user to room
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add({ socketId: socket.id, userId, userName });

    console.log(`📹 ${userName} joined room: ${roomId}`);

    // Notify others in room
    socket.to(roomId).emit('user-joined', { userId, userName });

    // Send current users in room
    const usersInRoom = Array.from(rooms.get(roomId) || []);
    socket.emit('room-users', usersInRoom);
  });

  // WebRTC signaling
  socket.on('offer', ({ offer, roomId, targetSocketId }) => {
    socket.to(targetSocketId).emit('offer', { offer, socketId: socket.id });
  });

  socket.on('answer', ({ answer, targetSocketId }) => {
    socket.to(targetSocketId).emit('answer', { answer, socketId: socket.id });
  });

  socket.on('ice-candidate', ({ candidate, targetSocketId }) => {
    socket.to(targetSocketId).emit('ice-candidate', { candidate, socketId: socket.id });
  });

  // Chat messages
  socket.on('chat-message', ({ roomId, message, userName }) => {
    io.to(roomId).emit('chat-message', {
      message,
      userName,
      timestamp: new Date()
    });
  });

  // Leave room
  socket.on('leave-room', ({ roomId }) => {
    socket.leave(roomId);
    
    if (rooms.has(roomId)) {
      const roomUsers = rooms.get(roomId);
      roomUsers.forEach(user => {
        if (user.socketId === socket.id) {
          roomUsers.delete(user);
          socket.to(roomId).emit('user-left', { userId: user.userId });
        }
      });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
    
    // Remove user from all rooms
    rooms.forEach((users, roomId) => {
      users.forEach(user => {
        if (user.socketId === socket.id) {
          users.delete(user);
          io.to(roomId).emit('user-left', { userId: user.userId });
        }
      });
    });
  });
});

// ==================== ERROR HANDLING ====================
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path 
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('=================================');
  console.log(`🚀 HireMind Server Started`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO Ready`);
  console.log('=================================');
});