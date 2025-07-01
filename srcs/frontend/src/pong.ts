/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pong.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/30 15:21:27 by yohan             #+#    #+#             */
/*   Updated: 2025/07/01 13:17:38 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

//must call backend to receive stored old match info nd whatnot.
import { checkLoginState } from "./dashboard";

async function renderPong() {
    await checkLoginState("http://localhost:8080/api/pong");
    const app = document.getElementById('app');
    if (!app)
        return ;
    const info = localStorage.getItem('jwt');
    
    app.innerHTML = `
    <div id="menu">
        <button id="backToDashboard">Back</button>
    </div>
        <canvas id='pongCanvas' width='600' height='400' style="border:1px solid #000">
        </canvas>
        <div id="pong-controls">
            <button id="pauseBtn">Pause</button>
            <button id="restartBtn">Restart</button>
            <p id="score">Score: 0</p>
        </div>`;
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