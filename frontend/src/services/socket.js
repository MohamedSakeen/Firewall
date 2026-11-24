import { io } from 'socket.io-client';

<<<<<<< HEAD
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
=======
const SOCKET_URL = 'http://localhost:5000';
>>>>>>> 0ccd9f586ab23ec2d57b5097d541511ecc130955

let socket = null;

export function connectSocket() {
  if (socket && socket.connected) return socket;
  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
