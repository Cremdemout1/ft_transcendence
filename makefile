# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: ycantin <ycantin@student.42.fr>            +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/06/03 09:42:38 by yohan             #+#    #+#              #
#    Updated: 2025/06/09 16:32:57 by ycantin          ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

DOCKER_COMPOSE = docker compose
YML 		   = ./srcs/docker-compose.yml
DEV_DB_DIR	   = /sgoinfre/ycantin/ft_transcendence/sqlite-data
DEV_DB_PATH	   = file:/sgoinfre/ycantin/ft_transcendence/sqlite-data/database.sqlite
# DEV_DB_PATH	   = file:/Users/yohan/Desktop/ft_transcendence/sqlite-data/database.sqlite
PROD_DB_PATH   = file:/data/database.sqlite

all: up

# for backend testing --> server.ts is the main file
# must do make re and then make down to get instance of a database to work with
dev:
	@cd srcs/backend && npm install && cd ../..
	@mkdir -p ${DEV_DB_DIR}
	@echo "Running backend locally with local .env"
	@sed -i.bak -E 's|^(DATABASE_URL=).*$$|\1$(DEV_DB_PATH)|' .env
	@rm .env.bak
	@echo "DATABASE_URL changed to $(DEV_DB_PATH) in .env"
	npx ts-node srcs/backend/src/server.ts

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
	@ rm -rf ${DEV_DB_DIR}

.PHONY: all up down start stop re logs fclean 
