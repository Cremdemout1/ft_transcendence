/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pong.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: phantasiae <phantasiae@student.42.fr>      +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/30 15:21:27 by yohan             #+#    #+#             */
/*   Updated: 2025/11/27 13:23:52 by phantasiae       ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { checkLoginState } from "./dashboard";
import { initBabylon } from "./game";
import { showMultiplayerMenu } from "./play";
import { mountChat } from "./chat";
import { startSinglePlayerGame, startLocalGame } from "./matchmaking";

async function renderPong() {
	await checkLoginState("http://10.101.172.74:8080/api/pong");

	const app = document.getElementById("app");
	if (!app) return;
	const isSinglePlayer = Boolean(localStorage.getItem("isSinglePlayer"));
	app.innerHTML = isSinglePlayer ? `
		<div id="pongMenu" class="terminal-menu">
			<h2 class="terminal-title">PONG SIMULATION</h2>
			<button class="neon-subbtn" id="backToDashboard">BACK</button>
		</div>

		<div id="pongGameWrapper">
			<canvas id="pongCanvas" width="1520" height="700" style="border: 2px solid rgba(0,255,255,0.3); box-shadow: 0 0 10px rgba(0,255,255,0.3); border-radius: 8px;"></canvas>

			<div id="pong-controls" class="terminal-menu" style="margin-top: 1rem;">
				<button class="neon-btn" id="pauseBtn">PAUSE</button>
				<button class="neon-btn" id="restartBtn">RESTART</button>
				<p id="score" style="color:#00ffff; text-shadow:0 0 6px #00ffff; font-family:'Courier New', monospace;">SCORE: 0</p>
			</div>
		</div>
	` : `
		<div id="pongMenu" class="terminal-menu">
			<h2 class="terminal-title">PONG SIMULATION</h2>
			<button class="neon-subbtn" id="backToDashboard">BACK</button>
		</div>

		<div id="pongGameWrapper">
			<canvas id="pongCanvas" width="1520" height="700" style="border: 2px solid rgba(0,255,255,0.3); box-shadow: 0 0 10px rgba(0,255,255,0.3); border-radius: 8px;"></canvas>

			<div id="pong-controls" class="terminal-menu" style="margin-top: 1rem;">
				<button class="neon-btn" id="pauseBtn">PAUSE</button>
				<button class="neon-btn" id="restartBtn">RESTART</button>
				<p id="score" style="color:#00ffff; text-shadow:0 0 6px #00ffff; font-family:'Courier New', monospace;">SCORE: 0</p>
			</div>
			<div id="chatContainer" style="position:absolute; right: 16px; top: 80px; z-index:10;"></div>
		</div>
	`;

	initBabylon();
	const chatMount= document.getElementById('chatContainer');
	if (chatMount) {
		console.log("urmom");
		mountChat(chatMount); 
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

function showGameModeMenu() {
	const app = document.getElementById("app");
	if (!app) return;

	app.innerHTML = `
		<div id="gameModeMenu" class="terminal-menu">
			<h2 class="terminal-title">SELECT MODE</h2>
			<button class="neon-btn" id="localGameBtn">LOCAL GAME</button>
			<button class="neon-btn" id="singlePlayerBtn">SINGLE PLAYER</button>
			<div id="singlePlayerOptions" class="create-options">
				<button class="neon-subbtn" ai-type="1">PhantAI</button>
				<button class="neon-subbtn" ai-type="2">YohAI</button>
       		</div>
			<button class="neon-btn" id="multiPlayerBtn">MULTIPLAYER</button>
			<button class="exit-btn" id="backBtn">BACK</button>
		</div>
	`;

	history.pushState({ view: "gameModeMenu" }, "", "#gamemode");
	const singlePlayerBtn = document.getElementById('singlePlayerBtn');
	const singlePlayerOptions = document.getElementById('singlePlayerOptions');
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
			console.log(AI);
			startSinglePlayerGame(Number(AI));
		});
	});
	// document.getElementById("singlePlayerBtn")?.addEventListener("click", () => {
	// 	startSinglePlayerGame();
	// })

	document.getElementById("localGameBtn")?.addEventListener("click", () => {
		startLocalGame();
	})

	document.getElementById("multiPlayerBtn")?.addEventListener("click", () => {
		showMultiplayerMenu();
	});

	document.getElementById("backBtn")?.addEventListener("click", () => {
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
			location.href = "/#dashboard";
		});
	}
}

export { renderPong, play, backToDashboard };
