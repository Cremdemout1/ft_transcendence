/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   server.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: phantasiae <phantasiae@student.42.fr>      +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/03 17:45:59 by yohan             #+#    #+#             */
/*   Updated: 2025/11/26 16:51:57 by phantasiae       ###   ########.fr       */
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
import fastifyRedis from '@fastify/redis';

import { dashboard } from './routes/dashboard';
import SignUp from './routes/signup';
import { login, verify2fa } from './routes/login';
import { pong } from './routes/pong';
import { profile, changeUsername, changeFirstname, changeLastname, toggle2FA } from './routes/profile';
import { changePassword, changePasswordLogic } from './routes/changePassword';
import fastifySocketIO from 'fastify-socket.io';

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
          // host and schemes are left generic; runtime host/port may vary in containers
          host: process.env.SWAGGER_HOST || undefined,
          schemes: process.env.SWAGGER_SCHEMES ? process.env.SWAGGER_SCHEMES.split(',') : undefined,
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
}

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
      const PORT = Number(process.env.PORT || process.env.BACKEND_PORT || 8080)
      const HOST = '0.0.0.0'
      await fastify.listen({ port: PORT, host: HOST })
      console.log(`server listening on ${HOST}:${PORT}`)
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
  // Parse multiple allowed origins from env (comma-separated)
const origins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// CORS for HTTP
await fastify.register(cors, {
  origin: (origin, cb) => {
    // allow same-origin/non-browser requests
    if (!origin || origins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Socket.IO with its own CORS (must mirror HTTP CORS)
await fastify.register(fastifySocketIO, {
  cors: {
    origin: origins.length ? origins : true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

await fastify.register(fastifyFormBody);
  fastify.register(dashboard);
  fastify.register(login);
  fastify.register(verify2fa);
  // fastify.register(googleAuth);
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