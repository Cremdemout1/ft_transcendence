/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pong.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/01 12:45:19 by yohan             #+#    #+#             */
/*   Updated: 2025/07/01 13:11:27 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { authenticateJWT } from "./dashboard";
import { FastifyRequest, FastifyInstance } from "fastify";

type myRequest = FastifyRequest;

async function pong(fastify: FastifyInstance)
{
    fastify.get('/api/pong', async (request: myRequest, reply: any) =>
    {
        await authenticateJWT(request, reply, fastify);
        if (reply.sent)
            return ;
        const user = request.user;
        console.log(user);
        return reply.send({message:'pong Game', user});
    })
}

export { pong };