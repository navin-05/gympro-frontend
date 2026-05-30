import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://gympro-backend-1.onrender.com/api';
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

let socket = null;
let handlers = null;

export async function connectReferralSocket(callbacks) {
  handlers = callbacks;
  const token = await AsyncStorage.getItem('authToken');
  if (!token) return null;

  if (socket?.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('[ReferralSocket] connected');
  });

  socket.on('referral:created', (payload) => {
    handlers?.onReferralCreated?.(payload);
  });

  socket.on('referral:stats', (payload) => {
    handlers?.onStatsUpdated?.(payload);
  });

  socket.on('connect_error', (err) => {
    console.log('[ReferralSocket] connect_error:', err.message);
  });

  return socket;
}

export function disconnectReferralSocket() {
  handlers = null;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function updateReferralSocketHandlers(callbacks) {
  handlers = callbacks;
}
