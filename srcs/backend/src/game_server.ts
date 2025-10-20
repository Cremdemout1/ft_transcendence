/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game_server.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: gcapa-pe <gcapa-pe@student.42lisboa.com    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/06 18:59:03 by yohan             #+#    #+#             */
/*   Updated: 2025/10/20 14:14:58 by gcapa-pe         ###   ########.fr       */
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
  inProgress?: boolean;
  tournamentId?: string | null;
  matchId?: string | null;
};

const rooms: { [code: string]: Room } = {};

// Simple tournament manager for single-elimination 8-player tournaments
class TournamentManager {
  io: Server;
  waitingPlayers: string[] = [];
  tournaments: { [id: string]: any } = {};

  constructor(ioInstance: Server) {
    this.io = ioInstance;
  }

  joinTournament(socketId: string) {
    if (this.waitingPlayers.includes(socketId)) return;
    this.waitingPlayers.push(socketId);
    console.log(`Player ${socketId} joined tournament queue (${this.waitingPlayers.length}/8)`);
    // notify clients about updated queue
    this.io.emit("tournamentQueueUpdate", { waitingCount: this.waitingPlayers.length, waitingPlayers: this.waitingPlayers.slice() });
    if (this.waitingPlayers.length >= 8) {
      const players = this.waitingPlayers.splice(0, 8);
      // notify queue change (players removed for tournament)
      this.io.emit("tournamentQueueUpdate", { waitingCount: this.waitingPlayers.length, waitingPlayers: this.waitingPlayers.slice() });
      this.startTournament(players);
    }
  }

