/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   login.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ycantin <ycantin@student.42.fr>            +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/09 17:36:10 by ycantin           #+#    #+#             */
/*   Updated: 2025/06/19 16:45:31 by ycantin          ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export async function backendLogin() {

    const form  = document.querySelector("#login-form");
    const messageDiv = document.querySelector("#message");
    form?.addEventListener("submit", async event => {
        event.preventDefault();

        if (messageDiv) {
            messageDiv.textContent = "";
        }

        const email = (document.querySelector("input[name='email']") as HTMLInputElement).value;
        const password = (document.querySelector("input[name='password']") as HTMLInputElement).value;
    
        try {
            const res = await fetch("http://localhost:8080/api/login",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });

            const data = await res.json();
            
            if (res.ok) {
                localStorage.setItem('jwt', data.token);
                if (messageDiv) {
                    messageDiv.textContent = "Login successful! 🎉";
                }
                location.hash = '#dashboard';
            } else {
                if (messageDiv) {
                    messageDiv.textContent = `Login failed: ${data.message || JSON.stringify(data.error) || "Unknown error"}`;
                }
            }
        }
        catch(err) {
            console.log("Error connecting to backend:", err);
        }
    });
}

export async function logout() {
   const btn = document.getElementById('logoutBtn');
    if (btn) {
    btn.addEventListener('click', () => {
        localStorage.removeItem('jwt');
        location.href = '/login';
        });
    };
}