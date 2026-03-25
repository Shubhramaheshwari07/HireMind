// frontend/src/pages/VideoCall.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import HeyGenAvatar from '../components/HeyGenAvatar'; // ✅ was ARIAInterview
import API from '../api/api';
import './VideoCall.css';

const SOCKET_URL = 'http://localhost:5000';

function VideoCall() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [roomUsers, setRoomUsers] = useState([]);
  const [isHost, setIsHost] = useState(false);

  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peersRef = useRef({});
  const screenStreamRef = useRef(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!user.id) {
      navigate('/login');
      return;
    }

    if (user.role === 'recruiter' || user.role === 'admin') {
      setIsHost(true);
    }

    initializeMediaAndSocket();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      Object.values(peersRef.current).forEach(peer => peer.close());
    };
  }, []);

  const initializeMediaAndSocket = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      socketRef.current = io(SOCKET_URL);

      socketRef.current.emit('join-room', {
        roomId,
        userId: user.id,
        userName: user.name
      });

      socketRef.current.on('room-users', (users) => {
        setRoomUsers(users);
      });

      socketRef.current.on('user-joined', ({ userId, userName }) => {
        addChatMessage(`${userName} joined the call`, 'system');
      });

      socketRef.current.on('user-left', ({ userId }) => {
        setRemoteStreams(prev => prev.filter(s => s.userId !== userId));
        addChatMessage('A user left the call', 'system');
      });

      socketRef.current.on('chat-message', ({ message, userName, timestamp }) => {
        addChatMessage(`${userName}: ${message}`, 'user');
      });

      socketRef.current.on('offer', async ({ offer, socketId }) => {
        await handleOffer(offer, socketId, stream);
      });

      socketRef.current.on('answer', async ({ answer, socketId }) => {
        await handleAnswer(answer, socketId);
      });

      socketRef.current.on('ice-candidate', async ({ candidate, socketId }) => {
        await handleIceCandidate(candidate, socketId);
      });

    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Could not access camera/microphone. Please check permissions.');
    }
  };

  const addChatMessage = (message, type = 'user') => {
    setChatMessages(prev => [...prev, { message, type, time: new Date() }]);
  };

  const handleOffer = async (offer, socketId, stream) => {
    console.log('Received offer from', socketId);
  };

  const handleAnswer = async (answer, socketId) => {
    console.log('Received answer from', socketId);
  };

  const handleIceCandidate = async (candidate, socketId) => {
    console.log('Received ICE candidate');
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const shareScreen = async () => {
    try {
      if (isScreenSharing) {
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setLocalStream(stream);
        setIsScreenSharing(false);
      } else {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);
        screenStream.getVideoTracks()[0].onended = () => { shareScreen(); };
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const sendMessage = () => {
    if (chatInput.trim() && socketRef.current) {
      socketRef.current.emit('chat-message', {
        roomId,
        message: chatInput,
        userName: user.name
      });
      setChatInput('');
    }
  };

  const leaveCall = async () => {
    try {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }

      if (socketRef.current) {
        socketRef.current.emit('leave-room', { roomId });
      }

      if (isHost || user.role === 'recruiter') {
        try {
          await API.post(`/meetings/${roomId}/end`);
          console.log('✅ Meeting ended in DB');
        } catch (err) {
          console.warn('Could not end meeting in DB:', err.message);
        }
      }
    } catch (err) {
      console.error('Leave call error:', err);
    } finally {
      navigate('/dashboard');
    }
  };

  return (
    <div className="video-call-container">
      <div className="video-main">
        <div className="video-grid">
          <div className="video-wrapper local-video">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="video-element"
            />
            <div className="video-label">You {isScreenSharing && '(Screen)'}</div>
          </div>

          {remoteStreams.map((stream, index) => (
            <div key={index} className="video-wrapper remote-video">
              <video autoPlay playsInline className="video-element" />
              <div className="video-label">Participant {index + 1}</div>
            </div>
          ))}

          {[...Array(Math.max(0, 3 - remoteStreams.length))].map((_, index) => (
            <div key={`empty-${index}`} className="video-wrapper empty-slot">
              <div className="empty-label">Waiting for participant...</div>
            </div>
          ))}
        </div>
      </div>

      <div className="video-controls">
        <div className="controls-left">
          <span className="room-info">Room: {roomId?.substring(0, 8)}...</span>
        </div>

        <div className="controls-center">
          <button onClick={toggleAudio}
            className={`control-btn ${isMuted ? 'btn-danger' : 'btn-active'}`}
            title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted ? '🔇' : '🎤'}
          </button>

          <button onClick={toggleVideo}
            className={`control-btn ${isVideoOff ? 'btn-danger' : 'btn-active'}`}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}>
            {isVideoOff ? '📷❌' : '📹'}
          </button>

          <button onClick={shareScreen}
            className={`control-btn ${isScreenSharing ? 'btn-active' : ''}`}
            title="Share screen">
            🖥️
          </button>

          <button onClick={() => setShowChat(!showChat)}
            className="control-btn" title="Toggle chat">
            💬
          </button>

          <button onClick={() => setShowAI(!showAI)}
            className="control-btn btn-ai" title="AI Interview Assistant">
            🤖
          </button>

          <button onClick={leaveCall}
            className="control-btn btn-danger leave-btn" title="Leave call">
            📞 {isHost ? 'End Call' : 'Leave Call'}
          </button>
        </div>

        <div className="controls-right">
          <span className="participants-count">👥 {roomUsers.length}</span>
        </div>
      </div>

      {showChat && (
        <div className="chat-sidebar">
          <div className="chat-header">
            <h3>Chat</h3>
            <button onClick={() => setShowChat(false)} className="close-chat">✖️</button>
          </div>
          <div className="chat-messages">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.type}`}>
                <span className="message-text">{msg.message}</span>
                <span className="message-time">
                  {msg.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
          <div className="chat-input-area">
            <input type="text" placeholder="Type a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="chat-input" />
            <button onClick={sendMessage} className="send-btn">Send</button>
          </div>
        </div>
      )}

      {showAI && (
        <HeyGenAvatar roomId={roomId} onClose={() => setShowAI(false)} />  // ✅ fixed
      )}
    </div>
  );
}

export default VideoCall;