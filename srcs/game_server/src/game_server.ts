/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game_server.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/06 18:59:03 by yohan             #+#    #+#             */
/*   Updated: 2025/11/26 16:51:44 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { Server, Socket } from "socket.io";
import { GameMath } from "./game/pong/pong_logic";
import * as dotenv from "dotenv";
import { neural_intercept, state_intercept, neural_ai, state } from "./AI/yohai";
import { sample_data, Layer_Dense, relu, softmax, LoadWeights, oheToDiscreet } from "./AI/phantai";

import { reactive_model } from "./AI/urmom";

export let urmom: state_intercept;
export let urmom1: neural_intercept;
export let urmom2: neural_ai;

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
  playerUsernames: Map<string, string>;
  game: GameMath;
  inProgress?: boolean;
  tournamentId?: string | null;
  isSinglePlayer?: number;
  matchId?: string | null;
  ai_bot?: reactive_model;
  phantai?: number | null;
  ai_timer?: NodeJS.Timeout | null;
  actionTimer?: NodeJS.Timeout | null;
  interval?: number | null;
  vanilla?: number | null;
  chat?: {
    messages: ChatMessage[];
  };
  announced?: Record<string, boolean>; // socketId -> announced join system msg
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
  waitingPlayersUsernames: string[] = [];
  tournaments: { [id: string]: any } = {};

  constructor(ioInstance: Server) {
    this.io = ioInstance;
  }

  joinTournament(socketId: string, username: string) {
    if (this.waitingPlayers.includes(socketId)) return;
    this.waitingPlayers.push(socketId);
    this.waitingPlayersUsernames.push(username);

    console.log(`Player ${socketId} joined tournament queue (${this.waitingPlayers.length}/8)`);
    // notify clients about updated queue
    this.io.emit("tournamentQueueUpdate", { waitingCount: this.waitingPlayers.length, waitingPlayers: this.waitingPlayers.slice() });
    if (this.waitingPlayers.length >= 8) {
      const players = this.waitingPlayers.splice(0, 8);
      const playerUsernames = this.waitingPlayersUsernames.splice(0, 8);
      // notify queue change (players removed for tournament)
      this.io.emit("tournamentQueueUpdate", { waitingCount: this.waitingPlayers.length, waitingPlayers: this.waitingPlayers.slice() }); //usernames not needed
      this.startTournament(players, playerUsernames);
    }
  }

  startTournament(playerIds: string[], playerUsernames: string[]) {
    const tid = `T-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    console.log(`Starting tournament ${tid} with players:`, playerIds);
    const tournament: any = {
      id: tid,
      players: playerIds.slice(),
      playerUsernames: playerUsernames.slice(),
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
      const user1 = playerUsernames[i];
      const p2 = playerIds[i + 1];
      const user2 = playerUsernames[i + 1];
      const roomCode = generateRoomCode();
      const matchId = `${tid}-m${i / 2}`;

      rooms[roomCode] = {
        code: roomCode,
        numPlayers: 2,
        players: [p1, p2],
        playerUsernames: new Map(),
        game: new GameMath(),
        inProgress: true,
        tournamentId: tid,
        matchId,
        chat: { messages: [] },
      };
      activateRoomPaddles(rooms[roomCode]);

      rooms[roomCode].playerUsernames.set(p1, user1);
      rooms[roomCode].playerUsernames.set(p2, user2);
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
      const winnerUsernames = winnerIds.map((item: string) => {
        room.playerUsernames.get(item);
      });
      // prepare next round
      if (winnerIds.length === 1) {
        // tournament finished
        const champion = winnerUsernames[0];
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
        const user1 = room.playerUsernames.get(p1);
        const p2 = pair[1];
        const user2 = room.playerUsernames.get(p2);
        const roomCode = generateRoomCode();
        const matchId = `${tid}-r${Date.now()}-m${idx}`;

        rooms[roomCode] = {
          code: roomCode,
          numPlayers: 2,
          players: [p1, p2],
          playerUsernames: new Map(),
          game: new GameMath(),
          inProgress: true,
          tournamentId: tid,
          matchId,
          chat: { messages: [] },
        };
        activateRoomPaddles(rooms[roomCode]);
        rooms[roomCode].playerUsernames.set(p1, user1!);
        rooms[roomCode].playerUsernames.set(p2, user2!);
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
      this.waitingPlayersUsernames.splice(idx, 1);
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
async function handlePlayerInput(socket: Socket, input: any, input2: any){
  const { roomCode, room } = findPlayerRoom(socket.id);
  
  if (!roomCode || !room) {
    // console.log(`Player ${socket.id} not found in any room`);
    return;
  }
  
  const playerIdx = room.players.indexOf(socket.id);
  if (playerIdx === -1) {
    console.log(`Player ${socket.id} index not found in room ${roomCode}`);
    return;
  }
  
  //Assign input to the correct paddle
  let paddle = room.game.paddles[playerIdx];
  if (paddle && paddle.active) {
    paddle.up = input.up;
    paddle.down = input.down;
    paddle.left = input.left;
    paddle.right = input.right;
  }

if(room.vanilla==1)
  {
	paddle = room.game.paddles[1];
  if (paddle && paddle.active) {
    paddle.up = input2.up;
    paddle.down = input2.down;
    paddle.left = input2.left;
    paddle.right = input2.right;
  }
  }
  
  //Update game state
  await room.game.update();
  // const AIidx = room.players.indexOf("AI-" + room.code);
  // const paddleAI = room.game.paddles[AIidx];
  // if (paddleAI && paddle.active) {
  //   paddleAI.up = 0;
  //   paddleAI.down = 0;
  //   paddleAI.left = 0;
  //   paddleAI.right = 0;
  // }
  //Send game state only to players in this specific room
  io.to(roomCode).emit("gameState", { gameState: room.game.getState() });
  // detect match winner and notify tournament manager
  const state = room.game.getState();
  if (typeof state.winner === "number" && state.winner >= 0) {
    const winnerIdx = state.winner;
    const winnerSocketId = room.players[winnerIdx] || null;
    console.log(`Match over in room ${roomCode}. Winner idx=${winnerIdx}, socket=${winnerSocketId}`);
    const username = room.playerUsernames.get(winnerSocketId!);
    io.to(roomCode).emit("matchOver", { username });
    room.inProgress = false;
    // notify tournament manager if this room belongs to a tournament
    if (room.tournamentId) {
      tournamentManager.handleMatchOver(roomCode, winnerIdx);
    }
  }
  if(room.game.getState().hit==1)
  {
	// console.log("SERVER:")
	// console.log(room.game.getState());
	i++;
	// console.log("i: "+i);
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


function handleVanillaRequest(socket: Socket): void {
  const { room } = findPlayerRoom(socket.id);
  
	const vanilla = room? room.vanilla : -1;
  
  console.log(`Sending vanilla :${vanilla} to ${socket.id}`);
  socket.emit("vanillaResponse", { vanilla });
}

function handleAIRequest(socket: Socket): void {
  const { room } = findPlayerRoom(socket.id);
  let AI: number = -1;

  if (room && room.isSinglePlayer! >= 0 && room.isSinglePlayer! < 3)
    AI = room.isSinglePlayer!;
  console.log(room);
  
  console.log(`Sending AI :${AI} to ${socket.id}`);
  socket.emit("AIResponse", { AI });
}

// function handleRoomRequest(socket: Socket): void {
//   const { room } = findPlayerRoom(socket.id);
  
//   console.log(`Sending room :${room} to ${socket.id}`);
//   socket.emit("roomResponse", { room });
// }

function handleCreateRoom(socket: Socket, numPlayers: number, alias: string): void {
  const code = generateRoomCode();

  rooms[code] = {
    code,
    numPlayers,
    players: [socket.id],
    playerUsernames: new Map(),
    game: new GameMath(),
    chat: { messages: [] },
    announced: {},
    isSinglePlayer: 0,
    vanilla: 0
  };
  rooms[code].playerUsernames.set(socket.id, alias);
  activateRoomPaddles(rooms[code]);
  
  socket.join(code);
  socket.emit("roomCreated", { code, numPlayers });
  // chat: system join message
  // Defer readable join/create announcements until identify provides username.
  broadcastRoster(code);
  
  console.log(`Multiplayer Room ${code} created for ${numPlayers} players by ${socket.id}`);
}

async function setTimer(room: Room, paddle: any) {
  if (!room.interval)
      return ;
  room.actionTimer = setTimeout(() => {
    if(!room.inProgress) {
      if (room.ai_timer)
        clearInterval(room.ai_timer);
      room.actionTimer = null;
      return ;
    }
      paddle.up = 0;
      paddle.down = 0;
      paddle.left = 0;
      paddle.right = 0;
      console.log("hold of timer inside set timer: ", room.interval);
  }, room.interval); // make this proportional
};

export async function run_ai(room: Room) {
  const AIidx = room.players.indexOf("AI-" + room.code);
  const AI_Paddle = room.game.paddles[AIidx];

  room.ai_timer = setInterval(() => {
    if(!room.inProgress) {
      if (room.ai_timer)
        clearInterval(room.ai_timer);
      room.ai_timer = null;
      return ;
    }
    const curState = room.game.getState();
    if (!room.ai_bot || typeof room.ai_bot === "number")
      return ;
    getTimeToHold(room, 2);
    if (!room.interval)
        room.interval = 100;
    // set timer(variable)
    setTimer(room, AI_Paddle);
    const state: state =  {
      X_pos : -curState.ball.pos.z,
      Y_pos : curState.ball.pos.y,
      Z_pos : -curState.ball.pos.x,
      Vx : -curState.ball.velocity.z,
      Vy : curState.ball.velocity.y,
      Vz : -curState.ball.velocity.x,
      X_paddle : curState.paddles[AIidx].x,
      Y_paddle : curState.paddles[AIidx].y,
      paddle_speed :  curState.paddles[AIidx].speed,
      paddle_width : curState.paddles[AIidx].height,
      paddle_height : curState.paddles[AIidx].height
    }
    const action = room.ai_bot.predict(state);
    if (AI_Paddle && AI_Paddle.active) {
      AI_Paddle.up = action.includes('up') ? 1 : 0;
      AI_Paddle.down = action.includes('down') ? 1 : 0;
      AI_Paddle.left = action.includes('left') ? 1 : 0;
      AI_Paddle.right = action.includes('right') ? 1 : 0;
    }
    console.log("paddle AI update", action);
    }, 1000);
}

function getTimeToHold(room: Room, ai_type: number) {

  let timeToHold = 0;
  let state=room.game.getState();
  let distX = (-state.ball.pos.z)-state.paddles[1].x;
  let distY = state.ball.pos.y-state.paddles[1].y;
  let distZ = (-room.game.getState().ball.pos.x)-50;
  let true_dist = Math.sqrt(Math.pow(distX, 2)+Math.pow(distY, 2)+Math.pow(distZ, 2));
  let norm_dist=true_dist*10; // 10 comes from 1000 / 100
  let MAX_TIME = 0;
  let k = 0;
  if (ai_type === 2) { //yohai
    MAX_TIME = 750;
    k = 0.01; // curve strength
  }
  else { //phantai
    MAX_TIME = 800;
    k = 0.001; // curve strength
  }
  timeToHold = MAX_TIME * (1 - Math.exp(-k * norm_dist));
  room.interval = timeToHold;
}

export async function run_phantai(room: Room) {
  const AIidx = room.players.indexOf("AI-" + room.code);
  const AI_Paddle = room.game.paddles[AIidx];
  // await setTimer(room, AI_Paddle);
  room.ai_timer = setInterval(() => {
    if(!room.inProgress) {
      if (room.ai_timer)
        clearInterval(room.ai_timer);
      room.ai_timer = null;
      return ;
    }
    const curState = room.game.getState();
    if (!room.phantai)
      return ;
    getTimeToHold(room, 1);
    if (!room.interval)
        room.interval = 100;
    // set timer(variable)
    setTimer(room, AI_Paddle);
    let samples = sample_data(0, curState);
    let fixed= samples[0].map((input) => input.map((nbr, idx) => {
	  if(idx<3 || idx > 5) return nbr/50;
	  else return nbr/0.5;
    }));
    let layer1 = new Layer_Dense(8, 64, relu);
    let layer2 = new Layer_Dense(64, 32, relu);
    let layer3 = new Layer_Dense(32, 9, softmax);
    LoadWeights(layer1, layer2, layer3);
    layer1.forward(fixed);
	  layer2.forward(layer1.output);
	  layer3.forward(layer2.output);
    let action= oheToDiscreet(layer3.output);
    let move:number=8;
	  action.map((item, idx) => {
		if(item==1)
      move=idx;
	  });
    const actions = ["up", "up-left", "left", "left-down", "down", "right-down", "right", "up-right", "none"];
    
    if (AI_Paddle && AI_Paddle.active) {
      AI_Paddle.up = actions[move].includes('up') ? 1 : 0;
      AI_Paddle.down = actions[move].includes('down') ? 1 : 0;
      AI_Paddle.left = actions[move].includes('left') ? 1 : 0;
      AI_Paddle.right = actions[move].includes('right') ? 1 : 0;
    }
    console.log("paddle AI update", action);
    }, 1000);
}

function handleSinglePlayerRoom(socket: Socket, ai_type: number, alias: string): void {
  const code = generateRoomCode();

  rooms[code] = {
    code,
    numPlayers: 1,
    players: [socket.id],
    playerUsernames: new Map(),
    isSinglePlayer: 1,
    game: new GameMath(),
    vanilla: 0
  };

  rooms[code].playerUsernames.set(rooms[code].players[0], alias);
  rooms[code].players.push("AI-" + code);

  rooms[code].numPlayers = 2;
  rooms[code].inProgress = true; //might not be necessary
  activateRoomPaddles(rooms[code]);
  if (ai_type === 1) { //phantAI
    rooms[code].playerUsernames.set(rooms[code].players[1], "BOSS_PHANTAI");
    rooms[code].phantai = 1;
    if(rooms[code].phantai) {
      run_phantai(rooms[code]);
    }
  }
  else {
    rooms[code].playerUsernames.set(rooms[code].players[1], "BOSS_YOHAI");
    rooms[code].isSinglePlayer = 2;
    const reactiveAiWeights = {
      "W_hidden_input": [ [49.883014951616495, 57.59245484151263, -0.672577288078086, -4.988903375386864, -4.2386723787104765, -0.3802829464326487, -51.52614743053423, -59.20616069082931, -0.4303144400709679, -0.836430769864361], [1.2544896487429547, 197.73535324613735, 0.7665678664574481, -4.658991689623148, -1.0275278197147089, -0.3451168247239438, -0.5776360566089656, -196.62893288854255, 0.4268622957960812, 2.178145258677974], [-179.34087472924793, 0.7910683310065308, 0.430917659025812, -2.138491954795344, -0.8131762181423372, -0.0842501760791633, 179.23931157143116, -0.33218877304350536, 0.7374233388982616, 2.182871844878219], [-1.8856184881515037, -199.36124730962808, 0.5161760026018247, 0.8775234365777097, -0.40272117552745673, -0.29177826813695046, 0.8619607268262148, 198.7478854316389, 0.7309280007671577, 2.8834162453359533], [-22.76439364124033, 32.17873733260302, 0.4494440089348593, 0.86188829294182, -0.5152416406545638, -0.4242219259814442, 23.772702979567274, -34.243764859067944, -0.4699325899500329, -0.9306503029856132], [71.72902797518802, -24.642572101036187, -1.1887620290793939, -9.351780622359469, 0.6552540092697473, -0.32683117663651295, -72.30544470588285, 25.441351774131114, 0.3086879060488837, -0.07668660919595624], [-75.86308235675678, -0.4165895490075364, -0.36244775911148897, 6.424601071087086, 0.11621691470307739, 0.1961613556401925, 77.37544032562543, 0.4532437288454668, -0.44616262736535484, -0.02955419470821464], [-44.33606741514581, -19.108908886658078, -1.296419481874001, -2.465958212038669, -0.9609409249957751, 0.5266627547411857, 45.25354336023601, 19.976748008530606, -0.6104460885759498, -0.9186865318481638], [-0.07804077496242733, 72.51280099061795, 0.309984489766807, -1.8185226406625477, -8.006314338310663, 0.2903906843349179, 0.5356594697151632, -73.47338763597504, -0.20072560919587434, 0.2319115189972271], [-72.32539836751404, -0.3343070772493475, -1.8389759473381462, 6.595825855476627, -1.2525681143986411, 0.34575120274392274, 73.56232473229731, 0.4193739100963286, 0.29670967561504874, -0.21442011244565481], [-0.9788612006634587, 74.66218463818542, -0.49469581705441, -0.6590369155086644, -9.513810909502904, -0.03753540020625136, 1.6356985209351431, -75.58997750201836, 0.23132947532264617, 0.03111452879686536], [177.40195941476367, 0.4658773873903743, -0.03260172414886233, -0.14706310353610588, 2.705154523570634, -0.4361935311142867, -175.90573614815588, -0.31561629942845354, 0.7062683125035957, 2.003598337173347] ],
      "W_hidden_output": [ [7.650137811102573, 28.039404897503236, 5.0034281208843385, -24.915143573287367, 4.677286371179467, -1.487087071416732, 5.06121575294785, -12.895009491290573, 29.186388229157316, 4.785865184266846, 36.691571141105015, -0.9434390301118122], [-15.660898726172736, -21.008240162682576, 4.730941334452439, 47.51327273551138, -14.753165188227344, 3.2486474605984865, 5.22647463761581, 3.98988568113515, -36.130306788678475, 3.3454049009746254, -36.92460563482108, 0.9537553603313668], [-21.833426872651277, 6.048561276690666, 25.639180582303258, -1.820268485990384, 2.2617664098800105, -34.92158181162808, 35.37173610720054, 11.328544932427679, 5.589795440778212, 29.46619605343566, 5.466222801563043, -26.179762549460573], [7.994094300954188, 6.681789527074746, -23.08051216755152, -1.707366164383075, -8.41021106899765, 23.133544616209996, -41.70796509379141, -13.739103894228753, 4.385943529363188, -38.60011788859233, 3.2122653157480046, 38.716280501162245], [23.312763280984324, 13.77809114628942, -23.553490194543464, -24.743661569690733, 15.763452365600887, 10.922073759428292, -34.09078127136063, -11.427430496838147, 26.113541312072364, -29.681499101416666, 26.15043563723784, 16.879148097042386], [1.3783837853670664, 6.423182230147775, 10.611481172902202, -27.92694051878354, 13.315134531616, -35.44042196900921, 32.815405223856835, 7.909043065128791, 21.457738193267463, 26.09343817837487, 26.61145860257584, -26.093243972085954], [9.04470032104336, -23.4236592621641, -25.312418879770092, 21.758786775896613, -10.08852907455972, 37.191439037956776, -37.582669029770706, 4.477255457845394, -25.267907761399524, -26.665544267739953, -37.4118193430129, 24.865196663899045], [-13.31186254876307, -23.273537271180807, 20.195651546093753, 14.550994272356446, 1.5106204021670486, -3.672663489939727, 29.813102077792617, 12.9468136233758, -30.259023400757105, 27.76952817779629, -29.44378473313456, -28.714418230692747], [1.286665549347282, 6.844193227729, 5.26477226576454, -1.2665222266506841, -4.3434847899240205, 1.2258976748809034, 4.359527843784567, -2.966274821403714, 5.032895245242552, 3.524508391638244, 4.445331690009612, 0.02080533042381761] ],
      "bias_hidden_layer": [ -2.913724227435055, 8.328774311785176, 7.425425302056666, 9.13007413512143, -3.4522185471722, -1.0488531150680735, -0.30488423849029017, -3.531655346753246, -0.32404635922167496, -0.8835942537962942, -0.4982426907201811, 7.222518210125931 ],
      "bias_output_layer": [ -12.351024406230424, 15.246097293490882, -12.596266190459254,5.1377601306218645, -17.268595941335423, -18.755523209832344,-7.7121866279750435, -6.364670404957435, 54.35301385652795 ]
    };
    rooms[code].ai_bot = new reactive_model(0.1);
    rooms[code].ai_bot.W_hidden_input = reactiveAiWeights.W_hidden_input;
    rooms[code].ai_bot.W_hidden_output = reactiveAiWeights.W_hidden_output;
    rooms[code].ai_bot.bias_hidden_layer = reactiveAiWeights.bias_hidden_layer;
    rooms[code].ai_bot.bias_output_layer = reactiveAiWeights.bias_output_layer;

    if(rooms[code].ai_bot) {
      run_ai(rooms[code]);
    }
  }
  
  if (rooms[code].ai_bot || rooms[code].phantai) {
    const AIidx = rooms[code].players.indexOf("AI-" + code);
    const AI_Paddle = rooms[code].game.paddles[AIidx];
    setTimer(rooms[code], AI_Paddle);
  }
  socket.join(code);
  socket.emit("singlePlayerRoomCreated", { code });
  console.log(rooms[code].playerUsernames);
  io.to(code).emit("gameStart", { code, numPlayers: rooms[code].numPlayers, isSinglePlayer: ai_type });
  // console.log(`Room ${code} created for ${1} players by ${socket.id}`);
}

function handleLocalRoom(socket: Socket): void {
  const code = generateRoomCode();

  rooms[code] = {
    code,
    numPlayers: 1,
    players: [socket.id],
    playerUsernames: new Map(),
    isSinglePlayer: 0,
    game: new GameMath(),
	vanilla: 1
  };

  rooms[code].players.push("local player 2");
  rooms[code].playerUsernames.set(socket.id, "player 1 -RED-");
  rooms[code].playerUsernames.set("local player 2", "player 2 -BLUE-");
  rooms[code].numPlayers = 2;
  rooms[code].inProgress = true; //might not be necessary

  activateRoomPaddles(rooms[code]);

  socket.join(code);
  socket.emit("LocalRoomCreated", { code });

  io.to(code).emit("gameStart", { code, numPlayers: rooms[code].numPlayers, isSinglePlayer: 1, vanilla: 1 });
  console.log(`Vanilla Room ${code} created for ${1} players by ${socket.id}`);
}

function handleJoinRoom(socket: Socket, code: string, alias: string): void {
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
  room.playerUsernames.set(socket.id, alias);
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
      playerUsernames: new Map(),
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
  socket.on("SendInputsToBackend", ({ input, input2 }: { input: any, input2: any }) => {
    handlePlayerInput(socket, input, input2);
  });

  socket.on("leaveGame", () => {
    const { roomCode, room } = findPlayerRoom(socket.id);
    if (!room)
        console.log("urmom");
    console.log("inside socket on leaveGame", roomCode);
    console.log(room?.isSinglePlayer);
    if (room?.isSinglePlayer) {
    console.log("inside socket on is single player check", roomCode);
      clearInterval(room.actionTimer!);
      clearInterval(room.ai_timer!);
      // delete room.ai_bot;
    }
    if (room?.vanilla || room?.isSinglePlayer)
      delete rooms[roomCode!];
    socket.disconnect();
  });
  
  // Player count requests
  socket.on("playerCountRequest", () => {
    handlePlayerCountRequest(socket);
  });

    socket.on("playerIDRequest", () => {
    handlePlayerIDRequest(socket);
  });

      socket.on("vanillaRequest", () => {
    handleVanillaRequest(socket);
  });

  socket.on("AIRequest", () => {
    handleAIRequest(socket);
  });

  //  socket.on("roomRequest", () => {
  //   handleRoomRequest(socket);
  // });
  
  // Room management
  socket.on("createRoom", ({ numPlayers, alias }: { numPlayers: number, alias: string }) => {
    handleCreateRoom(socket, numPlayers, alias);
  });

  socket.on("createSinglePlayerRoom", ({ ai_type, alias }: { ai_type: number, alias: string }) => {
    handleSinglePlayerRoom(socket, ai_type, alias);
  });

	socket.on("createLocalRoom", () => {
    handleLocalRoom(socket);
  });
  
  socket.on("joinRoom", ({ code, alias }: { code: string, alias: string }) => {
    handleJoinRoom(socket, code, alias);
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

  socket.on("joinTournament", (username: string) => {
  tournamentManager.joinTournament(socket.id, username);
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