/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game_server.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/06 18:59:03 by yohan             #+#    #+#             */
/*   Updated: 2025/11/10 15:51:56 by yohan         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { Server, Socket } from "socket.io";
import { GameMath } from "./game/pong/pong_logic";
import * as dotenv from "dotenv";
import { neural_intercept, state_intercept } from "./AI/neural_network";


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
  chat?: {
    messages: ChatMessage[];
  };
  announced?: Record<string, boolean>; // socketId -> announced join system msg
  AI_bot?: neural_intercept | null;
};

const rooms: { [code: string]: Room } = {};

type ChatMessage = {
  id: string;
  from: string; // socket.id or "system"
  fromName?: string; // username resolved from identification
  text: string;
  ts: number; // epoch ms
  system?: boolean;
  dm?: boolean;
  to?: string; // target socket for dm
};

// Keep a simple mapping of socket.id -> username (provided by client after auth)
const socketUsername: Record<string, string> = {};
// Track all online-identified users (can be outside rooms)
const onlineUsers: Record<string, string> = {};
// Simple per-socket block lists: who each user has blocked
const blockMap: Record<string, Set<string>> = {};

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
        chat: { messages: [] },
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
      broadcastRoster(roomCode);
      // chat system messages
      pushAndBroadcastChat(roomCode, { id: genMsgId(), from: "system", text: `Match ${matchId} started`, ts: Date.now(), system: true });
      pushAndBroadcastChat(roomCode, { id: genMsgId(), from: "system", text: `Players: ${p1.substring(0,6)} vs ${p2.substring(0,6)}`, ts: Date.now(), system: true });

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
          chat: { messages: [] },
        };
        activateRoomPaddles(rooms[roomCode]);

        const s1 = this.io.sockets.sockets.get(p1 as any) as Socket | undefined;
        const s2 = this.io.sockets.sockets.get(p2 as any) as Socket | undefined;
        s1?.join(roomCode);
        s2?.join(roomCode);
        s1?.emit("roomJoined", { code: roomCode, numPlayers: 2 });
        s2?.emit("roomJoined", { code: roomCode, numPlayers: 2 });
        this.io.to(roomCode).emit("playerCount", { count: 2, numPlayers: 2 });
        broadcastRoster(roomCode);
        // chat system messages
        pushAndBroadcastChat(roomCode, { id: genMsgId(), from: "system", text: `Next round match ${matchId} started`, ts: Date.now(), system: true });
        pushAndBroadcastChat(roomCode, { id: genMsgId(), from: "system", text: `Players: ${p1.substring(0,6)} vs ${p2.substring(0,6)}`, ts: Date.now(), system: true });

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

function rosterFor(room: Room) {
  const players = room.players.map((sid) => ({ id: sid, name: socketUsername[sid] || sid.slice(0, 6) }));
  // online but not in this room
  const online: Array<{ id: string; name: string }> = [];
  for (const [sid, name] of Object.entries(onlineUsers)) {
    if (!room.players.includes(sid)) {
      online.push({ id: sid, name: name || sid.slice(0, 6) });
    }
  }
  return { players, online };
}

function broadcastRoster(roomCode: string) {
  const room = rooms[roomCode];
  if (!room) return;
  const { players, online } = rosterFor(room);
  io.to(roomCode).emit("chat:roster", { players, online });
}

function broadcastRosterAllRooms() {
  for (const code of Object.keys(rooms)) {
    broadcastRoster(code);
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

  const aiIdx = room.players.indexOf('AI_PLAYER' + roomCode);
  const AIpaddle = room.game.paddles[aiIdx];
  if (aiIdx !== -1 && room.AI_bot) {
    const curState = room.game.getState();
    const state: state_intercept = room.AI_bot.getState(curState.ball.pos.x, curState.ball.pos.y, curState.ball.pos.z, 
                                    curState.ball.velocity.x, curState.ball.velocity.y, curState.ball.velocity.z, 
                                    curState.paddles[aiIdx].x, curState.paddles[aiIdx].y, 
                                    curState.paddles[aiIdx].speed,
                                    curState.paddles[aiIdx].height, curState.paddles[aiIdx].height, //width and height are the same
                                    100, 100, 100
                                    );
    const action = room.AI_bot.predict(state);
    if (AIpaddle && AIpaddle.active) {
      AIpaddle.up = action.includes('up') ? 1 : 0;
      AIpaddle.down = action.includes('down') ? 1 : 0;
      AIpaddle.left = action.includes('left') ? 1 : 0;
      AIpaddle.right = action.includes('right') ? 1 : 0;
    }
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

export function handleCreateRoom(socket: Socket, numPlayers: number, isSinglePlayer: boolean): void {
  const code = generateRoomCode();
  rooms[code] = {
    code,
    numPlayers,
    players: [socket.id],
    game: new GameMath(),
    chat: { messages: [] },
    announced: {},
  };
  if (isSinglePlayer) {
    rooms[code].players.push('AI_PLAYER' + code);
    rooms[code].AI_bot = new neural_intercept(0.1);
    rooms[code].AI_bot.loadFromFile('./AI/best_ai_weights_wall_bounces.json');
    try {
      rooms[code].AI_bot.loadFromFile('./AI/best_ai_weights_wall_bounces.json');
      console.log(`AI loaded successfully for room ${code}`);
    } catch (err) {
      console.error(`Failed to load AI weights:`, err);
    }
    
    // Activate both paddles
    rooms[code].game.paddles[0].active = 1;
    rooms[code].game.paddles[1].active = 1;
    
    // Mark room as having correct player count
    rooms[code].numPlayers = 2; // Change to 2 so game can start
  }
  else
    activateRoomPaddles(rooms[code]);
  
  socket.join(code);
  socket.emit("roomCreated", { code: code, numPlayers });
  // chat: system join message
  // Defer readable join/create announcements until identify provides username.
  broadcastRoster(code);
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
  // ensure chat exists and refresh roster
  room.chat = room.chat || { messages: [] };
  room.announced = room.announced || {};
  broadcastRoster(code);
  
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
        chat: { messages: [] },
        announced: {},
    };
    
    activateRoomPaddles(rooms[roomId]);
    console.log(`Created new quickplay room: ${roomId}`);
  }
  
  rooms[roomId].players.push(socket.id);
  socket.join(roomId);
  
  console.log(`Player ${socket.id} joined quickplay room ${roomId} (${rooms[roomId].players.length}/6)`);
  
  socket.emit("roomJoined", { code: roomId, numPlayers: 6 });
  io.to(roomId).emit("playerCount", { count: rooms[roomId].players.length, numPlayers: 6 });
  broadcastRoster(roomId);
  
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
      // chat system message with best-known name
      const name = socketUsername[socket.id] || socket.id.substring(0, 6);
      pushAndBroadcastChat(code, {
        id: genMsgId(),
        from: "system",
        text: `Player ${name} left`,
        ts: Date.now(),
        system: true,
      });
      
      // Notify remaining players
      io.to(code).emit("playerCount", { count: room.players.length, numPlayers: room.numPlayers });
      broadcastRoster(code);
      
      // Clean up empty room
      cleanupRoom(code);
      break;
    }
  }
}

// =====================
// Chat helpers & events
// =====================

function genMsgId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function pushAndBroadcastChat(roomKey: string, msg: ChatMessage) {
  const room = rooms[roomKey];
  if (!room) return;
  room.chat = room.chat || { messages: [] };
  // cap history
  room.chat.messages.push(msg);
  if (room.chat.messages.length > 100) {
    room.chat.messages.splice(0, room.chat.messages.length - 100);
  }
  io.to(roomKey).emit("chat:new", msg);
}

function handleChatSend(socket: Socket, payload: { text: string }) {
  const text = (payload?.text || "").toString().trim();
  if (!text) return;
  if (text.length > 300) {
    // enforce max length
    return;
  }
  const { roomCode } = findPlayerRoom(socket.id);
  if (!roomCode) return;
  const msg: ChatMessage = {
    id: genMsgId(),
    from: socket.id,
    fromName: socketUsername[socket.id],
    text,
    ts: Date.now(),
  };
  pushAndBroadcastChat(roomCode, msg);
}

function handleChatHistory(socket: Socket) {
  const { roomCode, room } = findPlayerRoom(socket.id);
  if (!roomCode || !room) return;
  socket.emit("chat:history", { messages: (room.chat?.messages || []).slice(-50) });
}

function handleChatIdentify(socket: Socket, payload: { username?: string }) {
  const raw = (payload?.username || "").toString().trim();
  if (!raw) return;
  // Simple sanitize: restrict to printable, length constraints
  const safe = raw.substring(0, 24);
  socketUsername[socket.id] = safe;
  onlineUsers[socket.id] = safe;
  const { roomCode, room } = findPlayerRoom(socket.id);
  if (roomCode && room) {
    room.announced = room.announced || {};
    if (!room.announced[socket.id]) {
      room.announced[socket.id] = true;
      pushAndBroadcastChat(roomCode, {
        id: genMsgId(),
        from: "system",
        text: `Player ${safe} joined`,
        ts: Date.now(),
        system: true,
      });
    }
    broadcastRoster(roomCode);
  }
  // update presence for all rooms as well
  broadcastRosterAllRooms();
}

function handleChatDM(socket: Socket, payload: { to: string; text: string }) {
  const text = (payload?.text || "").toString().trim();
  const to = (payload?.to || "").toString();
  if (!text || !to) return;
  if (text.length > 300) return;
  // Cross-room DM allowed: just require target to be connected
  const targetSocket = io.sockets.sockets.get(to as any) as Socket | undefined;
  if (!targetSocket) {
    socket.emit('chat:dmError', { message: 'User not reachable.' });
    return;
  }
  // Server-side block enforcement: do not deliver if either party blocks the other
  const senderBlockedTarget = !!blockMap[socket.id]?.has(to);
  const targetBlockedSender = !!blockMap[to]?.has(socket.id);
  if (senderBlockedTarget) {
    socket.emit('chat:dmError', { message: 'You have blocked this user.' });
    return;
  }
  if (targetBlockedSender) {
    socket.emit('chat:dmError', { message: 'This user has blocked you.' });
    return;
  }
  const msg: ChatMessage = {
    id: genMsgId(),
    from: socket.id,
    fromName: socketUsername[socket.id],
    to,
    text,
    ts: Date.now(),
    dm: true,
  };
  // deliver only to sender and recipient
  socket.emit("chat:new", msg);
  io.to(to).emit("chat:new", msg);
}

function handleChatInvite(socket: Socket, payload: { to?: string; username?: string }) {
  const { roomCode, room } = findPlayerRoom(socket.id);
  if (!roomCode || !room) {
    socket.emit("chat:inviteError", { message: "You're not in a room." });
    return;
  }
  if (room.players.length >= room.numPlayers) {
    socket.emit("chat:inviteError", { message: "Room is full." });
    return;
  }
  let targetId: string | undefined;
  if (payload?.to && io.sockets.sockets.has(payload.to as any)) {
    targetId = payload.to;
  } else if (payload?.username) {
    // exact match on stored username
    for (const [sid, name] of Object.entries(socketUsername)) {
      if (name === payload.username) { targetId = sid; break; }
    }
  }
  if (!targetId) {
    socket.emit("chat:inviteError", { message: "User not found or offline." });
    return;
  }
  if (room.players.includes(targetId)) {
    socket.emit("chat:inviteError", { message: "User is already in this room." });
    return;
  }
  const targetSocket = io.sockets.sockets.get(targetId as any) as Socket | undefined;
  if (!targetSocket) {
    socket.emit("chat:inviteError", { message: "User not reachable." });
    return;
  }
  // Provide a join code: use public code if available, otherwise use room key
  const joinCode = rooms[roomCode].code ?? roomCode;
  targetSocket.emit("chat:invited", {
    fromId: socket.id,
    fromName: socketUsername[socket.id] || socket.id.substring(0,6),
    code: joinCode,
    numPlayers: room.numPlayers,
    currentCount: room.players.length,
  });
  socket.emit("chat:inviteSent", { to: targetId, toName: socketUsername[targetId] || targetId.substring(0,6) });
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
  socket.on("createRoom", ({ numPlayers, isSinglePlayer }: { numPlayers: number, isSinglePlayer: boolean }) => {
    handleCreateRoom(socket, numPlayers, isSinglePlayer);
  });
  
  socket.on("joinRoom", ({ code }: { code: string }) => {
    handleJoinRoom(socket, code);
  });
  
  socket.on("quickplay", () => {
    handleQuickplay(socket);
  });
  
  // Chat events
  socket.on("chat:send", (payload: { text: string }) => handleChatSend(socket, payload));
  socket.on("chat:history", () => handleChatHistory(socket));
  socket.on("chat:identify", (payload: { username?: string }) => handleChatIdentify(socket, payload));
  socket.on("presence:identify", (payload: { username?: string }) => {
    const raw = (payload?.username || "").toString().trim();
    if (!raw) return;
    const safe = raw.substring(0, 24);
    socketUsername[socket.id] = safe;
    onlineUsers[socket.id] = safe;
    broadcastRosterAllRooms();
  });
  socket.on("chat:dm", (payload: { to: string; text: string }) => handleChatDM(socket, payload));
  socket.on("chat:invite", (payload: { to?: string; username?: string }) => handleChatInvite(socket, payload));
  socket.on('chat:block', (payload: { target: string; block: boolean }) => {
    const tgt = (payload?.target || '').toString();
    const doBlock = !!payload?.block;
    if (!tgt || tgt === socket.id) return;
    if (!blockMap[socket.id]) blockMap[socket.id] = new Set<string>();
    if (doBlock) blockMap[socket.id].add(tgt); else blockMap[socket.id].delete(tgt);
  });

  socket.on("joinTournament", () => {
  tournamentManager.joinTournament(socket.id);
  });

  // Disconnect handling
  socket.on("disconnect", () => {
  handleDisconnect(socket);
  tournamentManager.handleDisconnect(socket.id);
  // clean username mapping
  delete socketUsername[socket.id];
  delete onlineUsers[socket.id];
  delete blockMap[socket.id];
  broadcastRosterAllRooms();
  });
});

console.log("Game server listening on port 8081");