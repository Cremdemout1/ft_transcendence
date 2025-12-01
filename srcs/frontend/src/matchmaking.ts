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

function getUsernameFromJwt(): string | null {
  const jwt = sessionStorage.getItem('jwt');
  if (!jwt) return null;
  const payload = decodeJwt(jwt);
  return payload?.username || null;
}

const isHttps = window.location.protocol === "https:"; // Detects if the current page is using HTTPS
const SOCKET_URL_OVERRIDE = (window as any).__GAME_SOCKET_URL__ as string | undefined; // Checks for a global variable that may override the URL
const socket = io(SOCKET_URL_OVERRIDE || "/", { // Creates the socket.io client/connection using override or default path
  path: "/socket.io",
  transports: ["websocket", "polling"], //Supports both websocket or http
  withCredentials: true, //Accepts credentials such as cookies
  secure: isHttps, //Makes sure the connection uses HTTPS
});

function decodeJwt(token: string){
    try{
        const payload = token.split('.')[1];
        const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decodedPayload);
    } catch {
        return null;
    }
}

socket.on ('connect', () => {
    const jwt = sessionStorage.getItem('jwt');
    const username = jwt ? decodeJwt(jwt)?.username : null;
    if (username) {
        socket.emit('presence:identify', { username });
    }
});

function createGame(numPlayers: number, alias: string) {
    ensureConnected().then(() => socket.emit("createRoom", { numPlayers, alias }));
}

function createSinglePlayerGame(ai_type: number = 1, alias: string) {
    ensureConnected().then(() => socket.emit("createSinglePlayerRoom", { ai_type, alias }));
}

function createLocalGame() {
    ensureConnected().then(() => socket.emit("createLocalRoom"));
}

function joinGame(code: string, alias: string) {
    ensureConnected().then(() => socket.emit("joinRoom", { code, alias }));
}

function startSinglePlayerGame(ai_type: number = 1, alias: string) {
    // renderPong();
    sessionStorage.setItem('numPlayers', '1');
    createSinglePlayerGame(ai_type, alias);
}

export function startLocalGame() {
    // renderPong();
    sessionStorage.setItem('numPlayers', '1');
    createLocalGame();
}

function start2PlayerGame(alias: string) {
    sessionStorage.setItem('numPlayers', '2');
    createGame(2, alias);
}

function start4PlayerGame(alias: string) {
    sessionStorage.setItem('numPlayers', '4');
    createGame(4, alias);
}

function start6PlayerGame(alias: string) {
    sessionStorage.setItem('numPlayers', '6');
    createGame(6, alias);
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
    sessionStorage.setItem('roomCode', code);
    sessionStorage.setItem('numPlayers', numPlayers.toString());
});

socket.on("singlePlayerRoomCreated", async ({ code }: { code: string }) => {
    console.log("single player room created event received:", code, 1);
    //socket.emit("playerCountRequest", { numPlayers}); // emit number of players to backend

    sessionStorage.setItem('roomCode', code);
    sessionStorage.setItem('numPlayers', "1");
});

socket.on("roomJoined", async ({ code, numPlayers, tournamentId }: { code: string, numPlayers: number, tournamentId?: string | null }) => {
    console.log("roomJoined event received:", code, numPlayers);
    const app = document.getElementById('app');

    // If we're already inside the game view (#pong), do not overwrite the canvas/UI
    // with the 'Joined Room' waiting UI. Just update session storage and return.
    if (location.hash.startsWith('#pong')) {
        console.log('roomJoined received while in #pong — updating sessionStorage only');
        sessionStorage.setItem('roomCode', code);
        sessionStorage.setItem('numPlayers', numPlayers.toString());
        // also notify game scene via a playerCount event in case it needs to update UI
        try { socket.emit('playerCountRequest', {}); } catch (e) { /* ignore */ }
        return;
    }

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
    sessionStorage.setItem('roomCode', code);
    sessionStorage.setItem('numPlayers', numPlayers.toString());
    if (tournamentId) sessionStorage.setItem('tournamentId', String(tournamentId));
    else sessionStorage.removeItem('tournamentId');
});

socket.on("error", ({ message }: { message: string }) => {
    console.log("Socket error event received:", message);
    alert(message); // Show error to user
});

