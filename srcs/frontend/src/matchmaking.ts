/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   matchmaking.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: gcapa-pe <gcapa-pe@student.42lisboa.com    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/09/16 21:00:00 by gcapa-pe         #+#    #+#             */
/*   Updated: 2025/09/16 21:00:00 by gcapa-pe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */


import { io } from "socket.io-client";
//change this to host pc IP
//const socket = io("YOUR PC IP", {
const HOST = window.location.hostname;
const socket = io(`http://${HOST}:8081`, {
  transports: ["websocket", "polling"],
  withCredentials: true
});

function createGame(numPlayers: number) {
    socket.emit("createRoom", { numPlayers });
}

function joinGame(code: string) {
    socket.emit("joinRoom", { code });
}

function start2PlayerGame() {
    localStorage.setItem('numPlayers', '2');
    createGame(2);
}

function start4PlayerGame() {
    localStorage.setItem('numPlayers', '4');
    createGame(4);
}

function start6PlayerGame() {
    localStorage.setItem('numPlayers', '6');
    createGame(6);
}

// Register socket event listeners ONCE to avoid duplication
socket.on("roomCreated", ({ code, numPlayers }: { code: string, numPlayers: number }) => {
    console.log("roomCreated event received:", code, numPlayers);
    //socket.emit("playerCountRequest", { numPlayers}); // emit number of players to backend
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = `
            <div>
            <h2>Room created!</h2>
            <p>Share this code for others to join: <strong>${code}</strong></p>
            <div id="playerCountInfo"><p>Players connected: <strong>1</strong> / ${numPlayers}</p></div>
            <p>Waiting for ${numPlayers} players to join...</p>
            </div>
        `;
    }
    localStorage.setItem('roomCode', code);
    localStorage.setItem('numPlayers', numPlayers.toString());
});


socket.on("roomJoined", ({ code, numPlayers }: { code: string, numPlayers: number }) => {
    console.log("roomJoined event received:", code, numPlayers);
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = `
            <div>
                <h2>Joined Room</h2>
                <p>Room Code: <strong>${code}</strong></p>
                <div id="playerCountInfo"><p>Players connected: <strong>1</strong> / ${numPlayers}</p></div>
                <p>Waiting for ${numPlayers} players to join...</p>
            </div>
        `;
    }
    localStorage.setItem('roomCode', code);
    localStorage.setItem('numPlayers', numPlayers.toString());
});

socket.on("error", ({ message }: { message: string }) => {
    console.log("Socket error event received:", message);
    alert(message); // Show error to user
});

socket.on("gameStart", ({ code, numPlayers }: { code: string, numPlayers: number }) => {
    console.log("gameStart event received:", code, numPlayers);
    //socket.emit("playerCountRequest", { numPlayers}); // emit number of players to main.ts
    location.href = '/#pong';
});


socket.on("playerCount", ({ count, numPlayers }: { count: number, numPlayers: number }) => {
    console.log("playerCount event received:", count, numPlayers);
  const app = document.getElementById('app');
  if (app) {
    let infoDiv = document.getElementById('playerCountInfo');
    if (!infoDiv) {
      infoDiv = document.createElement('div');
      infoDiv.id = 'playerCountInfo';
      app.appendChild(infoDiv);
    }
    infoDiv.innerHTML = `<p>Players connected: <strong>${count}</strong> / ${numPlayers}</p>`;
  }
});

// Tournament queue UI updates
// ver isto melhor
function renderTournamentQueue(waitingPlayers: string[]) {
    const app = document.getElementById('app');
    if (!app) return;
    let queueDiv = document.getElementById('tournamentQueue');
    if (!queueDiv) {
        queueDiv = document.createElement('div');
        queueDiv.id = 'tournamentQueue';
        queueDiv.style.border = '1px solid #888';
        queueDiv.style.padding = '8px';
        queueDiv.style.marginTop = '8px';
        app.appendChild(queueDiv);
    }
    queueDiv.innerHTML = `<h3>Tournament Queue (${waitingPlayers.length}/8)</h3>` +
        `<ol>${waitingPlayers.map(pid => `<li>${pid}</li>`).join('')}</ol>`;
}

socket.on("tournamentQueueUpdate", ({ waitingCount, waitingPlayers }: { waitingCount: number, waitingPlayers: string[] }) => {
    console.log("tournamentQueueUpdate:", waitingCount, waitingPlayers);
    renderTournamentQueue(waitingPlayers);
});

socket.on("tournamentStarted", ({ tournamentId, players }: { tournamentId: string, players: string[] }) => {
    console.log(`Tournament ${tournamentId} started with players:`, players);
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = `<div><h2>Tournament ${tournamentId} started!</h2><p>Players: ${players.join(', ')}</p><p>Waiting for matches to begin...</p></div>`;
    }
});

export { start2PlayerGame, start4PlayerGame, start6PlayerGame, joinGame, socket };
