import loginRoute from './routes/login';
import { userExists } from './db/launch';
import Fastify, { FastifyRequest } from 'fastify';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
// import sqlite3 from 'sqlite3';
import crypto from  'crypto';
import { randomBytes } from  'crypto';

export type myRequest = FastifyRequest;
export type ReqBody<T> = FastifyRequest<{ Body: T }>;

export { Fastify, FastifyInstance, FastifyPluginAsync };
export { loginRoute };
export { userExists };
// export { sqlite3 };
export {crypto, randomBytes };