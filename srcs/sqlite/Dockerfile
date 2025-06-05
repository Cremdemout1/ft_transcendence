# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Dockerfile                                         :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: yohan <yohan@student.42.fr>                +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/06/03 10:51:40 by yohan             #+#    #+#              #
#    Updated: 2025/06/05 17:59:14 by yohan            ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

FROM alpine/sqlite

COPY ./init/init.sh /docker-entrypoint-initdb.d/

RUN chmod +x /docker-entrypoint-initdb.d/*.sh

RUN mkdir -p /data && chmod +x /data

ENTRYPOINT [ "/docker-entrypoint-initdb.d/init.sh" ]

# CMD [ "sh", "-c", "tail -f /dev/null" ]
