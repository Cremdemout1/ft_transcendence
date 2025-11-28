/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   signup.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: luiberna <luiberna@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/10 13:22:49 by ycantin           #+#    #+#             */
/*   Updated: 2025/11/28 16:29:30 by luiberna         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import {emitPresence} from './presence';

async function backendSignup() {
    const form = document.querySelector("#signup-form");
    const messageDiv = document.querySelector("#message");
    form?.addEventListener("submit", async event => {
        event.preventDefault();

        if (messageDiv) {
            messageDiv.textContent = "";
        }

        const firstname = (document.querySelector("input[name='firstname']") as HTMLInputElement).value;
        const lastname = (document.querySelector("input[name='lastname']") as HTMLInputElement).value;
        const username = (document.querySelector("input[name='username']") as HTMLInputElement).value;
        const email = (document.querySelector("input[name='email']") as HTMLInputElement).value;
        const password = (document.querySelector("input[name='password']") as HTMLInputElement).value;

        try {
            const res = await fetch("/api/signup",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, username, firstname, lastname }),
            });

            const data = await res.json();
            console.log(data);
            if (res.ok) {
                sessionStorage.setItem('jwt', data.token);
                if (messageDiv) {
                    messageDiv.textContent = "Successful signup!";
                }
                emitPresence();
                location.hash = '#dashboard';
            } else {
                if (messageDiv) {
                    messageDiv.textContent = `Sign up failed: ${data.message || data.error || 'Unknown error'}`;
                }
            }
            console.log("Response form backend:", data);
        }
        catch(err) {
            console.log("Error connecting to backend:", err);
        }
    });
}

export { backendSignup };
