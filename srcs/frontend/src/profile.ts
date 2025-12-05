/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   profile.ts                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/01 12:52:55 by yohan             #+#    #+#             */
/*   Updated: 2025/12/04 01:32:26 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { checkLoginState } from './dashboard';

function decodeJwt(token: string | null) {
    if (token === null)
    {
        location.hash = "#login";
        throw new Error("jwt is null");
    }
    try {
        const payloadBase64Url = token.split('.')[1];
        const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payloadJson = atob(payloadBase64);
        return JSON.parse(payloadJson);
    } catch (e) {
        console.error('Invalid JWT token', e);
        return null;
    }
}

async function renderProfile() {
    await checkLoginState("/api/me");

    const app = document.getElementById('app');
    if (!app) return;

    const info = sessionStorage.getItem('jwt');
    const userInfo = info ? decodeJwt(info) : null;

    // console.log("hi: ", userInfo);
    app.innerHTML = `
        <div id="profileContainer" style="display: flex; flex-direction: column; align-items: center; gap: 1rem; width: 100%;">
            <button class="neon-btn exit-btn" id="backBtn">BACK</button>

            <div id="userInfo" style="display: flex; flex-direction: column; align-items: center; gap: 1rem; width: 100%;">

                <div id="usernameDiv" style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                    <p id="username">Username: ${userInfo?.username}</p>
                    <input type="text" id="newUsernameInput" placeholder="Enter username" class="input" />
                    <button type="submit" id="changeUsername" class="neon-subbtn">Change</button>
                </div>

                <div id="firstnameDiv" style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                    <p id="firstname">Firstname: ${userInfo?.firstname}</p>
                    <input type="text" id="newFirstnameInput" placeholder="Enter firstname" class="input" />
                    <button type="submit" id="changeFirstname" class="neon-subbtn">Change</button>
                </div>

                <div id="lastnameDiv" style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                    <p id="lastname">Lastname: ${userInfo?.lastname}</p>
                    <input type="text" id="newLastnameInput" placeholder="Enter lastname" class="input" />
                    <button type="submit" id="changeLastname" class="neon-subbtn">Change</button>
                </div>

                <div id="emailDiv" style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                    <p>Email: ${userInfo?.email}</p>
                    <button id="changePassword" class="neon-subbtn">Change password</button>
                </div>

                <div id="twoFAToggle" style="display: flex; align-items: center; gap: 0.5rem;">
                    <input id="twoFA" type="checkbox" />
                    <label for="twoFA">Enable Two Factor Authentication</label>
                </div>
                <div id="message"></div>
            </div>
        </div>
`;

    // BACK button listener
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            location.href = '/#dashboard';
        });
    }

    // User action buttons
    attachUsernameChange();
    attachFirstnameChange();
    attachLastnameChange();
    attachPasswordChange();

    // 2FA toggle
    const checkbox = document.getElementById('twoFA') as HTMLInputElement | null;
    if (checkbox) {
        const stored2FA = sessionStorage.getItem('twoFA');
        if (stored2FA !== null) {
            checkbox.checked = stored2FA === 'true';
        } else {
            checkbox.checked = !!userInfo?.twoFactorAuth;
            sessionStorage.setItem('twoFA', checkbox.checked.toString());
        }
        checkbox.addEventListener('change', () => {
            sessionStorage.setItem('twoFA', checkbox.checked.toString());
            toggle2FA();
        });
    }
}

// Navigate to profile
async function me() {
    const btn = document.getElementById('profileBtn');
    if (btn) {
        btn.addEventListener('click', () => {
            location.href = '/#me';
        });
    }
}

// Attach username change
function attachUsernameChange() {
    const btn = document.getElementById('changeUsername');
    const input = document.getElementById('newUsernameInput') as HTMLInputElement | null;
    const messageDiv = document.querySelector("#message");

    if (!btn || !input) return;

    const handleChange = async () => {
        const newUsername = input.value.trim();
        const jwt = sessionStorage.getItem('jwt');
        const username = decodeJwt(jwt).username;
        if (!newUsername) return alert("Please enter a new username.");
        try {
            const res = await fetch('/api/me/username', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({ newUsername, username }),
            });
            const data = await res.json();
            if (res.ok) {
                sessionStorage.setItem('jwt', data.token);
                document.getElementById('username')!.textContent = `Username: ${newUsername}`;
                input.value = '';
                    // Show bottom-right refresh prompt so changes take effect everywhere
                    try {
                        let prompt = document.getElementById('refreshPrompt');
                        if (!prompt) {
                            prompt = document.createElement('div');
                            prompt.id = 'refreshPrompt';
                            prompt.style.position = 'fixed';
                            prompt.style.right = '10px';
                            prompt.style.bottom = '10px';
                            prompt.style.zIndex = '1000';
                            prompt.style.border = '2px solid rgba(0,255,255,0.35)';
                            prompt.style.padding = '8px 10px';
                            prompt.style.background = '#0d1620';
                            prompt.style.color = '#cfffff';
                            prompt.style.boxShadow = '0 0 8px rgba(0,255,255,0.15)';
                            prompt.style.borderRadius = '8px';
                            prompt.style.fontSize = '13px';
                            prompt.innerHTML = `
                                <span>Please refresh in order for changes to take effect</span>
                                <button id="refreshPromptBtn" style="margin-left:8px; border:2px solid rgba(0,255,255,0.45); background:#0a0f16; color:#00ffff; text-shadow:0 0 6px #00ffff; padding:4px 10px; border-radius:6px;">Refresh</button>
                            `;
                            document.body.appendChild(prompt);
                            const btn = document.getElementById('refreshPromptBtn');
                            btn?.addEventListener('click', () => { window.location.reload(); });
                        }
                    } catch {}
            }
            else
                throw new Error(data.error);
        } catch (err) {
            messageDiv.textContent = `${err}`;
        }
    };

    btn.addEventListener('click', handleChange);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleChange(); });
}

// Attach firstname change
function attachFirstnameChange() {
    const btn = document.getElementById('changeFirstname');
    const input = document.getElementById('newFirstnameInput') as HTMLInputElement | null;
    const messageDiv = document.querySelector("#message");
    if (!btn || !input) return;

    const handleChange = async () => {
        const newFirstname = input.value.trim();
        if (!newFirstname) return alert("Please enter a new firstname.");
        try {
            const res = await fetch('/api/me/firstname', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionStorage.getItem('jwt')}`,
                },
                body: JSON.stringify({ newFirstname }),
            });
            const data = await res.json();
            if (res.ok) {
                sessionStorage.setItem('jwt', data.token);
                document.getElementById('firstname')!.textContent = `Firstname: ${newFirstname}`;
                input.value = '';
            }
            else {
                if (messageDiv)
                    messageDiv.textContent = `Error changing firstname: ${data.message || JSON.stringify(data.error) || "Unknown error"}`;
            }
            } catch (err) {
                messageDiv.textContent = `${err}`;
        }
    };

    btn.addEventListener('click', handleChange);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleChange(); });
}

// Attach lastname change
function attachLastnameChange() {
    const btn = document.getElementById('changeLastname');
    const input = document.getElementById('newLastnameInput') as HTMLInputElement | null;
    const messageDiv = document.querySelector("#message");
    if (!btn || !input) return;

    const handleChange = async () => {
        const newLastname = input.value.trim();
        if (!newLastname) return alert("Please enter a new lastname.");
        try {
            const res = await fetch('/api/me/lastname', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionStorage.getItem('jwt')}`,
                },
                body: JSON.stringify({ newLastname }),
            });
            const data = await res.json();
            if (res.ok) {
                sessionStorage.setItem('jwt', data.token);
                document.getElementById('lastname')!.textContent = `Lastname: ${newLastname}`;
                input.value = '';
            }
            else{
                if (messageDiv)
                    messageDiv.textContent = `Error changing lastname: ${data.message || JSON.stringify(data.error) || "Unknown error"}`;
            }
        } catch (err) {
            messageDiv.textContent = `${err}`;
        }
    };

    btn.addEventListener('click', handleChange);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleChange(); });
}

// Change password navigation
function attachPasswordChange() {
    const btn = document.getElementById('changePassword');
    if (!btn) return;
    btn.addEventListener('click', () => {
        location.href = '/#me?section=change-password';
    });
}

// Toggle 2FA
async function toggle2FA() {
    const checkbox = document.getElementById('twoFA') as HTMLInputElement | null;
    if (!checkbox) return;

    const is2FAEnabled = checkbox.checked ? 1 : 0;
    try {
        const res = await fetch('/api/me/2fa-checkbox', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${sessionStorage.getItem('jwt')}`,
            },
            body: JSON.stringify({ twoFAEnabled: is2FAEnabled }),
        });
        if (!res.ok) console.error('Failed to update 2FA');
    } catch (err) {
        console.error('Error toggling 2FA:', err);
    }
}

export { me, renderProfile, decodeJwt };
