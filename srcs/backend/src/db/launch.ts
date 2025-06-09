/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   launch.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ycantin <ycantin@student.42.fr>            +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/04 17:32:46 by yohan             #+#    #+#             */
/*   Updated: 2025/06/09 23:01:00 by ycantin          ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { bcrypt } from '..';
import * as lib from '../index';

// this function checks existence of user as local user
// must add google and 42 auths here too
async function getUser(email:string, password:string, login_type:string='local', provider_id:string=email) {
    
    let user = null;
    if (login_type === 'local') {
        user = await lib.prisma.users.findFirst( {
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
        user = await lib.prisma.users.findFirst( {
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