/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   play.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: gcapa-pe <gcapa-pe@student.42lisboa.com    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/09/16 20:30:00 by gcapa-pe          #+#    #+#             */
/*   Updated: 2025/11/30 12:25:42 by gcapa-pe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import {
	start2PlayerGame,
	start4PlayerGame,
	start6PlayerGame,
	joinGame,
	socket,
} from './matchmaking';
import { getUsernameFromJwt } from './chat';

function showMultiplayerMenu(push = true) {
	const app = document.getElementById('app');
	if (!app) return;

	app.innerHTML = `
    <h2 class="terminal-title">MULTIPLAYER HUB</h2>
    <div id="multiplayerMenu" class="terminal-menu">
        <button class="neon-btn" id="quickplayBtn">QUICKPLAY</button>
        <button class="neon-btn" id="createGameBtn">CREATE GAME</button>
        <div id="createGameOptions" class="create-options">
            <button class="neon-subbtn" data-players="2">2 PLAYERS</button>
            <button class="neon-subbtn" data-players="4">4 PLAYERS</button>
            <button class="neon-subbtn" data-players="6">6 PLAYERS</button>
        </div>
        <button class="neon-btn" id="joinGameBtn">JOIN GAME</button>
        <button class="neon-btn" id="tournamentBtn">TOURNAMENT</button>
        <button class="exit-btn" id="backBtn">BACK</button>
    </div>
		<div id="tournamentAliasModal" style="display:none;position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);background:#222;padding:24px;border-radius:8px;z-index:9999;">
			<h3>Enter Tournament Alias</h3>
			<input id="tournamentAliasInput" type="text" maxlength="24" style="width:180px;color:#000;background:#fff;padding:8px;border-radius:6px;border:1px solid #444;" placeholder="Alias..." />
      <button id="tournamentAliasConfirm" class="neon-btn">Join</button>
      <button id="tournamentAliasCancel" class="exit-btn">Cancel</button>
    </div>
`;

	if (push) history.pushState({ view: 'multiplayerMenu' }, '', '#multiplayer');

	// Quickplay
	document.getElementById('quickplayBtn')?.addEventListener('click', () => {
		sessionStorage.setItem('numPlayers', '6');
		socket.emit('quickplay');
	});

	const username = getUsernameFromJwt();

	// Create game options
	const createGameBtn = document.getElementById('createGameBtn');
	const createGameOptions = document.getElementById('createGameOptions');
	let optionsVisible = false;

	const showOptions = () => {
		if (createGameOptions) createGameOptions.style.display = 'flex';
		optionsVisible = true;
	};
	const hideOptions = () => {
		if (createGameOptions) createGameOptions.style.display = 'none';
		optionsVisible = false;
	};

	if (createGameBtn && createGameOptions) {
		createGameBtn.addEventListener('mouseenter', showOptions);
		createGameBtn.addEventListener('mouseleave', () =>
			setTimeout(() => {
				if (!optionsVisible) hideOptions();
			}, 100)
		);
		createGameOptions.addEventListener('mouseenter', showOptions);
		createGameOptions.addEventListener('mouseleave', hideOptions);
	}

	document.querySelectorAll('.neon-subbtn').forEach((btn) => {
		btn.addEventListener('click', () => {
			const players = btn.getAttribute('data-players');
			if (players === '2') start2PlayerGame(username!);
			else if (players === '4') start4PlayerGame(username!);
			else if (players === '6') start6PlayerGame(username!);
		});
	});

	// Join game
	document.getElementById('joinGameBtn')?.addEventListener('click', () => {
		const code = prompt('Enter room code:');
		if (code) joinGame(code, username!);
	});

	// Tournament
	document.getElementById('tournamentBtn')?.addEventListener('click', () => {
		const modal = document.getElementById('tournamentAliasModal');
		if (modal) modal.style.display = 'block';
		const input = document.getElementById('tournamentAliasInput') as HTMLInputElement;
		if (input) input.value = '';
	});
	const confirmBtn = document.getElementById('tournamentAliasConfirm');
	const cancelBtn = document.getElementById('tournamentAliasCancel');
	if (confirmBtn) confirmBtn.onclick = () => {
		const input = document.getElementById('tournamentAliasInput') as HTMLInputElement;
		const alias = input?.value?.trim() || getUsernameFromJwt() || 'Player';
		if (alias.length < 1) return;
		(socket as any).emit('joinTournament', alias);
		const modal = document.getElementById('tournamentAliasModal');
		if (modal) modal.style.display = 'none';
	};
	if (cancelBtn) cancelBtn.onclick = () => {
		const modal = document.getElementById('tournamentAliasModal');
		if (modal) modal.style.display = 'none';
	};

	// Back button
	document.getElementById('backBtn')?.addEventListener('click', () => {
		history.back();
	});
}

// Socket events
socket.on('matchOver', ({ username, tournamentId, reason, message }: { username: string, tournamentId?: string | null, reason?: string, message?: string }) => {
	if (tournamentId)
		return;
	sessionStorage.setItem('lastMatchWinner', username);
	if (message) sessionStorage.setItem('lastMatchMessage', message);
	else sessionStorage.removeItem('lastMatchMessage');
	// record timestamp so other handlers (e.g. gameState fallback) can avoid navigating back into pong
	sessionStorage.setItem('lastMatchAt', String(Date.now()));
	window.location.hash = '#endGame';
});

socket.on('tournamentWinner', ({ tournamentId, champion }) => {
	console.log('tournamentWinner', tournamentId, champion);
	let modal = document.getElementById('tournamentChampionModal');
	if (!modal) {
		modal = document.createElement('div');
		modal.id = 'tournamentChampionModal';
		modal.style.position = 'fixed';
		modal.style.top = '0';
		modal.style.left = '0';
		modal.style.width = '100vw';
		modal.style.height = '100vh';
		modal.style.display = 'flex';
		modal.style.alignItems = 'center';
		modal.style.justifyContent = 'center';
		modal.style.background = 'rgba(0,0,0,0.9)';
		modal.style.color = '#fff';
		modal.style.zIndex = '20000';
		modal.style.flexDirection = 'column';
		modal.style.textAlign = 'center';
		modal.innerHTML = `
			<div style="max-width:1000px;padding:40px;border-radius:12px;background:linear-gradient(90deg,#081427,#01303a);box-shadow:0 12px 60px rgba(0,0,0,.8);">
				<h1 style="font-size:56px;margin:0 0 12px;color:#ffd700;">CONGRATULATIONS</h1>
				<h2 id="tournamentChampionName" style="font-size:40px;margin:0 0 18px;">${champion}</h2>
				<p style="font-size:20px;margin:0 0 28px;">You won the tournament''}!</p>
				<button id="tournamentChampionClose" style="padding:14px 22px;border-radius:8px;border:none;background:#fff;color:#000;font-weight:700;cursor:pointer;">Back to dashboard</button>
			</div>
		`;
		document.body.appendChild(modal);
		const closeBtn = document.getElementById('tournamentChampionClose');
		closeBtn?.addEventListener('click', () => {
			modal!.style.display = 'none';
			location.hash = 'dashboard';
		});
	} else {
		const nameEl = document.getElementById('tournamentChampionName');
		if (nameEl) nameEl.textContent = champion;
		modal.style.display = 'flex';
	}
});

// Handle back/forward navigation
window.addEventListener('popstate', () => {
	if (location.hash === '#multiplayer') showMultiplayerMenu(false);
});

export { showMultiplayerMenu };
