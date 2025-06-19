/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   signup.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ycantin <ycantin@student.42.fr>            +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/06 15:40:36 by yohan             #+#    #+#             */
/*   Updated: 2025/06/19 16:34:33 by ycantin          ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { FastifyInstance,FastifyRequest } from 'fastify';
import * as bcrypt from 'bcrypt';
import { prisma } from '../server';

interface signupBody
{
    email:string;
    password:string;
    login_type:string;
    username:string;
    firstname:string;
    lastname:string;
    provider_id:string;
};

type myRequest = FastifyRequest;
type ReqBody<T> = FastifyRequest<{ Body: T }>;

const localSignUpOps =
{
    schema:
    {
        body:
        {
            type: 'object',
            required: [ 'email', 'password', 'username', 'firstname', 'lastname' ],
            properties:
            {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 6 },
                username: { type: 'string', minLength: 1 },
                firstname: { type: 'string', minLength: 1 },
                lastname: { type: 'string', minLength: 1 }
            }
        },
        response:
        {
            200: // authorized
            {
                type: 'object',
                properties:
                {
                    message: { type: 'string' }
                }
            },
            401: // Not authorized
            {
                type: 'object',
                properties:
                {
                    error: { type: 'string' },
                    message: { type: 'string' }
                }
            },
            409:
            {
                type: 'object',
                properties:
                {
                    error: { type: 'string' },
                    message: {type: 'string' }
                }
            }
        }
    }
}

async function SignUp(fastify: FastifyInstance) {

   const login_type = 'local'
    
    fastify.get('/#signup', async (request: myRequest, reply: any) =>
    {
        reply.send({message:'Sign Up page'});
        const { message } = request.body as { message?: string};
        console.log(message);
        return { received: message ?? null };
    })
    
    fastify.post('/api/signup', localSignUpOps, async (request: ReqBody<signupBody>, reply: any) =>
    {
        const { email, password, username, firstname, lastname }: signupBody = request.body;
        
        const existingUser = await prisma.users.findMany({ where: { email } });
        for (const user of existingUser)
            if (user.login_type === login_type)
                return (reply.code(409).send({
                    error: "Conflict",
                    message: "User with this email and login type already exists. would you like to log in instead?"}))

        const usernameTaken = await prisma.user_info.findFirst({ where: { username } });
        if (usernameTaken)
            return (reply.code(409).send({
                error: "Conflict",
                message: "Username already taken"}))

        let userInfoTableID: number;
        if (existingUser.length !== 0) //dont create a new user_info, just create a new user linked to user of existingUser id
                userInfoTableID = existingUser[0].user_id;
        else
        {
            const userInfo = await prisma.user_info.create({
                data: {
                    username: username,
                    firstname: firstname,
                    lastname: lastname
                }
            })
            userInfoTableID = userInfo.id;
        }
        
        let provider_id = email;
        let hashedPassword: string | undefined;

        if (login_type === 'local')
            hashedPassword = await bcrypt.hash(password, 10);
        else if (login_type === 'google')
            provider_id = 'GOOGLE_ID'; // TODO: replace with actual Google provider_id
        else if (login_type === '42')
            provider_id = 'INTRA_ID'; // TODO: replace with actual 42 provider_id
        await prisma.users.create({
            data: {
                email: email,
                login_type: login_type,
                password: hashedPassword,
                provider_id: provider_id,
                user_info: { connect: { id: userInfoTableID } }
            }
        });
        return reply.code(200).send({
            message: 'User created successfully'
        });
    })
}

export default SignUp;