/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dashboard.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: phantasiae <phantasiae@student.42.fr>      +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/19 11:21:57 by ycantin           #+#    #+#             */
/*   Updated: 2025/12/03 00:05:00 by phantasiae       ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { socket } from "./matchmaking";

async function checkLoginState(path:string) {
    const token = sessionStorage.getItem('jwt');
    if (!token) {
        return location.hash = '/#login';
    }
    const res = await fetch(path, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    const data = await res.json();
    if (res.ok) {
        //display user info correctly later
        console.log(data);
    } else {
        console.log(`Failed to authenticate user: ${JSON.stringify(data.error) || 'Unknown error'}`);
        sessionStorage.removeItem("jwt");
        return location.hash = '/#login';
    }
}

async function fetchDashboard() {
    checkLoginState("/api/dashboard");
    sessionStorage.removeItem("isSinglePlayer");
    sessionStorage.removeItem("numPlayers");
    sessionStorage.removeItem("lastMatchWinner");
    sessionStorage.removeItem("vanilla");
	sessionStorage.removeItem('inTournament');
    window.addEventListener("popstate", () => {
        if (window.location.hash !== "#pong") {
            // console.log("found someone going away from game")
            // console.log(window.location.hash)
			if(sessionStorage.getItem('roomCode'))
            	socket.emit("leaveGame", { code: sessionStorage.getItem('roomCode') });
        }
    });
    sessionStorage.removeItem("roomCode");
}

export { checkLoginState, fetchDashboard };