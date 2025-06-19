/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   db_queries.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ycantin <ycantin@student.42.fr>            +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/04 17:32:46 by yohan             #+#    #+#             */
/*   Updated: 2025/06/19 15:23:55 by ycantin          ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import * as bcrypt from 'bcrypt';
import { prisma } from '../server';

// this function checks existence of user as local user
// must add google and 42 auths here too
async function getUser(email:string, password:string, login_type:string='local', provider_id:string=email) {
    
    let user = null;
    if (login_type === 'local') {
        user = await prisma.users.findFirst( {
            where: {
                email,
                login_type: 'local'
                },
            include: {
                user_info: true,
            }
            });
        if (!user || !user.password)
            return null;

        const validPassword = await bcrypt.compare(password, user.password)
        if (!validPassword)
            return null;
    }
    else {
        user = await prisma.users.findFirst( {
            where: {
                email,
                provider_id,
                login_type
                },
            include: {
                user_info: true,
            }
            });
        if (!user)
            return null;
    }
    return user;
}

export { getUser };