/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ping.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/12/04 05:44:25 by yohan             #+#    #+#             */
/*   Updated: 2025/12/04 14:39:58 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { decodeJwt } from "./profile";

let pingInterval: number | undefined;

export function startPing() {
    if (pingInterval) 
        clearInterval(pingInterval);
    console.log("inside ping function");

    pingInterval = window.setInterval(async () => {
        const jwt = sessionStorage.getItem('jwt');

        if (!jwt) {
            console.log("JWT missing, stopping ping");
            stopPing();
            return;
        }

        try {
            const res = await fetch("/api/ping", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${jwt}`
                },
                body: JSON.stringify({ email: decodeJwt(jwt).email })
            });
            console.log("Ping response status:", res.status);
            if (!res.ok) {
                console.warn("ping failed, maybe session expired");
                stopPing();
            }
        } catch (err) {
            console.error("ping network error", err);
        }
    }, 15000); // every 15 seconds
}

export function stopPing() {
    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = undefined;
        console.log("ping stopped");
    }
}
