# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Dockerfile                                         :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: yohan <yohan@student.42.fr>                +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/06/03 10:51:40 by yohan             #+#    #+#              #
#    Updated: 2025/06/04 18:06:01 by yohan            ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

FROM alpine/sqlite

COPY ./init/init.sh /docker-entrypoint-initdb.d/

RUN chmod +x /docker-entrypoint-initdb.d/*.sh

ENTRYPOINT [ "/docker-entrypoint-initdb.d/init.sh" ]

# CMD [ "sh", "-c", "tail -f /dev/null" ]
