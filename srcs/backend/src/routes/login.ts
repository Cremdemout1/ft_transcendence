/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   login.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/04 17:01:19 by yohan             #+#    #+#             */
/*   Updated: 2025/07/14 17:36:45 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { exchangeCodeForToken, getAuthURL, decodeToken } from '../google_auth';
import { getUser } from '../db/db_queries';
import { send2FAcode } from './token';
import { prisma } from '../server';

interface loginBody
{
    email: string;
    password: string;
    login_type?: string;
};

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

// type myRequest = FastifyRequest;
type ReqBody<T> = FastifyRequest<{ Body: T }>;

const loginOpts = 
{
    schema:
    {
        body:
        {
            type: 'object',
            required: [ 'email', 'password' ],
            properties:
            {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 6 }
            }
        },
        response:
        {
            200: // authorized
            {
                type: 'object',
                properties:
                {
                    token: { type: 'string' }
                }
            },
            401: // Not authorized
            {
                type: 'object',
                properties:
                {
                    error: { type: 'string' }
                }
            }
        }
    }
}

const verificationCode =
{
    schema: {
        body: {
            type: 'object',
                required: ['code', 'email'],
                properties: {
                code: { type: 'string', minLength: 1 },
                email: { type: 'string', format: 'email' }
                }
            }
        }
}

async function login(fastify: FastifyInstance)
{
    fastify.post('/api/login', loginOpts, async (request: ReqBody<loginBody>, reply: any) =>
    {
        const { email, password }: loginBody = request.body;
        const user = await getUser(email, password);
        if (user)
        {
            const code = Math.floor(100000 + Math.random() * 900000).toString(); //random 6 digit code
            await fastify.redis.set(`2fa:${email}`, code, 'EX', 300);
            await send2FAcode(email, code);
            return reply.send({ message: '2FA code sent to email' });
        }
        else
            return reply.code(401).send({ error: 'Invalid email or password' });
    })
}

async function verify2fa(fastify: FastifyInstance) {
    fastify.post('/api/verify-2fa', verificationCode, async (request: ReqBody<{code: string, email: string}>, reply: any) => {
        const {code, email} = request.body;
        const stashedCode = await fastify.redis.get(`2fa:${email}`);   
        if (!stashedCode) {
            return reply.code(404).send({ error: 'Code not found or expired' });
          }
        if (stashedCode === code)
        {
            await fastify.redis.del(`2fa:${email}`);
            const user = await prisma.users.findFirst({ where: { email: email }, include: { user_info: true } })
            if (user)
            {
                const token = fastify.jwt.sign(
                {
                    id: user.id,
                    user_id: user.user_info.id,
                    email: user.email,  
                    login_type: user.login_type,
                    username: user.user_info.username,
                    firstname: user.user_info.firstname,
                    lastname: user.user_info.lastname,
                },
                {
                    expiresIn: '1h'
                }
                )
                return reply.send({ user: user, token: token });
            }
            else
                return reply.code(401).send({ error: 'User not found' });
        }
        else
            return reply.code(401).send({ error: 'Invalid or expired 2FA code' });
    });
}


interface OAuthCallbackQuery {
  code?: string;
  error?: string;
}

async function googleAuth(fastify: FastifyInstance)
{
    fastify.get<{ Querystring: OAuthCallbackQuery }>('/auth/google/callback', async (request, reply) => {
    const { code, error } = request.query;
        if (error)
            return reply.status(400).send(`Google OAuth error: ${error}`);
        else if (!code) {
            const googleAuthURL = getAuthURL();
            return reply.redirect(googleAuthURL);
        }
        
        const token = await exchangeCodeForToken(code);
        const userInfo: userInfo = await decodeToken(token, fastify);

        const user = await getUser(userInfo.email, '', 'google', userInfo.sub);
        if (user)
        {
            const token = fastify.jwt.sign(
            {
                id: user.id,
                email: user.email,  
                login_type: user.login_type,
                username: user.user_info.username,
                firstname: user.user_info.firstname,
                lastname: user.user_info.lastname,
            },
            {
                expiresIn: '1h'
            }
            )
            return reply.send({token: token});
        }
        return reply.code(401).send({ error: 'Invalid email or password' });
    })

}

export { login, googleAuth, verify2fa };