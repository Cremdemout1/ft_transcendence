/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   changeProfilePic.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/18 12:27:16 by yohan             #+#    #+#             */
/*   Updated: 2025/09/03 10:39:04 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { decode } from "punycode";
import { checkLoginState } from "./dashboard";
import {decodeJwt } from './profile'

export function changeProfilePic() {
    checkLoginState("http://localhost:8080/api/dashboard");
    const profileInput = document.getElementById('profileInput') as HTMLInputElement;
    const profileImage = document.getElementById('profileImage');
    if (!profileImage || !profileInput)
        return;
    profileInput.addEventListener('change', function () {
        const file = this.files?.[0];
        if (file)
            handleChange(file);
    });
    
    const handleChange = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('http://localhost:8080/api/change-profile-pic', {
                method: 'PATCH',
                body: formData,
                credentials: 'include',
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("jwt")}`
                  }
            });

            const data = await res.json() as { message: string; token: string };
            if (res.ok)
                {
                    localStorage.removeItem('jwt');
                    localStorage.setItem('jwt', data.token);
                    const JWT = decodeJwt(data.token);

                    const profileImage = document.getElementById('profileImage') as HTMLImageElement;
                    if (profileImage)
                        profileImage.src = `http://localhost:8080${JWT.profile_pic}`;
                }
        } catch (error) {
            console.error('Error uploading profile picture:', error);
        }
    };
}