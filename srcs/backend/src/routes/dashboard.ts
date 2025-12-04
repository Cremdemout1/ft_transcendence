/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dashboard.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/09 12:33:23 by yohan             #+#    #+#             */
/*   Updated: 2025/12/04 05:36:10 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { FastifyRequest, FastifyInstance } from "fastify";
import { orm } from "../server";


export function decodeJwt(token: string | null) {
    if (token === null)
    {
        location.hash = "#login";
        throw new Error("jwt is null");
    }
    try {
        const payloadBase64Url = token.split('.')[1];
        const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payloadJson = atob(payloadBase64);
        return JSON.parse(payloadJson);
    } catch (e) {
        console.error('Invalid JWT token', e);
        return null;
    }
}

type myRequest = FastifyRequest;

export async function authenticateJWT(request: myRequest, reply: any, fastify: FastifyInstance) {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.status(401).send({ error: 'Missing token' })
        return ;
    };

    const token = authHeader?.split(' ')[1];
    if (token) {
        try {
            const decoded = await fastify.jwt.verify(token);
            const jwtUser = decodeJwt(token);
            if (!orm.getUserByEmail(jwtUser.email))
                throw new Error("User does not exist");
            request.user = decoded;
        } catch (err) {
            reply.status(401).send({ error: err })
        }
    };
}

async function dashboard(fastify: FastifyInstance)
{
    fastify.get('/api/dashboard', async (request: myRequest, reply: any) =>
    {
        await authenticateJWT(request, reply, fastify);
        if (reply.sent)
            return ;
        const user = request.user;
        return reply.send({message:'User dashboard', user});
    })
}


export { dashboard }