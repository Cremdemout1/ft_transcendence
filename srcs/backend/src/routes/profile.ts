/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   profile.ts                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/01 13:10:50 by yohan             #+#    #+#             */
/*   Updated: 2025/07/07 14:40:45 by yohan            ###   ########.fr       */
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
            return reply.status(400).send({error: "newLastname invalid"});
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

export { profile, changeUsername, changeFirstname, changeLastname };