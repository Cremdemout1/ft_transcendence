/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pong.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/30 15:21:27 by yohan             #+#    #+#             */
/*   Updated: 2025/06/30 15:47:00 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

//must call backend to receive stored old match info nd whatnot.

function fetchPong() {
    // to make sure the jwt token is present
    // must be called inside renderPong and send back to login if token not available
}

function renderPong() {
    const app = document.getElementById('app');
    if (!app)
        return ;
    const info = localStorage.getItem('jwt');
    
    app.innerHTML += `
        <canvas id='pongCanvas' width='600' height='400' style="border:1px solid #000">
        </canvas>
        <div id="pong-controls">
            <button id="pauseBtn">Pause</button>
            <button id="restartBtn">Restart</button>
            <p id="score">Score: 0</p>
        </div>
    `;
}

export { renderPong };