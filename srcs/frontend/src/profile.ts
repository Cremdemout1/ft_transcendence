/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   profile.ts                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: phantasiae <phantasiae@student.42.fr>      +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/01 12:52:55 by yohan             #+#    #+#             */
/*   Updated: 2025/11/26 17:06:35 by phantasiae       ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { checkLoginState } from './dashboard';

function decodeJwt(token: string) {
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
    await checkLoginState("http://10.101.172.74:8080/api/me");

    const app = document.getElementById('app');
    if (!app) return;

    const info = localStorage.getItem('jwt');
    const userInfo = info ? decodeJwt(info) : null;

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
        const stored2FA = localStorage.getItem('twoFA');
        if (stored2FA !== null) {
            checkbox.checked = stored2FA === 'true';
        } else {
            checkbox.checked = !!userInfo?.twoFactorAuth;
            localStorage.setItem('twoFA', checkbox.checked.toString());
        }
        checkbox.addEventListener('change', () => {
            localStorage.setItem('twoFA', checkbox.checked.toString());
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
    if (!btn || !input) return;

    const handleChange = async () => {
        const newUsername = input.value.trim();
        if (!newUsername) return alert("Please enter a new username.");
        try {
            const res = await fetch('http://10.101.172.74:8080/api/me/username', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('jwt')}`,
                },
                body: JSON.stringify({ newUsername }),
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('jwt', data.token);
                document.getElementById('username')!.textContent = `Username: ${newUsername}`;
                input.value = '';
            }
        } catch (err) {
            console.error('Error changing username:', err);
        }
    };

    btn.addEventListener('click', handleChange);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleChange(); });
}

// Attach firstname change
function attachFirstnameChange() {
    const btn = document.getElementById('changeFirstname');
    const input = document.getElementById('newFirstnameInput') as HTMLInputElement | null;
    if (!btn || !input) return;

    const handleChange = async () => {
        const newFirstname = input.value.trim();
        if (!newFirstname) return alert("Please enter a new firstname.");
        try {
            const res = await fetch('http://10.101.172.74:8080/api/me/firstname', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('jwt')}`,
                },
                body: JSON.stringify({ newFirstname }),
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('jwt', data.token);
                document.getElementById('firstname')!.textContent = `Firstname: ${newFirstname}`;
                input.value = '';
            }
        } catch (err) {
            console.error('Error changing firstname:', err);
        }
    };

    btn.addEventListener('click', handleChange);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleChange(); });
}

// Attach lastname change
function attachLastnameChange() {
    const btn = document.getElementById('changeLastname');
    const input = document.getElementById('newLastnameInput') as HTMLInputElement | null;
    if (!btn || !input) return;

    const handleChange = async () => {
        const newLastname = input.value.trim();
        if (!newLastname) return alert("Please enter a new lastname.");
        try {
            const res = await fetch('http://10.101.172.74:8080/api/me/lastname', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('jwt')}`,
                },
                body: JSON.stringify({ newLastname }),
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('jwt', data.token);
                document.getElementById('lastname')!.textContent = `Lastname: ${newLastname}`;
                input.value = '';
            }
        } catch (err) {
            console.error('Error changing lastname:', err);
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
        const res = await fetch('http://10.101.172.74:8080/api/me/2fa-checkbox', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('jwt')}`,
            },
            body: JSON.stringify({ twoFAEnabled: is2FAEnabled }),
        });
        if (!res.ok) console.error('Failed to update 2FA');
    } catch (err) {
        console.error('Error toggling 2FA:', err);
    }
}

export { me, renderProfile, decodeJwt };
