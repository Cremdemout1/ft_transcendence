# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    dockerfile                                         :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: yohan <yohan@student.42.fr>                +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/06/04 10:00:30 by yohan             #+#    #+#              #
#    Updated: 2025/06/04 20:29:56 by yohan            ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

FROM node:20-alpine

WORKDIR /home/backend

COPY ./package.json ./package-lock.json ./tsconfig.json ./

COPY ./prisma ./prisma

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite-dev \
    curl \
    openssl

RUN npm install sqlite3

RUN npm install

RUN npx prisma generate

COPY src ./src

RUN npx tsc

EXPOSE 8080

CMD ["node", "dist/src/server.js"]

# CMD [ "sh", "-c", "tail -f /dev/null" ]
