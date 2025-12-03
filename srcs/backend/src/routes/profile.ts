/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   profile.ts                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/01 13:10:50 by yohan             #+#    #+#             */
/*   Updated: 2025/07/15 12:45:15 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { authenticateJWT } from "./dashboard";
import { FastifyRequest, FastifyInstance } from "fastify";
import { createNewToken } from './token';
import { orm } from '../server';

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
}

async function profile(fastify: FastifyInstance)
{
    fastify.get('/api/me', async (request: myRequest, reply: any) =>
    {
        await authenticateJWT(request, reply, fastify);
        if (reply.sent)
            return ;
        const user = request.user;
        console.log(user);
        return reply.send({message:'User profile', user});
    })

    // Public profile lookup by username for mini-profile cards
    fastify.get('/api/profile/:username', async (request: myRequest, reply: any) => {
        try {
            const { username } = request.params as any;
            if (!username) return reply.code(400).send({ error: 'username required' });
            const info = orm.getUserByUsername(username);
            if (!info) return reply.code(404).send({ error: 'user not found' });
            const account = orm.getUserByID(info.id);
            return reply.send({
                username: info.username,
                firstname: info.firstname,
                lastname: info.lastname,
                email: account?.email ?? null,
            });
        } catch (e) {
            return reply.code(500).send({ error: 'profile lookup failed' });
        }
    });
}

async function changeUsername(fastify: FastifyInstance)
{
    fastify.patch('/api/me/username', async (request: myRequest, reply: any) =>
    {
        await authenticateJWT(request, reply, fastify);
        if (reply.sent)
            return;
        const { newUsername, username } = request.body as { newUsername: string, username: string };
        const user = request.user as JWTformat;
        console.log(user);
        if (!newUsername || newUsername.trim() === '')
            return reply.status(400).send({error: "Username invalid"});

        console.log("new username: " + newUsername + "\nold username: " + username);
        if (newUsername === username)
            return reply.status(409).send({error: "Username can't be the same"});
        const existingUser = orm.getUserByUsername(newUsername);
        console.log("existing user: ");
        console.log(existingUser);
        if (existingUser)
            return reply.status(409).send({error: "Username already taken"});
        else
        {
            // await prisma.user_info.update({
            //     where: { id: user.user_id },
            //     data:  { username: newUsername }
            // });
            if (orm.updateUser(user.user_id, 'username', newUsername) == -1)
                return reply.status(422).send({ error: 'new username contains invalid characters' });
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
            // await prisma.user_info.update({
            //     where: { id: user.user_id },
            //     data:  { firstname: newFirstname }
            // });
            if (orm.updateUser(user.user_id, 'firstname', newFirstname) == -1)
                return reply.status(422).send({ error: 'new firstname contains invalid characters' });
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
            // await prisma.user_info.update({
            //     where: { id: user.user_id },
            //     data:  { lastname: newLastname }
            // });
            if (orm.updateUser(user.user_id, 'lastname', newLastname) == -1)
                return reply.status(422).send({ error: 'new lastname contains invalid characters' });
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

async function toggle2FA(fastify: FastifyInstance)
{
    fastify.patch('/api/me/2fa-checkbox', async (request: myRequest, reply: any) => 
    {
        console.log("aaaaaaa");
        await authenticateJWT(request, reply, fastify);
        if (reply.sent) return;

        const { twoFAEnabled } = request.body as { twoFAEnabled: number };
        const user = request.user as JWTformat;
        console.log("USER:");
        console.log(user);
        if (twoFAEnabled !== 0 && twoFAEnabled !== 1) {
            console.log("inside urmom");
            return reply.code(400).send({ error: "Invalid value for 2FA" });
        }

        // await prisma.users.update({
        //     where: { id: user.user_id },
        //     data: { twoFactorAuth: twoFAEnabled },
        // });
        orm.updateUser(user.user_id, 'twoFactorAuth', twoFAEnabled);
        // const updatedUser = await prisma.users.findUnique({
        //     where: { id: user.user_id },
        //     include: { user_info: true },
        // });
        const idx = user ? user.user_id : null;
        const updatedUser = orm.getUserByID(idx!);
        const userInfo = orm.getUserInfoTable(idx!);
        console.log("IDX: "+ idx);
        console.log(updatedUser);
        console.log(userInfo);
        console.log("-----------");
        if (!updatedUser)
            return reply.code(500).send({ error: "Updated user not found" });
        // const email = updatedUser ? updatedUser.email : null;
        // const login_type = updatedUser ? updatedUser.login_type : null;
        // const twoFactorAuth = updatedUser ? updatedUser.twoFactorAuth : null;
        // const id = updatedUser ? updatedUser.id : null;
        // const username = userInfo ? userInfo.username : null;
        // const firstname = userInfo ? userInfo.firstname : null;
        // const lastname = userInfo ? userInfo.lastname : null;
        const token = await createNewToken(fastify, user);

        return reply.send({ success: true, twoFA: twoFAEnabled, token });
    });
}


export { profile, changeUsername, changeFirstname, changeLastname, toggle2FA };