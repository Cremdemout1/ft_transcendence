import loginRoute from './routes/login';
import Fastify, { FastifyRequest } from 'fastify';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import sqlite3 from 'sqlite3';

export type myRequest = FastifyRequest;
export type ReqBody<T> = FastifyRequest<{ Body: T }>;

export { Fastify, FastifyInstance, FastifyPluginAsync };
export { loginRoute };
export { sqlite3 };