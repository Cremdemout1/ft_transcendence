/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game_server.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: phantasiae <phantasiae@student.42.fr>      +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/06 18:59:03 by yohan             #+#    #+#             */
/*   Updated: 2025/10/15 20:44:26 by phantasiae       ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { Server, Socket } from "socket.io";
import { GameMath } from "./game/pong/pong_logic";
import * as dotenv from "dotenv";

dotenv.config();

const io = new Server(8081, { 
  cors: { 
    origin: process.env.CORS_ORIGIN,
    credentials: true, 
    methods: ["GET", "POST"] 
  } 
});

type Room = {
  code: string | null;
  numPlayers: number;
  players: string[];
  game: GameMath;
};

const rooms: { [code: string]: Room } = {};

//Utility Functions
function generateRoomCode(): string {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function findPlayerRoom(socketId: string): { roomCode: string | null, room: Room | null } {
  for (const code in rooms) {
    const room = rooms[code];
    if (room.players.includes(socketId)) {
      return { roomCode: code, room };
    }
  }
  return { roomCode: null, room: null };
}

function activateRoomPaddles(room: Room): void {
  for (let i = 0; i < room.numPlayers; i++) {
    room.game.paddles[i].active = 1;
    console.log(`Paddle ${i} activated for ${room.numPlayers}-player room`);
  }
}

function cleanupRoom(roomCode: string): void {
  const room = rooms[roomCode];
  if (room && room.players.length === 0) {
    console.log(`Deleting empty room: ${roomCode}`);
    delete rooms[roomCode];
  }
}
let i=0;
//Socket Event Handlers
async function handlePlayerInput(socket: Socket, input: any){
  const { roomCode, room } = findPlayerRoom(socket.id);
  
  if (!roomCode || !room) {
    console.log(`Player ${socket.id} not found in any room`);
    return;
  }
  
  const playerIdx = room.players.indexOf(socket.id);
  if (playerIdx === -1) {
    console.log(`Player ${socket.id} index not found in room ${roomCode}`);
    return;
  }
  
  //Assign input to the correct paddle
  const paddle = room.game.paddles[playerIdx];
  if (paddle && paddle.active) {
    paddle.up = input.up;
    paddle.down = input.down;
    paddle.left = input.left;
    paddle.right = input.right;
  }
  
  //Update game state
  await room.game.update();
  //Send game state only to players in this specific room
  io.to(roomCode).emit("gameState", { gameState: room.game.getState() });
  if(room.game.getState().hit==1)
  {
	console.log("SERVER:")
	console.log(room.game.getState());
	i++;
	console.log("i: "+i);
  }
}

function handlePlayerCountRequest(socket: Socket): void {
  const { room } = findPlayerRoom(socket.id);
  const numPlayers = room ? room.numPlayers : 6; //default fallback
  
  console.log(`Sending playerCountResponse with ${numPlayers} players to ${socket.id}`);
  socket.emit("playerCountResponse", { numPlayers });
}

function handleCreateRoom(socket: Socket, numPlayers: number): void {
  const code = generateRoomCode();
  
  rooms[code] = {
    code,
    numPlayers,
    players: [socket.id],
    game: new GameMath(),
  };
  
  activateRoomPaddles(rooms[code]);
  
  socket.join(code);
  socket.emit("roomCreated", { code, numPlayers });
  
  console.log(`Room ${code} created for ${numPlayers} players by ${socket.id}`);
}

function handleJoinRoom(socket: Socket, code: string): void {
  const room = rooms[code];
  
  if (!room) {
    socket.emit("error", { message: "Room not found" });
    return;
  }
  
  if (room.players.length >= room.numPlayers) {
    socket.emit("error", { message: "Room is full" });
    return;
  }
  
  room.players.push(socket.id);
  socket.join(code);
  
  console.log(`Player ${socket.id} joined room ${code} (${room.players.length}/${room.numPlayers})`);
  
  socket.emit("roomJoined", { code, numPlayers: room.numPlayers });
  io.to(code).emit("playerCount", { count: room.players.length, numPlayers: room.numPlayers });
  
  //Start game if room is full
  if (room.players.length === room.numPlayers) {
    console.log(`Room ${code} is full, starting game!`);
    io.to(code).emit("gameStart", { code, numPlayers: room.numPlayers });
    
    //Send initial game state to all players
    setTimeout(() => {
      room.game.update(); // Initialize the game state
      io.to(code).emit("gameState", { gameState: room.game.getState() });
      console.log(`Sent initial game state to room ${code}`);
    }, 1000); //Give clients time to set up their scenes
  }
}

function handleQuickplay(socket: Socket): void {
  //Find available 6-player room
  let roomId = Object.keys(rooms).find(
    id => rooms[id].numPlayers === 6 && !rooms[id].code && rooms[id].players.length < 6
  );
  
  //Create new room if none available
  if (!roomId) {
    roomId = Math.random().toString(36).substr(2, 9);
    rooms[roomId] = {
      code: null,
      numPlayers: 6,
      players: [],
      game: new GameMath(),
    };
    
    activateRoomPaddles(rooms[roomId]);
    console.log(`Created new quickplay room: ${roomId}`);
  }
  
  rooms[roomId].players.push(socket.id);
  socket.join(roomId);
  
  console.log(`Player ${socket.id} joined quickplay room ${roomId} (${rooms[roomId].players.length}/6)`);
  
  socket.emit("roomJoined", { code: roomId, numPlayers: 6 });
  io.to(roomId).emit("playerCount", { count: rooms[roomId].players.length, numPlayers: 6 });
  
  //Start game if room is full
  if (rooms[roomId].players.length === 6) {
    console.log(`Quickplay room ${roomId} is full, starting game!`);
    io.to(roomId).emit("gameStart", { code: roomId, numPlayers: 6 });
  }
}

function handleDisconnect(socket: Socket): void {
  console.log(`Socket ${socket.id} disconnected`);
  
  for (const code in rooms) {
    const room = rooms[code];
    const playerIndex = room.players.indexOf(socket.id);
    
    if (playerIndex !== -1) {
      room.players.splice(playerIndex, 1);
      console.log(`Player ${socket.id} removed from room ${code} (${room.players.length}/${room.numPlayers} remaining)`);
      
      // Notify remaining players
      io.to(code).emit("playerCount", { count: room.players.length, numPlayers: room.numPlayers });
      
      // Clean up empty room
      cleanupRoom(code);
      break;
    }
  }
}

// Main Socket Connection Handler
io.on("connection", (socket: Socket) => {
  console.log(`Socket connected: ${socket.id}`);
  
  // Input handling
  socket.on("SendInputsToBackend", ({ input }: { input: any }) => {
    handlePlayerInput(socket, input);
  });
  
  // Player count requests
  socket.on("playerCountRequest", () => {
    handlePlayerCountRequest(socket);
  });
  
  // Room management
  socket.on("createRoom", ({ numPlayers }: { numPlayers: number }) => {
    handleCreateRoom(socket, numPlayers);
  });
  
  socket.on("joinRoom", ({ code }: { code: string }) => {
    handleJoinRoom(socket, code);
  });
  
  socket.on("quickplay", () => {
    handleQuickplay(socket);
  });
  
  // Disconnect handling
  socket.on("disconnect", () => {
    handleDisconnect(socket);
  });
});

console.log("Game server listening on port 8081");