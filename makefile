# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: gcapa-pe <gcapa-pe@student.42lisboa.com    +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/06/03 09:42:38 by yohan             #+#    #+#              #
#    Updated: 2025/11/29 17:32:46 by gcapa-pe         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

DOCKER_COMPOSE = docker-compose
YML 		   = ./srcs/docker-compose.yml

DEV_DB_DIR	   = /home/capa/ft_transcendence/Data/sqlite-data
DEV_DB_PATH	   = file:/home/capa/ft_transcendence/Data/sqlite-data/database.sqlite
#DEV_DB_DIR	   = /home/capa/Documents/ft_transcendence/sqlite-data
#DEV_DB_PATH	   = file:/home/capa/Documents/ft_transcendence/sqlite-data/database.sqlite
# DEV_DB_DIR	   = /home/yohan/ft_transcendence/sqlite-data
# DEV_DB_PATH	   = file:/home/yohan/ft_transcendence/sqlite-data/database.sqlite
#DEV_DB_DIR	   = /home/transcendence/data/sqlite-data
#DEV_DB_PATH	   = file:/home/transcendence/data/sqlite-data/database.sqlite
PROD_DB_PATH   = file:/data/database.sqlite


all: upd front

front:
	@cd srcs/frontend && npm install && npm run dev
build:
	@cd srcs/frontend && npm install && npm run build && npx serve -s -l 3000 dist
up:
# 	@cd srcs/backend && npm install && cd ../..
# 	@cd srcs/game_server && npm install && cd ../..
	@mkdir -p ${DEV_DB_DIR}
	@sed -i.bak -E 's|^(DATABASE_URL=).*$$|\1$(PROD_DB_PATH)|' .env
	@rm .env.bak
	@echo "DATABASE_URL changed to $(PROD_DB_PATH) in .env"
	$(DOCKER_COMPOSE) -f $(YML) up --build

upd:
# 	@cd srcs/backend && npm install && cd ../..
# 	@cd srcs/game_server && npm install && cd ../..
	@mkdir -p ${DEV_DB_DIR}
	@sed -i.bak -E 's|^(DATABASE_URL=).*$$|\1$(PROD_DB_PATH)|' .env
	@rm .env.bak
	@echo "DATABASE_URL changed to $(PROD_DB_PATH) in .env"
	$(DOCKER_COMPOSE) -f $(YML) up --build -d

start:
	$(DOCKER_COMPOSE) -f $(YML) start

re: fclean all

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
	@rm -rf srcs/game_server/dist
	@rm -rf srcs/game_server/node_modules
	
fclean: down
	docker system prune -a -f --volumes
	docker volume prune -f
	@rm -rf ${DEV_DB_DIR}
	@rm -rf ${PROD_DB_DIR}

.PHONY: all up down start stop re logs fclean 
