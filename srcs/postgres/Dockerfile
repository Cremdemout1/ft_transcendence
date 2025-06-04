# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    dockerfile                                         :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: yohan <yohan@student.42.fr>                +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/06/03 10:51:40 by yohan             #+#    #+#              #
#    Updated: 2025/06/03 15:36:03 by yohan            ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

FROM postgres:15-alpine

COPY ./init/init.sh /docker-entrypoint-initdb.d/

RUN chmod +x /docker-entrypoint-initdb.d/*.sh