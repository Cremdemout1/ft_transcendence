# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Dockerfile                                         :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: yohan <yohan@student.42.fr>                +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/06/04 10:00:30 by yohan             #+#    #+#              #
#    Updated: 2025/06/06 11:52:04 by yohan            ###   ########.fr        #
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
    openssl
    # curl \

# RUN npm install sqlite3

RUN npm install \
    && apk del python3 make g++ sqlite-dev \
    && npm cache clean --force

RUN npx prisma generate

COPY src ./src

RUN npx tsc
# might have to change port expose to 3000 to match. lets see
EXPOSE 8080

CMD ["node", "dist/server.js"]

# CMD [ "sh", "-c", "tail -f /dev/null" ]
