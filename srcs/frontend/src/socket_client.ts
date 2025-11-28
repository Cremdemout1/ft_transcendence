import { io, Socket } from 'socket.io-client';

const isHttps = window.location.protocol === 'https:'; //Checks if the current page is loaded over HTTPS
const DEFAULT_BACKEND_HOST = window.location.hostname || 'localhost'; //Uses the page hostname as the default backend host, going back to localhost if needed
const DEFAULT_BACKEND_PORT = 8080; //Sets the default backend port to 8080
const SERVER = (window as any).__BACKEND_URL__ || `${isHttps ? 'https' : 'http'}://${DEFAULT_BACKEND_HOST}:${DEFAULT_BACKEND_PORT}`;
//Builds the backend server URL based on the protocol (HTTP/HTTPS), host and port, allowing to be overwrritten if needed

let socket: Socket | null = null;

export function connectSocket() {
  if (!socket) {
    socket = io(SERVER, { //Initializes the socket connection poitinng to the Server URL
      autoConnect: true,
      secure: isHttps, //Ensures secure connection if the page is loaded over HTTPS
      transports: ['websocket', 'polling'], //allows both WebSocket and HTTP for compatiblity
      withCredentials: true, //Include credentials
    });
  }
  return socket;
}

export function getSocket() {
  return socket;
}

export default { connectSocket, getSocket };
