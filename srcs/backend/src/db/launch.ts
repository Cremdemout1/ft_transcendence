/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   launch.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/04 17:32:46 by yohan             #+#    #+#             */
/*   Updated: 2025/06/09 11:47:50 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { bcrypt } from '..';
import * as lib from '../index';

// this function checks existence of user as local user
// must add google and 42 auths here too
async function getUser(email:string, password:string) {
    
    const user = await lib.prisma.users.findFirst( {
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
    return user;
}

export { getUser };