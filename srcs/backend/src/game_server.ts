/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game_server.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: gcapa-pe <gcapa-pe@student.42lisboa.com    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/08/29 17:42:04 by gcapa-pe          #+#    #+#             */
/*   Updated: 2025/09/01 16:32:35 by gcapa-pe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */


import { Server, Socket } from 'socket.io';
import { GameMath } from './game/pong/pong_logic';

const io = new Server(8081, {
	cors: { origin: '*' }
});

type Room = {
	id: string;
	players: string[];
	playerPaddles: Record<string, number>; // playerId -> paddle index
	game: GameMath;
	inputs: Record<string, { up: number; down: number; left: number; right: number }>;
	interval?: NodeJS.Timeout;
};

const rooms: Record<string, Room> = {};
const matchmakingQueue: string[] = [];

function createRoom(playerIds: string[]): Room {
	const id = 'room_' + Math.random().toString(36).substr(2, 9);
	const game = new GameMath();
	playerIds.forEach(pid => game.addPlayer(pid));
	const playerPaddles: Record<string, number> = {};
	playerIds.forEach((pid, idx) => {
		playerPaddles[pid] = idx; // assign paddle index
	});
	return {
		id,
		players: playerIds,
		playerPaddles,
		game,
		inputs: {},
	};
}

let currentWaitingRoomId: string | null = null;

// ...existing code...

io.on('connection', (socket: Socket) => {
    
    socket.on('requestMenu', () => {
        socket.emit('menu', { options: ['singleplayer', 'multiplayer', 'options'] });
    });
    socket.emit('playerId', { playerId: socket.id });

    socket.on('menuSelect', (choice: string) => {
        if (choice === 'multiplayer') {
            // matchmaking
            matchmakingQueue.push(socket.id);

            // criar se não houver room( isto tem de ser revisto por causa de ser menos players)
            if (!currentWaitingRoomId) {
                currentWaitingRoomId = 'room_' + Math.random().toString(36).substr(2, 9);
            }

            // If enough players, create the room and reset waiting room
            if (matchmakingQueue.length >= 6) {
                const players = matchmakingQueue.splice(0, 6);
                const room = createRoom(players);
                rooms[room.id] = room;
                // Join room
                players.forEach(pid => io.sockets.sockets.get(pid)?.join(room.id));
                // notice para os players
                players.forEach(pid => {
                    io.to(pid).emit('gameStart', { roomId: room.id });
                    io.to(pid).emit('playerId', { playerId: pid });
                });
                // Start game 
				room.interval = setInterval(() => {
					room.game.update(room.inputs, 0);
					// Emit structured game state for frontend
					const paddles = room.players.map(pid => ({
						playerId: pid,
						index: room.playerPaddles[pid],
						position: room.game.getPaddlePosition(pid),
					}));
					const ball = room.game.getBallState();
					const scores = room.game.getScores();
					io.to(room.id).emit('gameState', {
						paddles,
						ball,
						scores,
					});
				}, 1000 / 60);

                // Reset waiting room for next batch
                currentWaitingRoomId = null;
            } else {
                // Show waiting message with room ID and count
                io.emit('waiting', { 
                    message: `${currentWaitingRoomId}: ${matchmakingQueue.length}/6 players connected` 
                });
            }
        } else {
            socket.emit('info', { message: 'STILL EMPTY' });
        }
    });

	//receive input and find roommm
	socket.on('playerInput', (input: { up: number; down: number; left: number; right: number }) => {
		
		const room = Object.values(rooms).find(r => r.players.includes(socket.id));
		if (room) {
			room.inputs[socket.id] = input;
		}
	});

	socket.on('disconnect', () => {
		
		const idx = matchmakingQueue.indexOf(socket.id);
		if (idx !== -1) matchmakingQueue.splice(idx, 1);
		
		for (const room of Object.values(rooms)) {
			const pidx = room.players.indexOf(socket.id);
			if (pidx !== -1) {
				room.players.splice(pidx, 1);
				room.game.removePlayer(socket.id);
				delete room.inputs[socket.id];
				// If its empty delete.. .this could be giving trouble ( still have to test)
				if (room.players.length === 0 && room.interval) {
					clearInterval(room.interval);
					delete rooms[room.id];
				}
				break;
			}
		}
	});
});

