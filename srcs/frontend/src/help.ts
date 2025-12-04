/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   help.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/12/03 20:13:12 by yohan             #+#    #+#             */
/*   Updated: 2025/12/04 15:19:59 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { checkLoginState } from "./dashboard";

export default function renderHelpScreen() {
    checkLoginState(null);
    const app = document.getElementById("app");

    if (!app) return;
    app.innerHTML = `
        <div class="menu-container">
            <h2 class="uppercase text-center">3D controls</h2>
            <ul class="text-center list-disc list-inside mb-6">
                <li class="text-sm">Use mouse to look around</li>
                <li class="text-sm">Use wheel to zoom</li>
                <li class="text-sm">Esc to unbind mouse</li>
            </ul>

            <h2 class="uppercase text-center mt-4">Local Games</h2>
            <ul class="text-center list-disc list-inside mb-6">
                <li class="text-sm">Player 1 (red): W-A-S-D</li>
                <li class="text-sm">Player 2 (blue): Arrow keys</li>
            </ul>

            <h2 class="uppercase text-center mt-4">Other gamemode</h2>
            <ul class="text-center list-disc list-inside mb-6">
                <li class="text-sm">Move Paddle: W-A-S-D</li>
                <li class="text-sm">Move Camera: Arrows / mouse</li>
            </ul>

            <button class="neon-btn mt-4" id="backBtn">Back to Dashboard</button>
        </div>
    `;
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            location.href = '/#dashboard';
        });
    }
}