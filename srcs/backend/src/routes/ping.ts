/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ping.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/12/04 05:18:43 by yohan             #+#    #+#             */
/*   Updated: 2025/12/04 13:45:21 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { FastifyInstance, FastifyRequest } from "fastify";
import { authenticateJWT } from "./dashboard"
import { decodeJwt } from "./dashboard";

type myRequest = FastifyRequest;


export default async function authenticatePing(fastify: FastifyInstance) {
    
    fastify.post('/api/ping', async (request: myRequest, reply: any) => {
        await authenticateJWT(request, reply, fastify);
        if (reply.sent) return;
        
        const token = request.headers.authorization!.split(" ")[1];
        if (!token) {
            return reply.status(400).send({ error: "Missing token" });
        }

        let email;
        try {
            const decoded = decodeJwt(token);
            email = decoded.email;
        } catch (err) {
            return reply.status(400).send({ error: "Invalid token" });
        }

        // Refresh user presence in Redis
        try {
            await fastify.redis.set(email, "1", "EX", 30); // 30 seconds TTL
            return reply.send({ ok: true });
        } catch (err) {
            return reply.status(500).send({ error: "Failed to refresh presence in Redis" });
        }
    });

}
