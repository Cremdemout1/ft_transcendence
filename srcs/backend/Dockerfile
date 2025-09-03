# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Dockerfile                                         :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: gcapa-pe <gcapa-pe@student.42lisboa.com    +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/06/04 10:00:30 by yohan             #+#    #+#              #
#    Updated: 2025/09/01 13:45:44 by gcapa-pe         ###   ########.fr        #
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

RUN npm install pm2 -g

COPY src ./src
COPY ./pm2.json ./pm2.json

RUN npx tsc
# might have to change port expose to 3000 to match. lets see
EXPOSE 8080
EXPOSE 8081

CMD ["pm2-runtime", "pm2.json"]