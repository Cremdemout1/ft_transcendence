import { login, googleAuth } from './routes/login';
import SignUp from './routes/signup';
import { getUser } from './db/launch';
import Fastify, { FastifyRequest } from 'fastify';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import crypto from  'crypto';
import { randomBytes } from  'crypto';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import fastifyFormBody from '@fastify/formbody';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma';
import jwt from 'jsonwebtoken';
import fjwt from '@fastify/jwt';
import dotenv from 'dotenv';
import { userInfo } from 'os';
import fs from 'fs';
import path from 'path';

interface userInfo
{
  "iss": string,
  "sub": string,
  "email": string,
  "email_verified": boolean,
  "name": string,
  "picture": string,
  "given_name": string,
  "family_name": string,
  "iat": number,
  "exp": number,
  "aud": string,
};


export type myRequest = FastifyRequest;
export type ReqBody<T> = FastifyRequest<{ Body: T }>;
export const prisma = new PrismaClient();
export { Fastify, FastifyInstance, FastifyPluginAsync };
export { fjwt, jwt, fastifyFormBody };
export { login, SignUp, googleAuth };
export { getUser };
export {crypto, randomBytes };
export { swagger, swaggerUI };
export { bcrypt };
export { PrismaClient };
export { dotenv };
export { userInfo };
export { path, fs };
