/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   server.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ycantin <ycantin@student.42.fr>            +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/03 17:45:59 by yohan             #+#    #+#             */
/*   Updated: 2025/06/10 17:27:01 by ycantin          ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import fastifySwaggerUi from '@fastify/swagger-ui';
import * as lib from './index';
import { dashboard } from './routes/dashboard';
import cors from '@fastify/cors';

lib.dotenv.config();
const fastify = lib.Fastify({ logger: true });

async function startSwagger(){
    await fastify.register(lib.swagger, {
        swagger: {
          info: {
            title: 'My API',
            description: 'API documentation',
            version: '1.0.0',
          },
          host: 'localhost:8080',
          schemes: ['https'],
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
      await fastify.listen({port : 8080, host : '0.0.0.0'})
      console.log("server listening on port 8080")
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
  const cookieSecret = process.env.COOKIE_SECRET || 'super-cookie';
  await fastify.register(lib.fjwt, {
    secret: jwtSecret,
    cookie: {
      cookieName: 'token',
      signed: false,
  }});
  await fastify.register(lib.cookie, {secret: cookieSecret});
  await fastify.register(lib.fastifyFormBody);
  await fastify.register(cors, { origin: true }); // replace true by our true URL when it will be hosted
  registerNewRoute(fastify, dashboard);
  registerNewRoute(fastify, lib.login);
  registerNewRoute(fastify, lib.googleAuth);
  registerNewRoute(fastify, lib.SignUp);

  fastify.decorate('authenticate', async (request: lib.myRequest, reply: any) => {
    try {
      await request.jwtVerify();
    } catch(err: any) {
        reply.code(401).send({message: 'Unauthorized:' + err.message})
  }});
}

startServer();
registerAll(fastify);

