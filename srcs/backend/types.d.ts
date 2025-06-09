/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   types.d.ts                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/09 11:34:04 by yohan             #+#    #+#             */
/*   Updated: 2025/06/09 11:40:55 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// types/fastify-jwt.d.ts
import '@fastify/jwt';

declare module 'fastify' {
  interface FastifyInstance {
    jwt: import('@fastify/jwt').FastifyJWT;
  }

  interface FastifyRequest {
    jwtVerify: import('@fastify/jwt').FastifyRequest['jwtVerify'];
    user: {
        id: number,              // users.id — identifies the login record
        user_id: number,         // user_info.id — links to the user’s main profile
        email: string,
        username: string,
        login_type: string,      // 'local', 'google', etc.
        firstname: string,       // if you often show this in UI
        lastname: string,        // optional
        iat: number,             // issued at (auto-included by most libs)
        exp: number 
    };
  }
}
