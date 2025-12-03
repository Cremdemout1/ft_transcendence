# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Dockerfile                                         :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: gcapa-pe <gcapa-pe@student.42lisboa.com    +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/06/04 10:00:30 by yohan             #+#    #+#              #
#    Updated: 2025/11/29 17:33:59 by gcapa-pe         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

FROM node:20-alpine

WORKDIR /home/frontend

COPY . .

# Install ssl plugin for vite
RUN npm install

# expose vite dev port and static server port
EXPOSE 5173

CMD npm run dev
