/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   login.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: luiberna <luiberna@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/09 17:36:10 by ycantin           #+#    #+#             */
/*   Updated: 2025/11/28 15:33:09 by luiberna         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */


import {emitPresence} from './presence';
import { decodeJwt } from './profile';
import {checkregex} from './signup'

async function backendLogin() {

    const form = document.querySelector("#login-form");
    const messageDiv = document.querySelector("#message");
    form?.addEventListener("submit", async event => {
        event.preventDefault();

        if (messageDiv) {
            messageDiv.textContent = "";
        }

        const email = (document.querySelector("input[name='email']") as HTMLInputElement).value;
        const password = (document.querySelector("input[name='password']") as HTMLInputElement).value;
        
        checkregex(null, null, null, email, password);
        try {
            const res = await fetch("/api/login",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });
            const data = await res.json();
            if (res.ok) {
                if (Number(data.twoFA) === 1)
                {
                    sessionStorage.setItem('pendingEmail', email);
                    location.href = '/#login?section=2FA-verification';
                }
                else
                {
                    sessionStorage.setItem('jwt', data.token);
                    emitPresence();
                    location.href = '/#dashboard';
                }
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

async function logout() {
   const btn = document.getElementById('logoutBtn');
   const messageDiv = document.querySelector("#message");
   const jwt = decodeJwt(sessionStorage.getItem('jwt'));
   const email = jwt.email;
    if (btn) {
    btn.addEventListener('click', async() => {
        try {
            const res = await fetch("/api/logout",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                });
            const data = await res.json();
            if (!res.ok) {
                if (messageDiv) {
                    messageDiv.textContent = `Logout failed: ${data.message || JSON.stringify(data.error) || "Unknown error"}`;
                }
            }
            else
                console.log(data.message);
        }
        catch(err) {
            console.log("Error connecting to backend:", err);
        }
        sessionStorage.removeItem('jwt');
        sessionStorage.removeItem('twoFA');
        location.href = '/#login';
        });
    };
}

async function verify2faCode () {
    const app = document.getElementById('app');
    console.log("VERIFY 2FA");
    if (!app)
        return ;
    const email = sessionStorage.getItem('pendingEmail');
    app.innerHTML = `
    <div id='2FA-verification'>
        <p>We've sent a code to "${email}". Please enter the code in the email below</p>
        <h3>Enter code here: </h3>
        <input id='twoFA' placeholder='code'></input>
        <button type='submit' id="enter2FA">enter</button>
        <p id="error-msg"></p>
    </div>`;
    send2FA();
}

async function send2FA() {
    const btn = document.getElementById('enter2FA');
    const input = document.querySelector<HTMLInputElement>('#twoFA');
    
    if (!btn || !input)
        return ;
    
    const handleVerification = async () => {
        const code = input?.value.trim();
        const email = sessionStorage.getItem('pendingEmail');
        const errorMsg = document.getElementById('error-msg');

        if (!code)
            return alert("Please enter a code");
        
        try {
            const res = await fetch("/api/verify-2fa", {
                method: "POST",
                headers: {'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code, email }),
            });
            if (!res.ok) {
                const { error } = await res.json();
                if (errorMsg) errorMsg.textContent = error || "Verification failed";
                return;
              }
            const data = await res.json();
            if (errorMsg)
                errorMsg.textContent = '';
            sessionStorage.setItem('jwt', data.token);
            emitPresence();
            sessionStorage.removeItem('pendingEmail');
            window.location.hash = '#dashboard';
        } catch (err) {
            if (errorMsg) errorMsg.textContent = "Network error. Please try again.";
        }
    }
    btn.addEventListener('click', handleVerification);
    input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleVerification();
        }
    })
}

export { backendLogin, logout, verify2faCode };