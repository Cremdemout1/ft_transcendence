/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   profile.ts                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/01 12:52:55 by yohan             #+#    #+#             */
/*   Updated: 2025/07/06 22:52:44 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { checkLoginState } from './dashboard';
import { backToDashboard } from './pong';

function decodeJwt(token: string) {
    try {
      const payloadBase64Url = token.split('.')[1]; // middle part is payload
      const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = atob(payloadBase64);
      return JSON.parse(payloadJson);
    } catch (e) {
      console.error('Invalid JWT token', e);
      return null;
    }
}  

async function renderProfile() {
    await checkLoginState("http://localhost:8080/api/me")
    const app = document.getElementById('app');
    if (!app)
        return ;
    const info = localStorage.getItem('jwt');
    let userInfo;
    if (info)
        userInfo = decodeJwt(info);
    //show stuff about user here
    //add buttons to change email, name, user, etc
    app.innerHTML = `
    <div>
        <button id="backToDashboard">back</button>
        <div id='userInfo'>
            <div id='usernameDiv'>
                <p id='username'>Username: ${userInfo?.username}</p>
                <input type="text" id="newUsernameInput" placeholder="Enter new username" />
                <button type='submit' id="changeUsername">change</button>
            </div>
            <p>Firstname: ${userInfo?.firstname}</p>
            <p>Lastname: ${userInfo?.lastname}</p>
            <p>email: ${userInfo?.email}</p>
        </div>
    </div>`;
    backToDashboard();
    changeUsername();
}

async function me() {
    const btn = document.getElementById('profileBtn');
     if (btn) {
     btn.addEventListener('click', () => {
         location.href = '/#me';
         });
     };
}

async function changeUsername() {
    const btn = document.getElementById('changeUsername') 
    const input = document.querySelector<HTMLInputElement>('#newUsernameInput');
    if (!btn || !input)
        return ;
    const handleChange = async () => 
    {
        const newUsername = input?.value.trim();
        if (!newUsername || newUsername === '') {
            alert("Please enter a new username.");
            return;
        }
        try {
            const res = await fetch('http://localhost:8080/api/me/username', 
            {
                method: "PATCH",
                headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${localStorage.getItem('jwt')}`
                            },
                body: JSON.stringify({ newUsername: newUsername }) // replace with actual new username
            }
            );
            const data = await res.json() as { message: string; token: string };
            if (res.ok)
            {
                localStorage.removeItem('jwt');
                localStorage.setItem('jwt', data.token);
                document.getElementById('username')!.textContent = "Username: " + newUsername;
                input.value = '';
            }
        }
        catch (error) {
            console.log("Error changing username:", error);
        }
    };
    btn.addEventListener('click', handleChange);
    input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleChange();
        }
    })
}

export { me, renderProfile, changeUsername };