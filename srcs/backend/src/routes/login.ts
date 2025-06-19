/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   login.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ycantin <ycantin@student.42.fr>            +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/04 17:01:19 by yohan             #+#    #+#             */
/*   Updated: 2025/06/19 16:51:41 by ycantin          ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { exchangeCodeForToken, getAuthURL, decodeToken } from '../google_auth';
import { getUser } from '../db/db_queries';

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

type myRequest = FastifyRequest;
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
  
async function login(fastify: FastifyInstance)
{
    fastify.get('/#login', async (request: myRequest, reply: any) =>
    {
        void request;
        reply.type('text/html').send(`
            <html>
              <body>
                <form action="/api/login" method="POST">
                  <input name="email" type="email" />
                  <input name="password" type="password" />
                  <button type="submit">Login</button>
                </form>
                <a href="/auth/google/callback"><button>Login with Google</button></a>
                <a href="/auth/42"><button>Login with 42</button></a>
              </body>
            </html>
          `);
    })

    fastify.post('/api/login', loginOpts, async (request: ReqBody<loginBody>, reply: any) =>
    {
        const { email, password }: loginBody = request.body;
        const user = await getUser(email, password);
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
            return reply.send({ user: user, token: token });
        }
        else
            return reply.code(401).send({ error: 'Invalid email or password' });
    })
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

export { login, googleAuth };