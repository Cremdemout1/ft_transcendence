/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   login.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/04 17:01:19 by yohan             #+#    #+#             */
/*   Updated: 2025/07/15 12:22:01 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { FastifyInstance, FastifyRequest } from 'fastify';
// import { exchangeCodeForToken, getAuthURL, decodeToken } from '../google_auth';
import { send2FAcode } from './token';
import { orm } from '../server';

interface loginBody
{
    email: string;
    password: string;
    login_type?: string;
};

// interface userInfo
// {
//   "iss": string,
//   "sub": string,
//   "email": string,
//   "email_verified": boolean,
//   "name": string,
//   "picture": string,
//   "given_name": string,
//   "family_name": string,
//   "iat": number,
//   "exp": number,
//   "aud": string,
// };

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
                    message: { type: 'string' },
                    twoFA: { type: 'number' },
                    token: { type: 'string' },
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
        const invalidChars = ['\'', '\"', '`'];

        const invalid = invalidChars.some(char => email.includes(char)) || invalidChars.some(char => password.includes(char));
        if (invalid)
            return reply.code(422).send({ error: 'Error: invalid characters' });
        // const user = await getUser(email, password);
        const user = await orm.getProtectedUser(email, password);
        console.log(user);
        const idx = user ? user.user_id : null;
        console.log("user_id: ", idx);
        const userInfo = orm.getUserInfoTable(idx);
        console.log(userInfo);
        if (user)
        {
            const twoFa = user ? user.twoFactorAuth : null;
            console
            console.log(twoFa);
            if (twoFa === 1)
            {
                const code = Math.floor(100000 + Math.random() * 900000).toString(); //random 6 digit code
                await fastify.redis.set(`2fa:${email}`, code, 'EX', 300);
                await send2FAcode(email, code);
                return reply.send({
                    message: '2FA code sent to email',
                    twoFA: 1,
                });
            }
            else
            {
                const username = userInfo ? userInfo.username : null;
                const firstname = userInfo ? userInfo.firstname : null;
                const lastname = userInfo ? userInfo.lastname : null;
                const token = fastify.jwt.sign(
                    {
                        id: user.id,
                        user_id: idx,
                        email: user.email,  
                        login_type: user.login_type,
                        username: username,
                        firstname: firstname,
                        lastname: lastname,
                        twoFactorAuth: user.twoFactorAuth,
                    },
                        {
                            expiresIn: '1h'
                        }
                    )
                return reply.send({ user: user, token: token, twoFA: 0 });
            }
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
            // const user = await prisma.users.findFirst({ where: { email: email }, include: { user_info: true } })
            const user = orm.getUserByEmail(email);
            const idx = user ? user.user_id : null;
            const userInfo = orm.getUserInfoTable(idx);

            if (user)
            {
                const username = userInfo ? userInfo.username : null;
                const firstname = userInfo ? userInfo.firstname : null;
                const lastname = userInfo ? userInfo.lastname : null;
                const token = fastify.jwt.sign(
                {
                    id: user.id,
                    user_id: idx,
                    email: user.email,  
                    login_type: user.login_type,
                    username: username,
                    firstname: firstname,
                    lastname: lastname,
                    twoFactorAuth: user.twoFactorAuth,
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

export { login, verify2fa };