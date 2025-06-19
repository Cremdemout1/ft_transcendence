/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dashboard.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ycantin <ycantin@student.42.fr>            +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/09 12:33:23 by yohan             #+#    #+#             */
/*   Updated: 2025/06/19 15:21:24 by ycantin          ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { FastifyRequest, FastifyInstance } from "fastify";

type myRequest = FastifyRequest;

export async function authenticateJWT(request: myRequest, reply: any, fastify: FastifyInstance) {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.status(401).send({ error: 'Missing token' })
    };

    const token = authHeader?.split(' ')[1];
    if (token) {
        try {
            const decoded = fastify.jwt.verify(token)
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
        console.log(user);
        return reply.send({message:'User dashboard', user});
    })
}

// async function dashboardGameRoute(fastify: FastifyInstance)
// {
//     fastify.post('/dashboard/game', async (request: myRequest, reply: any) =>
//     {
        
//     })
// }

export { dashboard }