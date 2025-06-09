# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Dockerfile                                         :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: ycantin <ycantin@student.42.fr>            +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/06/04 10:00:30 by yohan             #+#    #+#              #
#    Updated: 2025/06/09 23:18:20 by ycantin          ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

FROM node:20-alpine

WORKDIR /home/frontend

COPY src .

RUN apk add curl \
            npm

# CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

CMD [ "sh", "-c", "tail -f /dev/null" ]
