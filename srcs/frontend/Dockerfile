# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Dockerfile                                         :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: gcapa-pe <gcapa-pe@student.42lisboa.com    +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/06/04 10:00:30 by yohan             #+#    #+#              #
#    Updated: 2025/11/20 14:42:58 by gcapa-pe         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

FROM node:20-alpine

WORKDIR /home/frontend

# install basic utilities (curl used by some scripts)
RUN apk add --no-cache curl

# copy package files first to leverage layer caching
COPY package*.json ./

# install all dependencies, including devDependencies (tailwind, postcss)
RUN npm install --silent

# copy source
COPY . .

# expose vite dev port and static server port
EXPOSE 5173

# Run in DEV mode by passing environment variable DEV=1 to the container.
# In DEV=1 we run the vite dev server on 0.0.0.0 so host can access it.
# Otherwise we build and serve the production bundle.
CMD ["sh", "-c", "if [ \"$DEV\" = \"1\" ]; then npm run dev -- --host 0.0.0.0; else npm run build && npx serve -s dist -l 5173; fi"]
