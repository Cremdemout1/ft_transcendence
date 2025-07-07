/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   token.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/05 09:54:01 by yohan             #+#    #+#             */
/*   Updated: 2025/07/06 21:04:05 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { prisma } from '../server'
import { FastifyInstance } from 'fastify';
import { JWTformat } from './profile';

async function createNewToken(fastify: FastifyInstance, user: JWTformat): Promise<string|null>
{
    if (!user?.id)
        return null;
    const updatedUser = await prisma.users.findUnique({ 
        where: { id: user.id },
        include: { user_info: true }
    });
    if (!updatedUser)
      return null;

    const newToken = fastify.jwt.sign({
        id: updatedUser.id,
        user_id: updatedUser.user_info.id,
        email: updatedUser.email,
        login_type: updatedUser.login_type,
        username: updatedUser.user_info.username,
        firstname: updatedUser.user_info.firstname,
        lastname: updatedUser.user_info.lastname,
    },
    {
      expiresIn: '1h'
    });
    return newToken;
}  

export { createNewToken };