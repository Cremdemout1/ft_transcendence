/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   profile.ts                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/01 13:10:50 by yohan             #+#    #+#             */
/*   Updated: 2025/07/18 11:21:05 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { authenticateJWT } from "./dashboard";
import { FastifyRequest, FastifyInstance } from "fastify";
import { prisma } from '../server';
import { createNewToken } from './token';

type myRequest = FastifyRequest;

export interface JWTformat
{
        id: number,
        user_id: number,
        email: string,  
        login_type: string,
        username: string,
        firstname: string,
        lastname: string,
        twoFactorAuth: number,
        profile_pic: string,
}

async function profile(fastify: FastifyInstance)
{
    fastify.get('/api/me', async (request: myRequest, reply: any) =>
    {
        await authenticateJWT(request, reply, fastify);
        if (reply.sent)
            return ;
        const user = request.user;
        return reply.send({message:'User profile', user});
    })
}

async function changeUsername(fastify: FastifyInstance)
{
    fastify.patch('/api/me/username', async (request: myRequest, reply: any) =>
    {
        await authenticateJWT(request, reply, fastify);
        if (reply.sent)
            return;
        const { newUsername } = request.body as { newUsername: string };
        const user = request.user as JWTformat;

        if (!newUsername || newUsername.trim() === '')
            return reply.status(400).send({error: "Username invalid"});
        const existingUser = await prisma.user_info.findFirst(
        { 
            where: 
            {
                    username: newUsername ,
                    NOT: { id: user.user_id, },
            },
            });
        if (existingUser)
            return reply.status(409).send({error: "Username already taken"});
        else
        {
            await prisma.user_info.update({
                where: { id: user.user_id },
                data:  { username: newUsername }
            });
        }
        const newToken = await createNewToken(fastify, user);
        if (newToken)
            return reply.send({ 
                message: `successfully changed username to ${newUsername}`, 
                token: newToken
            });
        return reply.status(400).send({ error: "error fetching new JWT" });
    })
}


async function changeFirstname(fastify: FastifyInstance)
{
    fastify.patch('/api/me/firstname', async (request: myRequest, reply: any) =>
    {
        await authenticateJWT(request, reply, fastify);
        if (reply.sent)
            return;
        const { newFirstname } = request.body as { newFirstname: string };
        const user = request.user as JWTformat;

        if (!newFirstname || newFirstname.trim() === '')
            return reply.status(400).send({error: "newFirstname invalid"});
        else
        {
            await prisma.user_info.update({
                where: { id: user.user_id },
                data:  { firstname: newFirstname }
            });
        }
        const newToken = await createNewToken(fastify, user);
        if (newToken)
            return reply.send({ 
                message: `successfully changed username to ${newFirstname}`, 
                token: newToken
            });
        return reply.status(400).send({ error: "error fetching new JWT" });
    })
}


async function changeLastname(fastify: FastifyInstance)
{
    fastify.patch('/api/me/lastname', async (request: myRequest, reply: any) =>
    {
        await authenticateJWT(request, reply, fastify);
        if (reply.sent)
            return;
        const { newLastname } = request.body as { newLastname: string };
        const user = request.user as JWTformat;

        if (!newLastname || newLastname.trim() === '')
            return reply.status(400).send({error: "new Lastname invalid"});
        else
        {
            await prisma.user_info.update({
                where: { id: user.user_id },
                data:  { lastname: newLastname }
            });
        }
        const newToken = await createNewToken(fastify, user);
        if (newToken)
            return reply.send({ 
                message: `successfully changed username to ${newLastname}`, 
                token: newToken
            });
        return reply.status(400).send({ error: "error fetching new JWT" });
    })
}

// async function toggle2FA(fastify: FastifyInstance)
// {
//     fastify.patch('/api/me/2fa-checkbox', async (request: myRequest, reply: any) => 
//     {
//         await authenticateJWT(request, reply, fastify);
//         if (reply.sent)
//             return ;
//         const { twoFAEnabled } = request.body as { twoFAEnabled: number };
//         const user = request.user as JWTformat;

//         if (twoFAEnabled !== 0 && twoFAEnabled !== 1)
//             return reply.code(400).send({ error: "Invalid value for 2FA" });
//         await prisma.users.update({
//             where: { id: user.user_id },
//             data: { twoFactorAuth: twoFAEnabled },
//         });
//         // const updatedUser = await prisma.users.findFirst({
//         //     where: { id: user.id },
//         //     include: {user_info: true },
//         // });
//         // if (updatedUser)
//         // {
//         //     createNewToken(fastify, updatedUser);
//         // }
//         createNewToken(fastify, user);
//         return reply.send({ success: true, twoFA: twoFAEnabled });
//     });
// }

async function toggle2FA(fastify: FastifyInstance)
{
    fastify.patch('/api/me/2fa-checkbox', async (request: myRequest, reply: any) => 
    {
        await authenticateJWT(request, reply, fastify);
        if (reply.sent) return;

        const { twoFAEnabled } = request.body as { twoFAEnabled: number };
        const user = request.user as JWTformat;

        if (twoFAEnabled !== 0 && twoFAEnabled !== 1)
            return reply.code(400).send({ error: "Invalid value for 2FA" });

        await prisma.users.update({
            where: { id: user.user_id },
            data: { twoFactorAuth: twoFAEnabled },
        });
        const updatedUser = await prisma.users.findUnique({
            where: { id: user.user_id },
            include: { user_info: true },
        });
        if (!updatedUser)
            return reply.code(500).send({ error: "Updated user not found" });

        const token = await createNewToken(fastify, {
            id: updatedUser.id,
            user_id: updatedUser.user_info.id,
            email: updatedUser.email,
            login_type: updatedUser.login_type,
            username: updatedUser.user_info.username,
            firstname: updatedUser.user_info.firstname,
            lastname: updatedUser.user_info.lastname,
            twoFactorAuth: updatedUser.twoFactorAuth,
            profile_pic: updatedUser.user_info.profile_pic,
        });

        return reply.send({ success: true, twoFA: twoFAEnabled, token });
    });
}


export { profile, changeUsername, changeFirstname, changeLastname, toggle2FA };