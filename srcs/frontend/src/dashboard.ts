/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dashboard.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: phantasiae <phantasiae@student.42.fr>      +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/19 11:21:57 by ycantin           #+#    #+#             */
/*   Updated: 2025/11/26 17:06:35 by phantasiae       ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { socket } from "./matchmaking";

async function checkLoginState(path:string) {
    const token = localStorage.getItem('jwt');
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
        localStorage.removeItem("jwt");
        return location.hash = '/#login';
    }
}

async function fetchDashboard() {
    checkLoginState("http://10.12.242.238:8080/api/dashboard");
    localStorage.removeItem("isSinglePlayer");
    localStorage.removeItem("roomCode");
    localStorage.removeItem("numPlayers");
    localStorage.removeItem("lastMatchWinner");
    localStorage.removeItem("vanilla"); //for now
    window.addEventListener("popstate", () => {
        if (window.location.hash !== "#pong") {
            // console.log("found someone going away from game")
            // console.log(window.location.hash)
            socket.emit("leaveGame");
        }
    });
}

export { checkLoginState, fetchDashboard };