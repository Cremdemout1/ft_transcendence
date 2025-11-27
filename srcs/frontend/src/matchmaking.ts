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


import { connect, io } from "socket.io-client";
import { renderPong } from "./pong";
import { decodeJwt } from "./profile";
//change this to host pc IP
//const socket = io("YOUR PC IP", {
const HOST = window.location.hostname;
const socket = io(`http://${HOST}:8081`, {
  transports: ["websocket", "polling"],
  withCredentials: true
});

// function decodeJwt(token: string){
//     try{
//         const payload = token.split('.')[1];
//         const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
//         return JSON.parse(decodedPayload);
//     } catch {
//         return null;
//     }
// }

socket.on ('connect', () => {
    const jwt = localStorage.getItem('jwt');
    const username = jwt ? decodeJwt(jwt)?.username : null;
    if (username) {
        socket.emit('presence:identify', { username });
    }
});

function createGame(numPlayers: number, creatorAlias: string ) {
    ensureConnected().then(() => socket.emit("createRoom", { numPlayers, creatorAlias }));
}

function createSinglePlayerGame(ai_type: number = 1) {
    ensureConnected().then(() => socket.emit("createSinglePlayerRoom", { ai_type }));
}

function createLocalGame() {
    ensureConnected().then(() => socket.emit("createLocalRoom"));
}

function joinGame(code: string, username: string) {
    ensureConnected().then(() => socket.emit("joinRoom", { code, username }));
}

function startSinglePlayerGame(ai_type: number = 1) {
    // renderPong();
    localStorage.setItem('numPlayers', '1');
    createSinglePlayerGame(ai_type);
}

export function startLocalGame() {
    // renderPong();
    localStorage.setItem('numPlayers', '1');
    createLocalGame();
}

function start2PlayerGame(creatorAlias: string) {
    localStorage.setItem('numPlayers', '2');
    createGame(2, creatorAlias);
}

function start4PlayerGame(creatorAlias: string) {
    localStorage.setItem('numPlayers', '4');
    createGame(4, creatorAlias);
}

function start6PlayerGame(creatorAlias: string) {
    localStorage.setItem('numPlayers', '6');
    createGame(6, creatorAlias);
}

