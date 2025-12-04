/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   server.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/03 17:45:59 by yohan             #+#    #+#             */
/*   Updated: 2025/12/04 13:45:30 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import cors from '@fastify/cors';
import fastifyFormBody from '@fastify/formbody';
// import swagger from '@fastify/swagger';
// import swaggerUI from '@fastify/swagger-ui';
import { FastifyInstance } from 'fastify';
import dotenv from 'dotenv';
import fastifyRedis from '@fastify/redis';

import { dashboard } from './routes/dashboard';
import SignUp from './routes/signup';
import { login, verify2fa, logout } from './routes/login';
import { pong } from './routes/pong';
import { profile, changeUsername, changeFirstname, changeLastname, toggle2FA } from './routes/profile';
import { changePassword, changePasswordLogic } from './routes/changePassword';
import fastifySocketIO from 'fastify-socket.io';
import ORM from './db/db_queries';
import authenticatePing from './routes/ping';

dotenv.config();
const fastify = Fastify({ logger: true });

async function startServer()
{
    try
    {
      // await startSwagger()
      await fastify.listen({ port: 8080, host: '0.0.0.0' })
      console.log(`server listening on ${'0.0.0.0'}:${8080}`)
    }
    catch (err)
    {   
        fastify.log.error(err)
        process.exit(1)
    }
}

async function registerAll(fastify:FastifyInstance)
{
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
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
    },
  });

    fastify.register(fastifyJwt, {secret: process.env.JWT_TOKEN || 'secret-jwt'});
    fastify.register(fastifyRedis, {
    host: 'redis',
    port: 6379,
    reconnectOnError: () => true,
    retryStrategy: times => Math.min(times * 50, 2000),
  });

  await fastify.register(fastifyFormBody);
  fastify.register(dashboard);
  fastify.register(login);
  fastify.register(verify2fa);
  fastify.register(logout);
  fastify.register(SignUp);
  fastify.register(pong);
  fastify.register(profile);
  fastify.register(changeUsername);
  fastify.register(changeFirstname);
  fastify.register(changeLastname);
  fastify.register(changePassword);
  fastify.register(toggle2FA);
  fastify.register(changePasswordLogic);
  fastify.register(authenticatePing);
}

async function init() {
  await registerAll(fastify);
  await startServer();
}

export const orm = new ORM(process.env.DATABASE_URL);
init();