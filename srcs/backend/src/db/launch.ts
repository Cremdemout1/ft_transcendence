/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   launch.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/04 17:32:46 by yohan             #+#    #+#             */
/*   Updated: 2025/06/05 18:09:08 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { PrismaClient } from '../../generated/prisma';

const prisma = new PrismaClient();

async function userExists(email:string, password:string): Promise<boolean> {
    
    return await prisma.users.findFirst( {
            where: { email, password }
        }) !== null;
}

export { userExists };