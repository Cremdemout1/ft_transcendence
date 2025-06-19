/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dashboard.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ycantin <ycantin@student.42.fr>            +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/09 12:33:23 by yohan             #+#    #+#             */
/*   Updated: 2025/06/19 14:50:01 by ycantin          ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import * as lib from '../index'

export async function authenticateJWT(request: lib.myRequest, reply: any, fastify: lib.FastifyInstance) {
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

async function dashboard(fastify: lib.FastifyInstance)
{
    fastify.get('/api/dashboard', async (request: lib.myRequest, reply: any) =>
    {
        await authenticateJWT(request, reply, fastify);
        if (reply.sent)
            return ;
        const user = request.user;
        console.log(user);
        return reply.send({message:'User dashboard', user});
    })
}

// async function dashboardGameRoute(fastify: lib.FastifyInstance)
// {
//     fastify.post('/dashboard/game', async (request: lib.myRequest, reply: any) =>
//     {
        
//     })
// }

export { dashboard }