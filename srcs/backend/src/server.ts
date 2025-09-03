/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   server.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: gcapa-pe <gcapa-pe@student.42lisboa.com    +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/03 17:45:59 by yohan             #+#    #+#             */
/*   Updated: 2025/08/29 17:19:49 by gcapa-pe         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import Fastify from 'fastify';
import fastifySocketIO from 'fastify-socket.io';
import fastifyJwt from '@fastify/jwt';
import cors from '@fastify/cors';
import fastifyFormBody from '@fastify/formbody';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { FastifyRequest, FastifyInstance } from 'fastify';
import dotenv from 'dotenv';
import { PrismaClient } from '../generated/prisma';
import fastifyRedis from '@fastify/redis';

import { dashboard } from './routes/dashboard';
import SignUp from './routes/signup';
import { login, googleAuth, verify2fa } from './routes/login';
import { pong } from './routes/pong';
import { profile, changeUsername, changeFirstname, changeLastname, toggle2FA } from './routes/profile';
import { changePassword, changePasswordLogic } from './routes/changePassword';

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
      // Register Socket.IO plugin before listen
      await fastify.register(fastifySocketIO);
      await startSwagger()
      await fastify.listen({port : 8080, host : '0.0.0.0'})
      console.log("server listening on port 8080")
      // Access socket.io instance and set up connection event
      const io = fastify.io;
      io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);
        // Add your socket event handlers here
      });
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
  fastify.register(fastifyRedis, {
    host: 'redis',
    port: 6379,
    reconnectOnError: () => true,
    retryStrategy: times => Math.min(times * 50, 2000),
  })
  fastify.register(fastifyFormBody);
  fastify.register(cors, { origin: true }); // replace true by our true URL when it will be hosted
  fastify.register(dashboard);
  fastify.register(login);
  fastify.register(verify2fa);
  fastify.register(googleAuth);
  fastify.register(SignUp);
  fastify.register(pong);
  fastify.register(profile);
  fastify.register(changeUsername);
  fastify.register(changeFirstname);
  fastify.register(changeLastname);
  fastify.register(changePassword);
  fastify.register(toggle2FA);
  fastify.register(changePasswordLogic);
}

startServer();
registerAll(fastify);

