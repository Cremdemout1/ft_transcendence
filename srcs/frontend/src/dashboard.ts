/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dashboard.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/19 11:21:57 by ycantin           #+#    #+#             */
/*   Updated: 2025/09/03 10:06:35 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { changeProfilePic } from './changeProfilePic';
import { logout } from './login';
import { play } from './pong';
import { decodeJwt, me } from './profile';

async function checkLoginState(path:string) {
    const token = localStorage.getItem('jwt');
    if (!token) {
        return location.hash = '/#login';
    }
    const res = await fetch(path, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    const data = await res.json();
    if (res.ok) {
        //display user info correctly later
        console.log(data);
    } else {
        console.log(`Failed to authenticate user: ${JSON.stringify(data.error) || 'Unknown error'}`);
        return location.hash = '/#login';
    }
}

async function fetchDashboard() {
}

function renderDashboard() {
    checkLoginState("http://localhost:8080/api/dashboard");
    
    const app = document.getElementById('app');
    const info = localStorage.getItem('jwt');
    let userInfo;
    
    if (info) userInfo = decodeJwt(info);
    if (!app || !userInfo)
        return ;

    app.innerHTML = `
    <div name="options">
        <div class="profile-upload-wrapper">
            <label for="profileInput" class="profile-button">
                <img id="profileImage" src="http://localhost:8080${userInfo.profile_pic}" alt="Profile Picture" width="30" height="30"/>
                <div class="hover-text">Change</div>
            </label>
            <input type="file" id="profileInput" accept="image/*" style="display: none" />
        </div>
        <button id="profileBtn" class="btn">Profile</button>
        <button id="playBtn" class="btn">Play</button>
        <button>History</button>
        <button id="logoutBtn" class="btn">log out</button>
    </div>`;
    changeProfilePic();
    logout();
    play();
    me();
};

export { checkLoginState, fetchDashboard, renderDashboard };