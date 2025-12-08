/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pong.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: phantasiae <phantasiae@student.42.fr>      +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/30 15:21:27 by yohan             #+#    #+#             */
/*   Updated: 2025/12/05 01:57:46 by phantasiae       ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { checkLoginState } from "./dashboard";
import { initBabylon } from "./game";
import { showMultiplayerMenu } from "./play";
import { mountChat, unmountChat, setChatMode, hideChatUI } from "./chat";
import { startSinglePlayerGame, startLocalGame, socket } from "./matchmaking";
import { getUsernameFromJwt } from "./chat";

async function renderPong() {
	await checkLoginState("/api/pong");

	const app = document.getElementById("app");
	if (!app) return;
	const isSinglePlayer = sessionStorage.getItem("isSinglePlayer") === '1';
	app.innerHTML = isSinglePlayer ? `

		<div id="pongGameWrapper" style="position: relative;">
			<canvas id="pongCanvas" width="1520" height="700" style="border: 2px solid rgba(0,255,255,0.3); box-shadow: 0 0 10px rgba(0,255,255,0.3); border-radius: 8px;"></canvas>
		</div>
	` : `
		<div id="pongGameWrapper" style="position: relative;">
			<canvas id="pongCanvas" width="1520" height="700" style="border: 2px solid rgba(0,255,255,0.3); box-shadow: 0 0 10px rgba(0,255,255,0.3); border-radius: 8px;"></canvas>

			<div id="chatContainer" style="position:absolute; right: 16px; top: 80px; z-index:10;"></div>
		</div>
	`;
	const el = document.getElementById("bgCanvas");
	if (el) {
  el.style.display = "none";
}
	if(window.sessionStorage.getItem('numPlayers')=='-700' || !window.sessionStorage.getItem('roomCode'))
	{
		socket.emit('leaveGame', { code: window.sessionStorage.getItem('roomCode') });
		el!.style.display = "block";
		location.hash='dashboard';
	}
	else
		initBabylon();
	const chatMount = document.getElementById('chatContainer');
	// Disable chat for local/singleplayer or explicit disable flag; only enable when in an online room
	const isLocal = window.sessionStorage.getItem('vanilla') === '1';
	const hasRoom = Boolean(window.sessionStorage.getItem('roomCode'));
	if (!isLocal && window.sessionStorage.getItem('isSinglePlayer') == '0' && hasRoom && chatMount) {
		mountChat(chatMount);
		// Move chat inside game canvas area for gameplay and set in-game mode
		const wrapper = document.getElementById('pongGameWrapper');
		if (wrapper && chatMount.parentElement !== wrapper) {
			wrapper.appendChild(chatMount);
			chatMount.style.position = 'absolute';
			chatMount.style.right = '16px';
			chatMount.style.top = '10px';
			chatMount.style.zIndex = '10';
		}
		setChatMode('ingame');
		hideChatUI();
	} else if (!isLocal && window.sessionStorage.getItem('isSinglePlayer') == '0' && hasRoom) {
		// Fallback: ensure chat appears during gameplay even if container was removed
		const fallback = document.createElement('div');
		fallback.id = 'chatContainer';
		fallback.style.position = 'absolute';
		fallback.style.right = '24px';
		fallback.style.top = '40px';
		fallback.style.zIndex = '10';
		const wrapper = document.getElementById('pongGameWrapper');
		(wrapper || document.body).appendChild(fallback);
		mountChat(fallback);
		setChatMode('ingame');
		hideChatUI();
	}
	backToDashboard();
}

async function play() {
	const btn = document.getElementById("playBtn");
	if (btn) {
		btn.addEventListener("click", () => {
			showGameModeMenu();
		});
	}
}
function kms(btn: HTMLElement)
{
		try { 
	if(!socket.connected)
		throw new Error("Wait for connection please")
	 } catch(e) {
		const message = e instanceof Error ? e.message : null;
		let msg = document.getElementById("message");
		if(!msg){
			msg = document.createElement("div");
  			msg.id = "message";
			btn.insertAdjacentElement("afterend", msg);
		}
		msg.textContent = message;
		return 1;
	 }
	 return 0;
}

function showGameModeMenu() {
	const app = document.getElementById("app");
	if (!app) return;
	if(!socket.connected)
		socket.connect();
	app.innerHTML = `
		<div id="gameModeMenu" class="terminal-menu">
			<h2 class="terminal-title">SELECT MODE</h2>
			<button class="neon-btn" id="localGameBtn">LOCAL GAME</button>
			<button class="neon-btn" id="singlePlayerBtn">SINGLE PLAYER</button>
			<div id="singlePlayerOptions" class="create-options">
				<button class="neon-subbtn" ai-type="1">PhantAI</button>
				<button class="neon-subbtn" ai-type="2">YohAI</button>
				<button class="neon-subbtn" ai-type="3">PhantAIv2</button>
       		</div>
			<button class="neon-btn" id="multiPlayerBtn">MULTIPLAYER</button>
			<button class="exit-btn" id="backBtn">BACK</button>
		</div>
	`;

	history.pushState({ view: "gameModeMenu" }, "", "#gamemode");
	const singlePlayerBtn = document.getElementById('singlePlayerBtn');
	const singlePlayerOptions = document.getElementById('singlePlayerOptions');
	const username = getUsernameFromJwt();
	
	let optionsVisible = false;

	const showOptions = () => {
		if (singlePlayerOptions) singlePlayerOptions.style.display = 'flex';
		optionsVisible = true;
	};
	const hideOptions = () => {
		if (singlePlayerOptions) singlePlayerOptions.style.display = 'none';
		optionsVisible = false;
	};

	if (singlePlayerBtn && singlePlayerOptions) {
		singlePlayerBtn.addEventListener('mouseenter', showOptions);
		singlePlayerBtn.addEventListener('mouseleave', () =>
			setTimeout(() => {
				if (!optionsVisible) hideOptions();
			}, 100)
		);
		singlePlayerOptions.addEventListener('mouseenter', showOptions);
		singlePlayerOptions.addEventListener('mouseleave', hideOptions);
	}

	document.querySelectorAll('.neon-subbtn').forEach((btn) => {
		btn.addEventListener('click', () => {
			const AI = btn.getAttribute('ai-type');
			if (!AI)
				return ;
			kms(btn! as HTMLElement);
			startSinglePlayerGame(Number(AI), username!);
		});
	});

	document.getElementById("localGameBtn")?.addEventListener("click", () => {
		const btn= document.getElementById("localGameBtn");
		kms(btn!);
		startLocalGame();
	})

	document.getElementById("multiPlayerBtn")?.addEventListener("click", () => {
		// Ensure singleplayer flag is cleared when switching to multiplayer
		const btn= document.getElementById("multiPlayerBtn");
		if(kms(btn!)==1)
			return;
		window.sessionStorage.removeItem('isSinglePlayer');
		showMultiplayerMenu();
	});

	document.getElementById("backBtn")?.addEventListener("click", () => {
		// Clear singleplayer flag when backing out
		window.sessionStorage.removeItem('isSinglePlayer');
		history.back();
	});
}

window.addEventListener("popstate", () => {
	if (location.hash === "#gamemode") showGameModeMenu();
});

async function backToDashboard() {
	const btn = document.getElementById("backToDashboard");
	if (btn) {
		btn.addEventListener("click", () => {
			// Clear singleplayer flag when leaving to dashboard
			window.sessionStorage.removeItem('isSinglePlayer');
			// Leave game room and unmount chat when returning to dashboard
			const code = window.sessionStorage.getItem('roomCode');
			if (code) {
				socket.emit('leaveGame', { code });
			}
			unmountChat();
			location.href = "/#dashboard";
		});
	}
}

export { renderPong, play, backToDashboard };