// Register socket event listeners ONCE to avoid duplication
socket.on("roomCreated", async ({ code, numPlayers }: { code: string, numPlayers: number }) => {
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
            <div id="waitroomChat"></div>
            </div>
        `;
        const chatRoot = document.getElementById('waitroomChat');
        if (chatRoot) {
            const mod = await import('./chat');
            mod.mountChat(chatRoot);
        }
    }
    localStorage.setItem('roomCode', code);
    localStorage.setItem('numPlayers', numPlayers.toString());
});

socket.on("singlePlayerRoomCreated", async ({ code }: { code: string }) => {
    console.log("single player room created event received:", code, 1);
    //socket.emit("playerCountRequest", { numPlayers}); // emit number of players to backend

    localStorage.setItem('roomCode', code);
    localStorage.setItem('numPlayers', "1");
});

socket.on("roomJoined", async ({ code, numPlayers }: { code: string, numPlayers: number }) => {
    console.log("roomJoined event received:", code, numPlayers);
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = `
            <div>
                <h2>Joined Room</h2>
                <p>Room Code: <strong>${code}</strong></p>
                <div id="playerCountInfo"><p>Players connected: <strong>1</strong> / ${numPlayers}</p></div>
                <p>Waiting for ${numPlayers} players to join...</p>
                <div id="waitroomChat"></div>
            </div>
        `;
        const chatRoot = document.getElementById('waitroomChat');
        if (chatRoot) {
            const mod = await import('./chat');
            mod.mountChat(chatRoot);
        }
    }
    localStorage.setItem('roomCode', code);
    localStorage.setItem('numPlayers', numPlayers.toString());
});

socket.on("error", ({ message }: { message: string }) => {
    console.log("Socket error event received:", message);
    alert(message); // Show error to user
});

socket.on("gameStart", ({ code, numPlayers, isSinglePlayer = 0, vanilla = 0 }: { code: string, numPlayers: number, isSinglePlayer: number, vanilla: number }) => {
    console.log("gameStart event received:", code, numPlayers);
    //socket.emit("playerCountRequest", { numPlayers}); // emit number of players to main.ts
      document.body.classList.add("game-active");
    localStorage.setItem("isSinglePlayer", String(isSinglePlayer)); 
	localStorage.setItem("vanilla", String(vanilla)); 
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

// Global invite banner for users not in a room (or when chat UI isn't mounted)
function showInviteBannerGlobal({ fromName, code, currentCount, numPlayers }: { fromName: string; code: string; currentCount: number; numPlayers: number }) {
    // If chat UI exists, let chat.ts handle it.
    if (document.getElementById('inviteBanner')) return;
    let banner = document.getElementById('inviteBannerGlobal');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'inviteBannerGlobal';
        banner.style.position = 'fixed';
        banner.style.right = '16px';
        banner.style.bottom = '16px';
        banner.style.zIndex = '99999';
        banner.style.background = '#eef';
        banner.style.border = '1px solid #000';
        banner.style.padding = '8px';
        banner.style.color = '#000';
        banner.innerHTML = `
            <span id="inviteTextGlobal"></span>
            <button id="inviteAcceptGlobal" style="margin-left:6px; border:1px solid #000; background:#fff; color:#000;">Join</button>
            <button id="inviteDeclineGlobal" style="margin-left:6px; border:1px solid #000; background:#fff; color:#000;">Decline</button>
        `;
        document.body.appendChild(banner);
    }
    const text = document.getElementById('inviteTextGlobal');
    const accept = document.getElementById('inviteAcceptGlobal') as HTMLButtonElement | null;
    const decline = document.getElementById('inviteDeclineGlobal') as HTMLButtonElement | null;
    const token = localStorage.getItem("jwt");
    const username = decodeJwt(token).username;
    if (text) text.textContent = `${fromName} invited you to join room ${code} (${currentCount}/${numPlayers}).`;
    banner.style.display = 'block';
    if (accept) accept.onclick = () => {
        socket.emit('joinRoom', { code, username });
        banner!.style.display = 'none';
    };
    if (decline) decline.onclick = () => {
        banner!.style.display = 'none';
    };
}

socket.on('chat:invited', (payload: any) => {
    // Provide prompt globally when chat UI isn't there
    showInviteBannerGlobal(payload);
});

// Minimal global DM toast when chat UI is not present
let dmToastTimer: number | null = null;
function showDMToastGlobal(fromName: string, text: string) {
    if (document.getElementById('roomChat')) return; // chat UI will show it
    let toast = document.getElementById('dmToastGlobal');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'dmToastGlobal';
        toast.style.position = 'fixed';
        toast.style.left = '16px';
        toast.style.bottom = '16px';
        toast.style.zIndex = '99999';
        toast.style.background = '#fff';
        toast.style.border = '1px solid #000';
        toast.style.padding = '8px';
        toast.style.maxWidth = '360px';
        toast.style.boxShadow = '2px 2px 0 rgba(0,0,0,.1)';
        document.body.appendChild(toast);
    }
    toast.textContent = `DM from ${fromName}: ${text}`;
    toast.style.display = 'block';
    if (dmToastTimer) window.clearTimeout(dmToastTimer);
    dmToastTimer = window.setTimeout(() => {
        const t = document.getElementById('dmToastGlobal');
        if (t) t.style.display = 'none';
    }, 5000);
}

socket.on('chat:new', (msg: any) => {
    if (msg?.dm) {
        const name = msg.fromName || (msg.from || '').slice(0,6);
        showDMToastGlobal(name, msg.text || '');
    }
});

socket.on('chat:inviteError', ({ message }: any) => {
    console.log('Invite error:', message);
});

socket.on('chat:inviteSent', ({ toName }: any) => {
    console.log(`Invite sent to ${toName}.`);
});

// Ensure the socket is connected before emitting critical events
function ensureConnected(timeoutMs: number = 3000): Promise<void> {
    if (socket.connected) return Promise.resolve();
    return new Promise((resolve, reject) => {
        let done = false;
        const onConnect = () => { if (!done) { done = true; cleanup(); resolve(); } };
        const onErr = () => { /* keep trying until timeout */ };
        const timer = setTimeout(() => { if (!done) { done = true; cleanup(); resolve(); } }, timeoutMs);
        function cleanup() {
            socket.off('connect', onConnect);
            socket.off('connect_error', onErr);
            clearTimeout(timer);
        }
        socket.on('connect', onConnect);
        socket.on('connect_error', onErr);
        try { socket.connect(); } catch {}
    });
}

export { startSinglePlayerGame, start2PlayerGame, start4PlayerGame, start6PlayerGame, joinGame, socket };
