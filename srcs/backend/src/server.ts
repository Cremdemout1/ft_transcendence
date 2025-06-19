/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   server.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ycantin <ycantin@student.42.fr>            +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/03 17:45:59 by yohan             #+#    #+#             */
/*   Updated: 2025/06/19 15:22:03 by ycantin          ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import cors from '@fastify/cors';
import fastifyFormBody from '@fastify/formbody';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { FastifyRequest, FastifyInstance } from 'fastify';
import dotenv from 'dotenv';
import { PrismaClient } from '../generated/prisma';

import { dashboard } from './routes/dashboard';
import SignUp from './routes/signup';
import { login, googleAuth } from './routes/login';


export const prisma = new PrismaClient();
dotenv.config();
const fastify = Fastify({ logger: true });
type myRequest = FastifyRequest;

async function startSwagger(){
    await fastify.register(swagger, {
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
      
      await fastify.register(swaggerUI, {
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

fastify.get('/', async (request: myRequest, reply: any) =>
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

async function registerAll(fastify:FastifyInstance)
{
  fastify.register(fastifyJwt, {secret: process.env.JWT_TOKEN || 'secret-jwt'});
  fastify.register(fastifyFormBody);
  fastify.register(cors, { origin: true }); // replace true by our true URL when it will be hosted
  fastify.register(dashboard);
  fastify.register(login);
  fastify.register(googleAuth);
  fastify.register(SignUp);
}

startServer();
registerAll(fastify);

