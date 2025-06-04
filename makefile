# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: yohan <yohan@student.42.fr>                +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/06/03 09:42:38 by yohan             #+#    #+#              #
#    Updated: 2025/06/04 21:48:32 by yohan            ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

DOCKER_COMPOSE = docker compose
YML 		   = ./srcs/docker-compose.yml

all: up

# for backend testing --> seerver.ts is the main file
b:
	npx ts-node srcs/backend/src/server.ts

up:
# @mkdir -p /Users/yohan/Desktop/ft_transcendence/sqlite-data
	$(DOCKER_COMPOSE) -f $(YML) up --build

upd:
# @mkdir -p /Users/yohan/Desktop/ft_transcendence/sqlite-data
	$(DOCKER_COMPOSE) -f $(YML) up --build -d

start:
	$(DOCKER_COMPOSE) -f $(YML) start

re: down all

logs:
	$(DOCKER_COMPOSE) -f $(YML) logs -f

status:
		docker ps -a
		@echo
		docker image ls
		@echo
		docker volume ls
		@echo
		docker network ls --filter "name=transcendence"

stop: #stops containers
	$(DOCKER_COMPOSE) -f $(YML) stop 
	
down: #removes containers
	$(DOCKER_COMPOSE) -f $(YML) down -v
	@rm -rf srcs/backend/dist
	@rm -rf srcs/backend/node_modules
	
fclean: down
	docker system prune -a -f --volumes
	docker volume prune -f
# @ rm -rf /Users/yohan/Desktop/ft_transcendence/sqlite-data

.PHONY: all up down start stop re logs fclean 
