/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   changePassword.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/08 17:01:21 by yohan             #+#    #+#             */
/*   Updated: 2025/07/08 23:09:05 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { authenticateJWT } from "./dashboard";
import { FastifyRequest, FastifyInstance } from "fastify";
import { JWTformat } from "./profile";
import { prisma } from '../server';
import * as bcrypt from 'bcrypt';

type myRequest = FastifyRequest;

async function changePassword(fastify: FastifyInstance)
{
    fastify.get('/api/change-password', async (request: myRequest, reply: any) =>
    {
        await authenticateJWT(request, reply, fastify);
        if (reply.sent)
            return ;
        const user = request.user;
        console.log(user);
        return reply.send({message:'password change page', user});
    })
}

interface passwordChangeBody {
    oldPassword: string,
    newPassword: string,
};

async function changePasswordLogic(fastify: FastifyInstance)
{
    fastify.patch('/api/me/change-password', async (request: myRequest, reply: any) =>
    {
        await authenticateJWT(request, reply, fastify);
        if (reply.sent)
            return ;
        const userData = request.user as JWTformat;
        const { oldPassword, newPassword } = request.body as passwordChangeBody;
        
        const user = await prisma.users.findUnique({
            where: {
                email_login_type:
                {
                    email: userData.email,
                    login_type: userData.login_type,
                },
            },
          });
        if (!user)
            return reply.status(404).send({ error: 'User not found' });
        else if (!user.password)
            return reply.status(400).send({ error: 'User has no password set' });
        const isValid = await bcrypt.compare(oldPassword, user.password);
        if (!isValid)
            return reply.status(403).send({ error: 'Old password is incorrect' });

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await prisma.users.update({
            where: { id: user.id },
            data: { password: hashedNewPassword },
        })
        return reply.send( { message: 'successfully changed password' } );
    })
}

export { changePassword, changePasswordLogic };