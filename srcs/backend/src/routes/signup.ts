/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   signup.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/06 15:40:36 by yohan             #+#    #+#             */
/*   Updated: 2025/07/15 11:33:01 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { FastifyInstance,FastifyRequest } from 'fastify';
import * as bcrypt from 'bcrypt';
import { orm } from '../server';

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
                    token: { type: 'string' }
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
   
    fastify.post('/api/signup', localSignUpOps, async (request: ReqBody<signupBody>, reply: any) =>
    {
        const { email, password, username, firstname, lastname }: signupBody = request.body;
        const invalidChars = ['\'', '\"', '`'];

        const invalid = invalidChars.some(char => email.includes(char)) || invalidChars.some(char => password.includes(char)) || invalidChars.some(char => username.includes(char)) || invalidChars.some(char => firstname.includes(char)) || invalidChars.some(char => lastname.includes(char));
        if (invalid)
            return reply.code(422).send({ error:"Invalid", message: 'Error: invalid characters' });
        const existingUser = orm.getUserByEmail(email);
        if (existingUser) {
            return (reply.code(409).send({
                error: "Conflict",
                message: "User with this email already exists. would you like to login instead?"}
            ));
        }

        const usernameTaken = orm.getUserByUsername(username);
        if (usernameTaken) {
            return (reply.code(409).send({
                error: "Conflict",
                message: "Username already taken"}
            ));
        }
        let userInfoTableID: number;
        const userInfo = orm.createUserInfo(firstname, lastname, username);
        userInfoTableID = userInfo ? userInfo.lastInsertRowid : null;
        if (!userInfoTableID)
            console.log("no player id for some reaosnnn");
        console.log(userInfo);
        console.log("user info id: " + userInfoTableID);
        let provider_id = email;
        let hashedPassword: string | undefined;
        if (login_type === 'local')
            hashedPassword = await bcrypt.hash(password, 10);
        else if (login_type === 'google')
            provider_id = 'GOOGLE_ID'; // TODO: replace with actual Google provider_id
        else if (login_type === '42')
            provider_id = 'INTRA_ID'; // TODO: replace with actual 42 provider_id
        orm.createUser(email, hashedPassword!, provider_id, login_type, userInfoTableID)

        const user = await orm.getProtectedUser(email, password);
        if (user)
        {
            const token = fastify.jwt.sign(
            {
                id: user.id,
                user_id: userInfo.id,
                email: user.email,  
                login_type: user.login_type, 
                username: userInfo.username,
                firstname: userInfo.firstname,
                lastname: userInfo.lastname,
                twoFactorAuth: user.twoFactorAuth,
            },
            {
                expiresIn: '1h'
            }
            )
            return reply.send({ user: user, token: token });
        }
        else
            console.log("user not found even after creation");
        return reply.code(500).send({ error: 'Failed to generate token' });
    })
}

export default SignUp;