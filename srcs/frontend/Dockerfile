# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Dockerfile                                         :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: phantasiae <phantasiae@student.42.fr>      +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/06/04 10:00:30 by yohan             #+#    #+#              #
#    Updated: 2025/07/13 19:05:41 by phantasiae       ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

FROM node:20-alpine

WORKDIR /home/frontend

COPY src ./src
COPY package*.json ./

RUN apk add curl \
            npm


RUN npm install
# CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

CMD [ "sh", "-c", "tail -f /dev/null" ]
