/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   login.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/04 17:01:19 by yohan             #+#    #+#             */
/*   Updated: 2025/06/09 13:10:56 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import * as lib from '../index';

interface loginBody
{
    email: string;
    password: string;
};

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
  
async function login(fastify: lib.FastifyInstance)
{
    fastify.get('/login', async (request: lib.myRequest, reply: any) =>
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
              </body>
            </html>
          `);
    })

    fastify.post('/login', loginOpts, async (request: lib.ReqBody<loginBody>, reply: any) =>
    {
        const { email, password }: loginBody = request.body;
        const user = await lib.getUser(email, password);
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
            // reply.setCookie('token', token, { httpOnly: true,  path: '/', maxAge: 3600, });
            // console.log (reply.send( { token: token }));
            console.log (token);
            return reply.redirect('/dashboard');
        }
        else
            return reply.code(401).send({ error: 'Invalid email or password' });
    })
}


export default login;