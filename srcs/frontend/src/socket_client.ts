import { io, Socket } from 'socket.io-client';

const SERVER = (window as any).__BACKEND_URL__ || 'http://10.101.172.74:8080';

let socket: Socket | null = null;

export function connectSocket() {
  if (!socket) {
    socket = io(SERVER, { autoConnect: true });
  }
  return socket;
}

export function getSocket() {
  return socket;
}

export default { connectSocket, getSocket };
