/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   play.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: gcapa-pe <gcapa-pe@student.42lisboa.com    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/09/16 20:30:00 by gcapa-pe          #+#    #+#             */
/*   Updated: 2025/10/28 18:06:15 by gcapa-pe         ###   ########.fr       */
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
		const alias = prompt('Enter Alias - If no alias is chosen, your username will be used: ');
		if (alias)
			socket.emit('joinTournament',  alias );
		else
			socket.emit('joinTournament',  username! );
	});

	// Back button
	document.getElementById('backBtn')?.addEventListener('click', () => {
		history.back();
	});
}

// Socket events
socket.on('matchOver', ({ username, tournamentId }) => {
	if (tournamentId)
		return ;
	sessionStorage.setItem(
		'lastMatchWinner',
		username
	);
	window.location.hash = '#endGame';
});

socket.on('tournamentWinner', ({ tournamentId, champion }) => {
	alert(`TOURNAMENT ${tournamentId} FINISHED. CHAMPION SOCKET: ${champion}`);
});

// Handle back/forward navigation
window.addEventListener('popstate', () => {
	if (location.hash === '#multiplayer') showMultiplayerMenu(false);
});

export { showMultiplayerMenu };
