/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   server.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/03 17:45:59 by yohan             #+#    #+#             */
/*   Updated: 2025/06/04 18:07:16 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import * as lib from './index';
import { loginRoute } from './index';

const fastify = lib.Fastify({ logger: true })


function registerNewRoute(fastify: lib.FastifyInstance, route: lib.FastifyPluginAsync): boolean
{
    let success: boolean = true;
    try
    {
        fastify.register(route);
    }
    catch(err)
    {
        success = false;
        console.log(err);
    }
    return success;
}

fastify.get('/', async (request: lib.myRequest, reply: any) =>
{
    void request;
    reply.send({message:'Initial page'});
})

async function startServer()
{
    try
    {
        await fastify.listen({port : 3000, host : '0.0.0.0'})
        console.log("server listening on port 3000")
    }
    catch (err)
    {   
        fastify.log.error(err)
        process.exit(1)
    }
}

startServer();
registerNewRoute(fastify, loginRoute);