/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dashboard.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: phantasiae <phantasiae@student.42.fr>      +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/19 11:21:57 by ycantin           #+#    #+#             */
/*   Updated: 2025/12/05 01:58:46 by phantasiae       ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { socket } from "./matchmaking";

async function checkLoginState(path: string | null) {
    const token = sessionStorage.getItem('jwt');
    if (!token) {
        return location.hash = '/#login';
    }
    if (path) {
        const res = await fetch(path, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        // const data = await res.json();
        if (!res.ok) {
            sessionStorage.removeItem("jwt");
            return location.hash = '/#login';
        }
    }
}

async function fetchDashboard() {
    checkLoginState("/api/dashboard");
    sessionStorage.removeItem("isSinglePlayer");
    sessionStorage.removeItem("lastMatchWinner");
    sessionStorage.removeItem("roomCode");
    sessionStorage.removeItem("numPlayers");
    sessionStorage.removeItem("vanilla");
	sessionStorage.removeItem('inTournament');
	sessionStorage.removeItem('ended');
    window.addEventListener("popstate", () => {
        if (window.location.hash !== "#pong") {
			const el = document.getElementById("bgCanvas");
			if (el) {
  el.style.display = "block";
}
			if(sessionStorage.getItem('roomCode'))
            	socket.emit("leaveGame", { code: sessionStorage.getItem('roomCode') });
        }
    });
    sessionStorage.removeItem("roomCode");
}

export { checkLoginState, fetchDashboard };