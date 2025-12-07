/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   changePassword.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/08 17:01:21 by yohan             #+#    #+#             */
/*   Updated: 2025/12/04 15:46:16 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { authenticateJWT } from "./dashboard";
import { FastifyRequest, FastifyInstance } from "fastify";
import { JWTformat } from "./profile";
import * as bcrypt from 'bcrypt';
import { orm } from "../server";
import { checkregexBackend } from "../db/db_queries";

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
		try{checkregexBackend(null, null, null, null, oldPassword);
		}catch(err) {
			return reply.status(403).send({ error: 'Old password is incorrect' });
		}
        const user = orm.getUserByEmail(userData.email);
        if (!user)
            return reply.status(404).send({ error: 'User not found' });
        else if (!user.password)
            return reply.status(400).send({ error: 'User has no password set' });
        const isValid = await bcrypt.compare(oldPassword, user.password);
        if (!isValid)
            return reply.status(403).send({ error: 'Old password is incorrect' });
		try{
            checkregexBackend(null, null, null, null, newPassword);
        }
        catch(err) {
            const message = err instanceof Error ? err.message : null;
            return reply.code(422).send({ error:"Invalid", message: message });
        }
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        if (!orm.updateUser(user.user_id, "password", hashedNewPassword))
            return reply.status(404).send({ error: 'Password update failed' });
        return reply.send( { message: 'successfully changed password' } );
    })
}

export { changePassword, changePasswordLogic };