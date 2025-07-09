/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   changePassword.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/07 14:58:39 by yohan             #+#    #+#             */
/*   Updated: 2025/07/08 16:50:36 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { checkLoginState } from "./dashboard";
import {decodeJwt } from './profile'

export async function renderchangePassword() {
    checkLoginState("http://localhost:8080/api/change-password")
    const app = document.getElementById('app');
    if (!app)
        return ;
    const info = localStorage.getItem('jwt');
    let userData = null;
    if (info)
        userData = decodeJwt(info);
    app.innerHTML = `
    <div>
        <p>Changing <b>${userData.username}</b>'s password</p> 
        <input type='password' id='oldPassword' placeholder="Enter old Password" required></input>
        <input type='password' id='newPassword' placeholder="Enter new Password" required></input>
        <input type='password' id='newPasswordCopy' placeholder="Confirm" required></input>
        <button type='submit' id="changePassword">change</button>
    </div>
    <p id='message'></p>
    `;
    changePassword();
}

async function changePassword() {
    const btn = document.getElementById('changePassword');
    const oldPasswordInput = document.querySelector<HTMLInputElement>('#oldPassword');
    const newPasswordInput = document.querySelector<HTMLInputElement>('#newPassword');
    const newPasswordCopyInput = document.querySelector<HTMLInputElement>('#newPasswordCopy');
    const messageDiv = document.querySelector("#message");

    const handleChange = async () =>
    {
        const oldPassword = oldPasswordInput?.value.trim();
        const newPassword = newPasswordInput?.value.trim();
        const newPasswordCopy = newPasswordCopyInput?.value.trim();

        if (messageDiv)
            messageDiv.textContent = '';
        else
            return ;

        if (!oldPassword || !newPassword || !newPasswordCopy)
        return messageDiv.textContent = "Error changing password: All fields are required.";

        if (newPassword !== newPasswordCopy)
            return messageDiv.textContent = 'Error changing password: Passwords don\'t match';

        try {
            const res = await fetch('http://localhost:8080/api/me/change-password', 
            {
                method: "PATCH",
                headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${localStorage.getItem('jwt')}`
                            },
                body: JSON.stringify({ oldPassword: oldPassword, newPassword: newPassword }) // replace with actual new username
            });
            const data = await res.json();
            if (res.ok) {
                if (messageDiv)
                    messageDiv.textContent = data.message;
                setTimeout(() => {
                    window.location.hash = '#me';
                }, 1000); // 1 second delay
            } else {
                if (messageDiv)
                    messageDiv.textContent = `Error changing password: ${data.message || JSON.stringify(data.error) || "Unknown error"}`;
            }
        } catch(error) {
            console.log("Error changing password:", error);
        }
    }
    if (!btn || !oldPasswordInput || !newPasswordInput || !newPasswordCopyInput)
        return;
    btn.addEventListener('click', handleChange);
    [oldPasswordInput, newPasswordInput, newPasswordCopyInput].forEach(input => 
    {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter')
                handleChange();
        });
    });
}