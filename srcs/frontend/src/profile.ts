/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   profile.ts                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/01 12:52:55 by yohan             #+#    #+#             */
/*   Updated: 2025/07/08 22:09:01 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { checkLoginState } from './dashboard';
import { backToDashboard } from './pong';

export function decodeJwt(token: string) {
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
                <input type="text" id="newUsernameInput" placeholder="Enter username" />
                <button type='submit' id="changeUsername">change</button>
            </div>
            <div id='firstnameDiv'>
                <p id='firstname'>Firstname: ${userInfo?.firstname}</p>
                <input type="text" id="newFirstnameInput" placeholder="Enter firstname" />
                <button type='submit' id="changeFirstname">change</button>
            </div>
            <div id='lastnameDiv'>
                <p id='lastname'>Lastname: ${userInfo?.lastname}</p>
                <input type="text" id="newLastnameInput" placeholder="Enter lastname" />
                <button type='submit' id="changeLastname">change</button>
            </div>
            <div id='emailDiv'>
                <p>email: ${userInfo?.email}</p>
                <button id='changePassword'>Change password</button>
            </div>
        </div>
    </div>`;
    backToDashboard();
    changeUsername();
    changeFirstname();
    changeLastname();
    changePassword();
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
            });
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

async function changeFirstname() {
    const btn = document.getElementById('changeFirstname') 
    const input = document.querySelector<HTMLInputElement>('#newFirstnameInput');
    if (!btn || !input)
        return ;
    const handleChange = async () => 
    {
        const newFirstname = input?.value.trim();
        if (!newFirstname || newFirstname === '') {
            alert("Please enter a new Firstname.");
            return;
        }
        try {
            const res = await fetch('http://localhost:8080/api/me/firstname', 
            {
                method: "PATCH",
                headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${localStorage.getItem('jwt')}`
                            },
                body: JSON.stringify({ newFirstname: newFirstname }) // replace with actual new username
            }
            );
            const data = await res.json() as { message: string; token: string };
            if (res.ok)
            {
                localStorage.removeItem('jwt');
                localStorage.setItem('jwt', data.token);
                document.getElementById('firstname')!.textContent = "Firstname: " + newFirstname;
                input.value = '';
            }
        }
        catch (error) {
            console.log("Error changing firstname:", error);
        }
    };
    btn.addEventListener('click', handleChange);
    input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleChange();
        }
    })
}


async function changeLastname() {
    const btn = document.getElementById('changeLastname') 
    const input = document.querySelector<HTMLInputElement>('#newLastnameInput');
    if (!btn || !input)
        return ;
    const handleChange = async () => 
    {
        const newLastname = input?.value.trim();
        if (!newLastname || newLastname === '') {
            alert("Please enter a new Lastname.");
            return;
        }
        try {
            const res = await fetch('http://localhost:8080/api/me/lastname', 
            {
                method: "PATCH",
                headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${localStorage.getItem('jwt')}`
                            },
                body: JSON.stringify({ newLastname: newLastname }) // replace with actual new username
            }
            );
            const data = await res.json() as { message: string; token: string };
            if (res.ok)
            {
                localStorage.removeItem('jwt');
                localStorage.setItem('jwt', data.token);
                document.getElementById('lastname')!.textContent = "Lastname: " + newLastname;
                input.value = '';
            }
        }
        catch (error) {
            console.log("Error changing lastname:", error);
        }
    };
    btn.addEventListener('click', handleChange);
    input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleChange();
        }
    })
}

async function changePassword() {
    const btn = document.getElementById('changePassword');
    if (btn) {
        btn.addEventListener('click', () => {
            location.href = '/#me?section=change-password';
        });
    }
}

export { me, renderProfile, changeUsername };