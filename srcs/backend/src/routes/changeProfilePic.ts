/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   changeProfilePic.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/18 12:35:43 by yohan             #+#    #+#             */
/*   Updated: 2025/09/03 10:06:21 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { authenticateJWT } from "./dashboard";
import { FastifyRequest, FastifyInstance } from "fastify";
import { JWTformat } from "./profile";
import { prisma } from '../server';
import type { MultipartFile } from '@fastify/multipart';
import path from "path";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import fs from 'fs/promises';
import { createNewToken } from "./token";


type myRequest = FastifyRequest;
interface MultipartRequest extends FastifyRequest {
    file: () => Promise<MultipartFile>;
  }

export async function changeProfilePic(fastify: FastifyInstance)
{
    fastify.patch('/api/change-profile-pic', async (request: myRequest, reply: any) => {
        await authenticateJWT(request, reply, fastify);
        const multipartRequest = request as MultipartRequest;
        if (reply.sent)
            return ;
        const userData = request.user as JWTformat;
        const file = await multipartRequest.file();

        if (!file)
            return reply.status(400).send({ error: 'No file uploaded' });
        const ext = path.extname(file.filename);
        const filename = `${userData.username}-pfp${ext}`;
        const filepath = path.join('/home/backend/images', filename);

        await pipeline(file.file, createWriteStream(filepath));

        const imageURL = `/images/${filename}`;

        if (userData.profile_pic !== '/images/default.png')
        {
            const oldPicFullPath = path.join('/home/backend/images', path.basename(userData.profile_pic));
            try {
                await fs.unlink(oldPicFullPath);
                console.log('Deleted old profile pic:', oldPicFullPath);
              } catch (err) {
                console.error('Could not delete old profile pic:', err);
              }
        }

        await prisma.user_info.update({
            where: { id: userData.user_id },
            data: { profile_pic: imageURL }
        });
        const updatedUser = await prisma.users.findUnique({
            where: { id: userData.user_id },
            include: { user_info: true },
        });
        if (!updatedUser)
            return reply.code(500).send({ error: "Updated user not found" });

        const token = await createNewToken(fastify, {
            id: updatedUser.id,
            user_id: updatedUser.user_info.id,
            email: updatedUser.email,
            login_type: updatedUser.login_type,
            username: updatedUser.user_info.username,
            firstname: updatedUser.user_info.firstname,
            lastname: updatedUser.user_info.lastname,
            twoFactorAuth: updatedUser.twoFactorAuth,
            profile_pic: updatedUser.user_info.profile_pic,
        });
    return reply.send({ message: "profile picture succesfully saved and changed", token });
    });
}