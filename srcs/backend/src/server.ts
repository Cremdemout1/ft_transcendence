/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   server.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/03 17:45:59 by yohan             #+#    #+#             */
/*   Updated: 2025/06/09 13:00:35 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import * as lib from './index';
import { login } from './index';
import dotenv from 'dotenv';
import { SignUp } from './index';
import { dashboard } from './routes/dashboard';

dotenv.config();
const fastify = lib.Fastify({ logger: true })


async function startSwagger(){
    await fastify.register(lib.swagger, {
        swagger: {
          info: {
            title: 'My API',
            description: 'API documentation',
            version: '1.0.0',
          },
          host: 'localhost:3000',
          schemes: ['http'],
          consumes: ['application/json'],
          produces: ['application/json'],
        }
      });
      
      await fastify.register(lib.swaggerUI, {
        routePrefix: '/docs',
        uiConfig: {
          docExpansion: 'full',
          deepLinking: false,
        },
      });
      
      fastify.get('/ping', {
        schema: {
          description: 'Ping the server',
          tags: ['Health'],
          summary: 'Health check',
          response: {
            200: {
              description: 'Successful response',
              type: 'object',
              properties: {
                pong: { type: 'string' }
              }
            }
          }
        }
      }, async (request, reply) => {
        void request, reply;
        return { pong: 'it worked!' };
      });
}

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
      await startSwagger()
      await fastify.listen({port : 3000, host : '0.0.0.0'})
      console.log("server listening on port 3000")
    }
    catch (err)
    {   
        fastify.log.error(err)
        process.exit(1)
    }
}

async function registerAll(fastify:lib.FastifyInstance)
{
  const jwtSecret = process.env.JWT_SECRET || 'super-secret';
  await fastify.register(lib.jwt, { secret : jwtSecret });
  await fastify.register(lib.fastifyFormBody);
  registerNewRoute(fastify, dashboard);
  registerNewRoute(fastify, login);
  registerNewRoute(fastify, SignUp);  
}

startServer();
registerAll(fastify);

