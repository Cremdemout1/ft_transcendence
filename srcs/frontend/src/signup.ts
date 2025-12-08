/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   signup.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/10 13:22:49 by ycantin           #+#    #+#             */
/*   Updated: 2025/12/04 15:22:40 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import {emitPresence} from './presence';
import { startPing } from './ping';

// export function checkregex(username: string | null, firstname: string | null, lastname:string | null, email: string | null, password: string | null)
// {
//     let regexUsername= /^[a-zA-Z0-9_]{1,15}$/;
//     let regexNames= /^[a-zA-Z0-9]{1,20}$/;
//     let regexPassword= /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$/;
//     let regexEmail= /^[a-zA-Z0-9._]+@[a-zA-Z0-9.-_]+\.[a-zA-Z]{2,}$/;
    
//     if(firstname){
//         if(!regexNames.test(firstname))
//             throw new Error("first name has an invalid format/characters");
//     }
//     if(lastname){
//         if(!regexNames.test(lastname))
//             throw new Error("last name has an invalid format/characters");
//     }
//     if(username)
//     {
//         if(!regexUsername.test(username))
//             throw new Error("username has an invalid format/characters");
//     }
//     if(email){
//         if(!regexEmail.test(email))
//             throw new Error("email has an invalid format/characters");
//     }
//     if(password){
//         if(!regexPassword.test(password))
//             throw new Error("password has an invalid format/characters");
//     }

// }

async function backendSignup() {
    const form = document.querySelector("#signup-form");
    const messageDiv = document.querySelector("#message");
    form?.addEventListener("submit", async event => {
        event.preventDefault();

        if (messageDiv) {
            messageDiv.textContent = "";
        }

        const firstname = (document.querySelector("input[name='firstname']") as HTMLInputElement).value;
        const lastname = (document.querySelector("input[name='lastname']") as HTMLInputElement).value;
        const username = (document.querySelector("input[name='username']") as HTMLInputElement).value;
        const email = (document.querySelector("input[name='email']") as HTMLInputElement).value;
        const password = (document.querySelector("input[name='password']") as HTMLInputElement).value;
        // try {checkregex(username, firstname, lastname, email, password);}
        // catch(error) {messageDiv!.textContent = `Sign up failed: ${error || 'Unknown error}'}`;return;}
        try {
            const res = await fetch("/api/signup",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, username, firstname, lastname }),
            });

            const data = await res.json();
            if (res.ok) {
                sessionStorage.setItem('jwt', data.token);
                if (messageDiv) {
                    messageDiv.textContent = "Successful signup!";
                }
                emitPresence();
                startPing();
                location.hash = '#dashboard';
            } else {
                if (messageDiv) {
                    messageDiv.textContent = `Sign up failed: ${data.message || data.error || 'Unknown error'}`;
                }
            }
        }
        catch(err) {
            // console.log("Error connecting to backend:", err);
			void(err);
        }
    });
}

export { backendSignup };
