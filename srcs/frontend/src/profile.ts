/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   profile.ts                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/01 12:52:55 by yohan             #+#    #+#             */
/*   Updated: 2025/07/01 13:32:16 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { checkLoginState } from './dashboard';
import { backToDashboard } from './pong';

async function renderProfile() {
    await checkLoginState("http://localhost:8080/api/me")
    const app = document.getElementById('app');
    if (!app)
        return ;
    const info = localStorage.getItem('jwt'); 
    //show stuff about user here
    //add buttons to change email, name, user, etc
    app.innerHTML = `
    <div>
        <button id="backToDashboard">back</button>
        <h3>add info hereeee</h3>
    </div>`;
    backToDashboard();
}

async function me() {
    const btn = document.getElementById('profileBtn');
     if (btn) {
     btn.addEventListener('click', () => {
         location.href = '/#me';
         });
     };
}

export { me, renderProfile };