socket.on("gameStart", ({ code, numPlayers, isSinglePlayer = 0, vanilla = 0 }: { code: string, numPlayers: number, isSinglePlayer: number, vanilla: number }) => {
    console.log("gameStart event received:", code, numPlayers);
    //socket.emit("playerCountRequest", { numPlayers}); // emit number of players to main.ts
        document.body.classList.add("game-active");
        // Ensure the main app container is visible so the pong canvas can be mounted
        try { const app = document.getElementById('app'); if (app) app.style.display = ''; } catch (e) {}
        // Hide transient overlays that might block the canvas
        try { hideOverlaysExceptApp(); } catch (e) {}
        sessionStorage.setItem("isSinglePlayer", String(isSinglePlayer)); 
        sessionStorage.setItem("vanilla", String(vanilla)); 
    sessionStorage.setItem("roomCode", String(code)); 
    sessionStorage.setItem("numPlayers", String(numPlayers)); 
    console.log("aaaaaaaaaaaaaaa");
   
        location.href = '/#pong';
        // clear flag after a short grace period
});

socket.on("gameState", ({ gameState }: { gameState: any }) => {
    try {
        if (!location.hash.startsWith('#pong')) {
            console.log('Received gameState while not on #pong — navigating to #pong');
            // Ensure UI state matches an active game
            document.body.classList.add('game-active');
            sessionStorage.setItem('isSinglePlayer', String(gameState?.isSinglePlayer || 0));
            sessionStorage.setItem('vanilla', String(gameState?.vanilla || 0));
            // Make sure the main app container is visible and hide overlays
            try { const app = document.getElementById('app'); if (app) app.style.display = ''; } catch (e) {}
            try { hideOverlaysExceptApp(); } catch (e) {}
            // navigate to pong view so the scene mounts and will register its own gameState handler
            const navTs2 = parseInt(sessionStorage.getItem('navigatingToPongTS') || '0', 10) || 0;
                // If a matchOver was just received (forfeit/win), avoid immediately navigating back to #pong
                const lastMatchAt = parseInt(sessionStorage.getItem('lastMatchAt') || '0', 10) || 0;
                const nowCheck = Date.now();
                const suppressNav = lastMatchAt && (nowCheck - lastMatchAt) < 4000; // 4s grace window
                if (suppressNav) {
                    console.log('Suppressing gameState -> #pong navigation due to recent matchOver', { lastMatchAt, nowCheck });
                }
            const now2 = Date.now();
            const navigating2 = (now2 - navTs2) < 3000;
            if (!location.hash.startsWith('#pong') && !navigating2 && !suppressNav) {
                console.log('Navigating to #pong (gameState fallback)');
                sessionStorage.setItem('navigatingToPongTS', String(now2));
                try { location.hash = '#pong'; window.dispatchEvent(new Event('hashchange')); } catch (e) { location.href = '/#pong'; }
                setTimeout(() => sessionStorage.removeItem('navigatingToPongTS'), 3000);
            } else {
                console.log('Skipping navigation (already navigating recently or in #pong)', { navigating2, navTs2 });
            }
        }
    } catch (e) {
        console.warn('gameState fallback error', e);
    }
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
    // Only show the tournament queue UI when the multiplayer/tournament UI is present
    const multiplayerVisible = !!document.getElementById('multiplayerMenu') || !!document.getElementById('tournamentAliasModal') || location.hash === '#multiplayer';
    if (!multiplayerVisible) return;

    let queueDiv = document.getElementById('tournamentQueue');
    if (!queueDiv) {
        queueDiv = document.createElement('div');
        queueDiv.id = 'tournamentQueue';
        queueDiv.style.border = '1px solid #888';
        queueDiv.style.padding = '8px';
        queueDiv.style.marginTop = '8px';
        app.appendChild(queueDiv);
    }
    queueDiv.innerHTML = `<h3>Tournament Queue (${waitingPlayers.length}/4)</h3>` +
        `<ol>${waitingPlayers.map(alias => `<li>${alias}</li>`).join('')}</ol>`;
}

function hideOverlaysExceptApp() {
    const ids = ['tournamentCountdown', 'tournamentRoundInfo', 'tournamentResultOverlay', 'tournamentQueue', 'inviteBannerGlobal', 'inviteBanner'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

socket.on("tournamentQueueUpdate", ({ waitingCount, waitingPlayers }: { waitingCount: number, waitingPlayers: string[] }) => {
    console.log("tournamentQueueUpdate:", waitingCount, waitingPlayers);
    renderTournamentQueue(waitingPlayers);
});

socket.on('tournament:aliasError', ({ message }: { message?: string }) => {
    console.log('tournament alias error:', message);
    const modal = document.getElementById('tournamentAliasModal');
    if (modal) {
        modal.style.display = 'block';
        let err = document.getElementById('tournamentAliasError');
        if (!err) {
            err = document.createElement('div');
            err.id = 'tournamentAliasError';
            err.style.color = 'salmon';
            err.style.marginTop = '8px';
            err.style.fontSize = '0.9em';
            (modal as HTMLElement).appendChild(err);
        }
        err.textContent = message || 'Alias already in use';
        // clear message after a short time
        setTimeout(() => { if (err) err.textContent = ''; }, 2600);
    } else {
        alert(message || 'Alias already in use');
    }
});

// Show tournament countdown
socket.on("tournamentCountdown", ({ seconds, round }: { seconds: number, round?: number }) => {
    let cd = document.getElementById('tournamentCountdown');
    if (!cd) {
        cd = document.createElement('div');
        cd.id = 'tournamentCountdown';
        cd.style.position = 'fixed';
        cd.style.top = '20%';
        cd.style.left = '50%';
        cd.style.transform = 'translate(-50%,0)';
        cd.style.background = '#222';
        cd.style.color = '#fff';
        cd.style.fontSize = '2em';
        cd.style.padding = '16px';
        cd.style.borderRadius = '8px';
        cd.style.zIndex = '9999';
        document.body.appendChild(cd);
    }
    if (typeof round === 'number') {
        cd.textContent = `Round ${round} starting in ${seconds}...`;
    } else {
        cd.textContent = `Tournament starting in ${seconds}...`;
    }
    cd.style.display = 'block';
    if (seconds === 1) setTimeout(() => { cd.style.display = 'none'; }, 1200);
});

// Show round info and opponent alias
socket.on("tournamentRoundInfo", ({ round, opponent }: { round: number, opponent: string }) => {
    let info = document.getElementById('tournamentRoundInfo');
    if (!info) {
        info = document.createElement('div');
        info.id = 'tournamentRoundInfo';
        info.style.position = 'fixed';
        info.style.top = '30%';
        info.style.left = '50%';
        info.style.transform = 'translate(-50%,0)';
        info.style.background = '#222';
        info.style.color = '#fff';
        info.style.fontSize = '1.5em';
        info.style.padding = '12px';
        info.style.borderRadius = '8px';
        info.style.zIndex = '9999';
        document.body.appendChild(info);
    }
    info.textContent = `Round ${round} - Facing ${opponent}`;
    info.style.display = 'block';
    setTimeout(() => { info.style.display = 'none'; }, 3500);
});

// Handle match result for tournament participants
socket.on("tournament:matchResult", ({ result, message, tournamentId }: { result: string, message: string, tournamentId?: string }) => {
    console.log("tournament:matchResult", result, message, tournamentId);
    // Simple UI: modal/overlay
    let el = document.getElementById('tournamentResultOverlay');
    if (!el) {
        el = document.createElement('div');
        el.id = 'tournamentResultOverlay';
        el.style.position = 'fixed';
        el.style.top = '30%';
        el.style.left = '50%';
        el.style.transform = 'translate(-50%,-50%)';
        el.style.background = '#222';
        el.style.color = '#fff';
        el.style.padding = '12px';
        el.style.borderRadius = '8px';
        el.style.zIndex = '10000';
        el.style.textAlign = 'center';
        document.body.appendChild(el);
    }
    el.style.opacity = '1';
    el.style.transition = 'opacity 600ms ease';
    el.textContent = message || (result === 'win' ? 'You won — waiting for next opponent' : 'You lost');
    el.style.display = 'block';

    if (result === 'loss') {
        setTimeout(() => {
            el!.style.opacity = '0';
            setTimeout(() => { el!.style.display = 'none'; location.hash = 'dashboard'; }, 650);
        }, 3500);
        return;
    }

    setTimeout(() => {
        try {
            el!.style.opacity = '0';
            setTimeout(() => { if (el) el.style.display = 'none'; }, 700);
        } catch (e) { if (el) el.style.display = 'none'; }
    }, 2200);
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
    if (text) text.textContent = `${fromName} invited you to join room ${code} (${currentCount}/${numPlayers}).`;
    banner.style.display = 'block';
    if (accept) accept.onclick = () => {
        socket.emit('joinRoom', { code, alias: getUsernameFromJwt() });
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

// When the route changes (e.g. user returns to dashboard), hide the tournament result overlay
window.addEventListener('hashchange', () => {
    try {
        const el = document.getElementById('tournamentResultOverlay');
        if (!el) return;
        // If we're not in the multiplayer flow or a game, hide the overlay
        if (location.hash !== '#multiplayer' && !location.hash.startsWith('#pong')) {
            el.style.opacity = '0';
            setTimeout(() => { el.style.display = 'none'; }, 650);
        }
    } catch (e) { /**/ }
});

// One-time sanity: if overlay exists on load and we're not in tournament/game, hide it
(function() {
    try {
        const el = document.getElementById('tournamentResultOverlay');
        if (!el) return;
        if (location.hash !== '#multiplayer' && !location.hash.startsWith('#pong')) {
            el.style.display = 'none';
        }
    } catch (e) { /**/ }
})();

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
