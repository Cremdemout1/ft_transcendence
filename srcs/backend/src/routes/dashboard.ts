/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dashboard.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: yohan <yohan@student.42.fr>                +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/09 12:33:23 by yohan             #+#    #+#             */
/*   Updated: 2025/06/09 12:36:16 by yohan            ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import * as lib from '../index'

async function dashboard(fastify: lib.FastifyInstance)
{
    fastify.get('/dashboard', async (request: lib.myRequest, reply: any) =>
    {
        reply.send({message:'User dashboard'});
        const { message } = request.body as { message?: string};
        console.log(message);
        return { received: message ?? null };
    })
}

export { dashboard }