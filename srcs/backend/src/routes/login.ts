/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   login.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/04 17:01:19 by yohan             #+#    #+#             */
/*   Updated: 2025/06/05 17:08:49 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import * as lib from '../index';

interface loginBody
{
    email: string;
    password: string;
};

function generateToken(): string {
    return lib.crypto.randomBytes(32).toString('hex'); // 64 hex chars, 256 bits
  }
  
async function loginRoute(fastify: lib.FastifyInstance)
{
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
                    email: { type: 'string' },
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
    fastify.get('/login', async (request: lib.myRequest, reply: any) =>
    {
        reply.send({message:'login page'});
        const { message } = request.body as { message?: string};
        console.log(message);
        return { received: message ?? null };
    })

    fastify.post('/login', loginOpts, async (request: lib.ReqBody<loginBody>, reply: any) =>
    {
        const { email, password }: loginBody = request.body;
        
        if (await lib.userExists(email, password))
            return reply.send( { token: generateToken() })
        else
            return reply.code(401).send({ error: 'Invalid email or password' });
    })
}


export default loginRoute;