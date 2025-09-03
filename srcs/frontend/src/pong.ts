/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pong.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: gcapa-pe <gcapa-pe@student.42lisboa.com    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/30 15:21:27 by yohan             #+#    #+#             */
/*   Updated: 2025/09/01 16:06:04 by gcapa-pe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

//must call backend to receive stored old match info nd whatnot.

import { checkLoginState } from "./dashboard";
import { initBabylon } from "./game";

// Store roomId for later use
let currentRoomId: string | null = null;

async function renderPong(roomId?: string) {
    await checkLoginState("http://localhost:8080/api/pong");
    const app = document.getElementById('app');
    if (!app)
        return ;
    const info = localStorage.getItem('jwt');
    
    app.innerHTML = `
    <div id="menu">
        <button id="backToDashboard">Back</button>
    </div>
        <canvas id='pongCanvas' width='1520' height=700' style="border:1px solid #000 ">
        </canvas>
        <div id="pong-controls">
            <button id="pauseBtn">Pause</button>
            <button id="restartBtn">Restart</button>
            <p id="score">Score: 0</p>
        </div>`;
        backToDashboard();
        // Only start game scene if roomId is provided (from gameStart event)
        if (roomId) {
            currentRoomId = roomId;
            initBabylon();
        }
    backToDashboard();
}

async function play() {
    const btn = document.getElementById('playBtn');
     if (btn) {
     btn.addEventListener('click', () => {
         location.href = '/#pong';
         });
     };
}

async function backToDashboard() {
    const btn = document.getElementById('backToDashboard');
    if (btn) {
        btn.addEventListener('click', () => {
            location.href = '/#dashboard';
        });
    }
}

export { renderPong, play, backToDashboard };
// Make renderPong available globally for gameStart event
(window as any).renderPong = renderPong;