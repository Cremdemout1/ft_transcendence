/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   signup.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ycantin <ycantin@student.42.fr>            +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/10 13:22:49 by ycantin           #+#    #+#             */
/*   Updated: 2025/06/10 14:18:44 by ycantin          ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export async function backendSignup() {
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
            const res = await fetch("http://localhost:8080/api/signup",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, username, firstname, lastname }),
            });

            const data = await res.json();
            console.log(data);
            if (res.ok) {
                if (messageDiv) {
                    messageDiv.textContent = "Successfully signup!";
                }
                // setTimeout(() => {
                //     window.location.href = '/dashboard';
                // })
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

// document.addEventListener('DOMContentLoaded', () => {
//   backendSignup();
// });
