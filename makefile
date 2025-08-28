# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: phantasiae <phantasiae@student.42.fr>      +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/06/03 09:42:38 by yohan             #+#    #+#              #
#    Updated: 2025/07/18 15:17:09 by phantasiae       ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

DOCKER_COMPOSE = docker compose
YML 		   = ./srcs/docker-compose.yml

DEV_DB_DIR	   = /home/phantasiae/Desktop/ft_transcendence/sqlite-data
DEV_DB_PATH	   = file:/home/phantasiae/Desktop/ft_transcendence/sqlite-data/database.sqlite
#DEV_DB_DIR	   = /Users/yohan/Desktop/ft_transcendence/sqlite-data
#DEV_DB_PATH	   = file:/Users/yohan/Desktop/ft_transcendence/sqlite-data/database.sqlite
PROD_DB_PATH   = file:/data/database.sqlite


all: up

front:
	@cd srcs/frontend && npm install && npm run dev
build:
	@cd srcs/frontend && npm install && npm run build && npx serve -s -l 3000 dist
up:
	@cd srcs/backend && npm install && cd ../..
	@mkdir -p ${DEV_DB_DIR}
	@sed -i.bak -E 's|^(DATABASE_URL=).*$$|\1$(PROD_DB_PATH)|' .env
	@rm .env.bak
	@echo "DATABASE_URL changed to $(PROD_DB_PATH) in .env"
	$(DOCKER_COMPOSE) -f $(YML) up --build

upd:
	@cd srcs/backend && npm install && cd ../..
	@mkdir -p ${DEV_DB_DIR}
	@sed -i.bak -E 's|^(DATABASE_URL=).*$$|\1$(PROD_DB_PATH)|' .env
	@rm .env.bak
	@echo "DATABASE_URL changed to $(PROD_DB_PATH) in .env"
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
	@ sudo rm -rf ${DEV_DB_DIR}
	@ sudo rm -rf ${PROD_DB_DIR}

.PHONY: all up down start stop re logs fclean 