  startTournament(playerIds: string[]) {
    const tid = `T-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    console.log(`Starting tournament ${tid} with players:`, playerIds);
    const tournament: any = {
      id: tid,
      players: playerIds.slice(),
      rounds: [],
      activeMatches: {},
    };
    this.tournaments[tid] = tournament;

    // notify the players that their tournament is starting
    playerIds.forEach((pid) => {
      const s = this.io.sockets.sockets.get(pid as any) as Socket | undefined;
      s?.emit("tournamentStarted", { tournamentId: tid, players: playerIds });
    });

  // Create first round matches (1v1): pairs [0,1],[2,3],[4,5],[6,7]
    for (let i = 0; i < 8; i += 2) {
      const p1 = playerIds[i];
      const p2 = playerIds[i + 1];
      const roomCode = generateRoomCode();
      const matchId = `${tid}-m${i / 2}`;

      rooms[roomCode] = {
        code: roomCode,
        numPlayers: 2,
        players: [p1, p2],
        game: new GameMath(),
        inProgress: true,
        tournamentId: tid,
        matchId,
      };
      activateRoomPaddles(rooms[roomCode]);

      // put sockets into the room if they are connected
      const s1 = this.io.sockets.sockets.get(p1 as any) as Socket | undefined;
      const s2 = this.io.sockets.sockets.get(p2 as any) as Socket | undefined;
      s1?.join(roomCode);
      s2?.join(roomCode);

      s1?.emit("roomJoined", { code: roomCode, numPlayers: 2 });
      s2?.emit("roomJoined", { code: roomCode, numPlayers: 2 });
      this.io.to(roomCode).emit("playerCount", { count: 2, numPlayers: 2 });

      // Save match metadata
      tournament.activeMatches[roomCode] = { players: [p1, p2], winner: null, matchId };

      // start match after small delay
      setTimeout(() => {
        this.io.to(roomCode).emit("gameStart", { code: roomCode, numPlayers: 2 });
        // send initial state
        try {
          rooms[roomCode].game.update();
          this.io.to(roomCode).emit("gameState", { gameState: rooms[roomCode].game.getState() });
        } catch (e) {
          console.error("Error initializing match game state", e);
        }
      }, 500);
    }
  }

  handleMatchOver(roomCode: string, winnerIdx: number) {
    const room = rooms[roomCode];
    if (!room || !room.tournamentId) return;
    const tid = room.tournamentId;
    const tournament = this.tournaments[tid];
    if (!tournament) return;

  const matchMeta = tournament.activeMatches[roomCode];
    if (!matchMeta) return;
    if (matchMeta.winner) return; // already handled

    const winnerSocketId = room.players[winnerIdx];
    matchMeta.winner = winnerSocketId;
    console.log(`Tournament ${tid} match ${roomCode} finished. Winner: ${winnerSocketId}`);

    // remove both players from the room
    room.players.forEach((pid) => {
      const s = this.io.sockets.sockets.get(pid as any) as Socket | undefined;
      s?.leave(roomCode);
    });

    // keep room entry but mark not in progress
    room.inProgress = false;

    // check if all active matches of this round have winners
    const roundWinners = Object.values(tournament.activeMatches)
      .map((m: any) => m.winner)
      .filter((w: any) => w !== null);

    // if round complete
    if (roundWinners.length === Object.keys(tournament.activeMatches).length) {
      const winnerIds: string[] = Object.values(tournament.activeMatches).map((m: any) => m.winner);
      // prepare next round
      if (winnerIds.length === 1) {
        // tournament finished
        const champion = winnerIds[0];
        console.log(`Tournament ${tid} champion: ${champion}`);
        // notify all original players
        tournament.players.forEach((pid: string) => {
          const s = this.io.sockets.sockets.get(pid as any) as Socket | undefined;
          s?.emit("tournamentWinner", { tournamentId: tid, champion });
        });
        // clean up
        delete this.tournaments[tid];
        return;
      }

      // build pairings for next round
      const nextRoundPairs: string[][] = [];
      for (let i = 0; i < winnerIds.length; i += 2) {
        nextRoundPairs.push([winnerIds[i], winnerIds[i + 1]]);
      }

      // clear activeMatches and create new room matches
      tournament.activeMatches = {};
      nextRoundPairs.forEach((pair: string[], idx: number) => {
        const p1 = pair[0];
        const p2 = pair[1];
        const roomCode = generateRoomCode();
        const matchId = `${tid}-r${Date.now()}-m${idx}`;

        rooms[roomCode] = {
          code: roomCode,
          numPlayers: 2,
          players: [p1, p2],
          game: new GameMath(),
          inProgress: true,
          tournamentId: tid,
          matchId,
        };
        activateRoomPaddles(rooms[roomCode]);

        const s1 = this.io.sockets.sockets.get(p1 as any) as Socket | undefined;
        const s2 = this.io.sockets.sockets.get(p2 as any) as Socket | undefined;
        s1?.join(roomCode);
        s2?.join(roomCode);
        s1?.emit("roomJoined", { code: roomCode, numPlayers: 2 });
        s2?.emit("roomJoined", { code: roomCode, numPlayers: 2 });
        this.io.to(roomCode).emit("playerCount", { count: 2, numPlayers: 2 });

        tournament.activeMatches[roomCode] = { players: [p1, p2], winner: null, matchId };

        setTimeout(() => {
          this.io.to(roomCode).emit("gameStart", { code: roomCode, numPlayers: 2 });
          try {
            rooms[roomCode].game.update();
            this.io.to(roomCode).emit("gameState", { gameState: rooms[roomCode].game.getState() });
          } catch (e) {
            console.error("Error initializing next round match game state", e);
          }
        }, 500);
      });
    }
  }

  handleDisconnect(socketId: string) {
    // remove from waiting queue if present
    const idx = this.waitingPlayers.indexOf(socketId);
    if (idx !== -1) {
      this.waitingPlayers.splice(idx, 1);
  // notify clients about updated queue
  this.io.emit("tournamentQueueUpdate", { waitingCount: this.waitingPlayers.length, waitingPlayers: this.waitingPlayers.slice() });
  return;
    }

    // if they were in an active tournament match, find match and award win to opponent
    for (const tid in this.tournaments) {
      const t = this.tournaments[tid];
      for (const roomCode in t.activeMatches) {
        const match = t.activeMatches[roomCode];
        if (match.players.includes(socketId) && !match.winner) {
          const other = match.players.find((p: string) => p !== socketId);
          console.log(`Player ${socketId} disconnected during tournament ${tid} match ${roomCode}. Awarding win to ${other}`);
          // mark winner and trigger next stage
          match.winner = other;
          // ensure room state updated too
          if (rooms[roomCode]) rooms[roomCode].inProgress = false;
          this.handleMatchOver(roomCode, rooms[roomCode].players.indexOf(other));
        }
      }
    }
  }
}

const tournamentManager = new TournamentManager(io);

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
  // detect match winner and notify tournament manager
  const state = room.game.getState();
  if (typeof state.winner === "number" && state.winner >= 0) {
    const winnerIdx = state.winner;
    const winnerSocketId = room.players[winnerIdx] || null;
    console.log(`Match over in room ${roomCode}. Winner idx=${winnerIdx}, socket=${winnerSocketId}`);
    io.to(roomCode).emit("matchOver", { winner: winnerIdx, winnerSocketId });
    room.inProgress = false;
    // notify tournament manager if this room belongs to a tournament
    if (room.tournamentId) {
      tournamentManager.handleMatchOver(roomCode, winnerIdx);
    }
  }
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


function handlePlayerIDRequest(socket: Socket): void {
  const { room } = findPlayerRoom(socket.id);
  
	const playerIdx = room? room.players.indexOf(socket.id) : -1;
  
  console.log(`Sending playerID with ${playerIdx} players to ${socket.id}`);
  socket.emit("playerIDResponse", { playerIdx });
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

    socket.on("playerIDRequest", () => {
    handlePlayerIDRequest(socket);
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
  
  socket.on("joinTournament", () => {
  tournamentManager.joinTournament(socket.id);
  });

  // Disconnect handling
  socket.on("disconnect", () => {
  handleDisconnect(socket);
  tournamentManager.handleDisconnect(socket.id);
  });
});

console.log("Game server listening on port 8081");