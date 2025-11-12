# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Dockerfile                                         :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: yohan <yohan@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/06/04 10:00:30 by yohan             #+#    #+#              #
#    Updated: 2025/10/08 17:47:50 by yohan         ###   ########.fr        #
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


# Copy source code and environment file
COPY src ./src
COPY .env ./


RUN npx tsc
# might have to change port expose to 3000 to match. lets see
EXPOSE 8080

# Automatically run migrations and start the server
CMD node dist/server.js
