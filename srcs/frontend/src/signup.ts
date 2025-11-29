/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   signup.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: luiberna <luiberna@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/10 13:22:49 by ycantin           #+#    #+#             */
/*   Updated: 2025/11/28 16:29:30 by luiberna         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import {emitPresence} from './presence';

export function checkregex(username: string | null, firstname: string | null, lastname:string | null, email: string | null, password: string | null)
{
    let regexUsername= /^[a-zA-Z0-9_]{1,15}$/;
    let regexNames= /^[a-zA-Z0-9]{1,20}$/;
    let regexPassword= /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$/;
    let regexEmail= /^[a-zA-Z0-9._]+@[a-zA-Z0-9.-_]+\.[a-zA-Z]{2,}$/;
    
    if(firstname){
        if(!regexNames.test(firstname))
            throw new Error("first name contains forbidden characters");
    }
    if(lastname){
        if(!regexNames.test(lastname))
            throw new Error("last name contains forbidden characters");
    }
    if(username)
    {
        if(!regexUsername.test(username))
            throw new Error("username contains forbidden characters");
    }
    if(email){
        if(!regexEmail.test(email))
            throw new Error("email contains forbidden characters");
    }
    if(password){
        if(!regexPassword.test(password))
            throw new Error("password contains forbidden characters");
    }

}

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
        try {checkregex(username, firstname, lastname, email, password);}
        catch(error) {messageDiv.textContent = `Sign up failed: ${error} || 'Unknown error'}`;}
        try {
            const res = await fetch("/api/signup",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, username, firstname, lastname }),
            });

            const data = await res.json();
            console.log(data);
            if (res.ok) {
                sessionStorage.setItem('jwt', data.token);
                if (messageDiv) {
                    messageDiv.textContent = "Successful signup!";
                }
                emitPresence();
                location.hash = '#dashboard';
            } else {
                if (messageDiv) {
                    messageDiv.textContent = `Sign up failed: ${data.message || data.error || 'Unknown error'}`;
                }
            }
            console.log("Response form backend:", data);
        }
        catch(err) {
            console.log("Error connecting to backend:", err);
        }
    });
}

export { backendSignup };
