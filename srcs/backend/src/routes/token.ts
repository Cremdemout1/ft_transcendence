/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   token.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/07/05 09:54:01 by yohan             #+#    #+#             */
/*   Updated: 2025/07/15 12:36:05 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { prisma } from '../server'
import { FastifyInstance } from 'fastify';
import { JWTformat } from './profile';
import nodemailer from 'nodemailer';

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
        twoFactorAuth: updatedUser.twoFactorAuth,
    },
    {
      expiresIn: '1h'
    });
    return newToken;
}  

async function send2FAcode(email: string, code: string) {
  if (!process.env.PROJECT_EMAIL || !process.env.PROJECT_EMAIL_PASSWORD) {
    throw new Error("Email credentials are missing");
  }
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.PROJECT_EMAIL,
      pass: process.env.PROJECT_EMAIL_PASSWORD,
    }
  })
  
  const mailOptions = {
    from: process.env.PROJECT_EMAIL,
    to: email,
    subject: 'Your verification code',
    html: `<p>Your 2FA code is: <strong>${code}</strong></p><p>This code will expire in 5 minutes.</p>`,
  };

  await transporter.sendMail(mailOptions);
}

export { createNewToken, send2FAcode };