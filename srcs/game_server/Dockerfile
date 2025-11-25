# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Dockerfile                                         :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: luiberna <luiberna@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/06/04 10:00:30 by yohan             #+#    #+#              #
#    Updated: 2025/10/08 17:47:50 by luiberna         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

FROM node:20-alpine

WORKDIR /home/game_server

COPY ./package.json ./package-lock.json ./tsconfig.json ./

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl

RUN npm install \
    && apk del python3 make g++ \
    && npm cache clean --force

# Copy source code and environment file
COPY src ./src

RUN npx tsc

EXPOSE 8081

# Automatically start game_server
CMD node dist/game_server.js
