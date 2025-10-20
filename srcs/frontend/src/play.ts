/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   play.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: gcapa-pe <gcapa-pe@student.42lisboa.com    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/09/16 20:30:00 by gcapa-pe         #+#    #+#             */
/*   Updated: 2025/09/16 20:30:00 by gcapa-pe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { start2PlayerGame, start4PlayerGame, start6PlayerGame, joinGame, socket } from './matchmaking';

function showMultiplayerMenu(push = true) {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
        <div id="multiplayerMenu">
            <button id="quickplayBtn">Quickplay</button>
            <button id="createGameBtn">Create Game</button>
            <button id="joinGameBtn">Join Game</button>
            <button id="tournamentBtn">Tournament</button>
            <button id="backBtn">Back</button>
        </div>
        <div id="createGameOptions" style="display:none;">
            <button class="createOption" data-players="2">2 players</button>
            <button class="createOption" data-players="4">4 players</button>
            <button class="createOption" data-players="6">6 players</button>
        </div>
    `;
    if (push) history.pushState({view: 'multiplayerMenu'}, '', '#multiplayer');

    document.getElementById('quickplayBtn')?.addEventListener('click', () => {
        // Quickplay: join any available 6-player room
        localStorage.setItem('numPlayers', '6');
        socket.emit("quickplay");
    });
    const createGameBtn = document.getElementById('createGameBtn');
    const createGameOptions = document.getElementById('createGameOptions');
    let optionsVisible = false;

    function showOptions() {
        if (createGameOptions) createGameOptions.style.display = 'block';
        optionsVisible = true;
    }
    function hideOptions() {
        if (createGameOptions) createGameOptions.style.display = 'none';
        optionsVisible = false;
    }

    if (createGameBtn && createGameOptions) {
        createGameBtn.addEventListener('mouseenter', showOptions);
        createGameBtn.addEventListener('mouseleave', () => {
            setTimeout(() => {
                if (!optionsVisible) hideOptions();
            }, 100);
        });
        createGameOptions.addEventListener('mouseenter', showOptions);
        createGameOptions.addEventListener('mouseleave', () => {
            hideOptions();
        });
    }
    document.querySelectorAll('.createOption').forEach(btn => {
        btn.addEventListener('click', () => {
            const players = btn.getAttribute('data-players');
            if (players === '2') start2PlayerGame();
            else if (players === '4') start4PlayerGame();
            else if (players === '6') start6PlayerGame();
        });
    });
    document.getElementById('joinGameBtn')?.addEventListener('click', () => {
        const code = prompt("Enter room code:");
        if (code) {
            joinGame(code);
        }
    });
    document.getElementById('tournamentBtn')?.addEventListener('click', () => {
        socket.emit("joinTournament");
    });
    document.getElementById('backBtn')?.addEventListener('click', () => {
        history.back();
    });
}

// Listen for match results and tournament notifications
socket.on("matchOver", ({ winner, winnerSocketId }: { winner: number; winnerSocketId: string | null }) => {
    console.log("matchOver received in play.ts:", winner, winnerSocketId);
    // store last match winner so tournament manager UI can read it
    localStorage.setItem('lastMatchWinner', JSON.stringify({ winnerIdx: winner, winnerSocketId }));
    // You could advance UI or open a small modal here
    alert(`Match finished. Winner: player ${winner + 1}`);
});

socket.on("tournamentWinner", ({ tournamentId, champion }: { tournamentId: string; champion: string }) => {
    console.log(`Tournament ${tournamentId} finished. Champion: ${champion}`);
    alert(`Tournament ${tournamentId} finished. Champion socket: ${champion}`);
});

window.addEventListener('popstate', (event) => {
    if (location.hash === '#multiplayer') {
        showMultiplayerMenu(false);
    }
    // Add more views here if needed
});

export { showMultiplayerMenu };
