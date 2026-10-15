.DEFAULT_GOAL := help
.PHONY: help up down restart logs ps test dev clean images demo-network demo-security demo-volume demo-restart

help:          ## Affiche cette aide
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  \033[33m%-15s\033[0m %s\n", $$1, $$2}'

up:            ## Construit et lance la stack
	docker compose up -d --build --wait
	@echo "Gribouille tourne sur http://localhost:$${PORT:-8080}"

down:          ## Arrête la stack (le classement est conservé)
	docker compose down

restart: down up ## Relance tout

logs:          ## Suit les logs de tous les services
	docker compose logs -f

ps:            ## État et santé des conteneurs
	docker compose ps

images:        ## Taille des images construites
	docker image ls --filter "reference=gribouille*"

dev:           ## Mode dev : code monté, rechargement auto
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

test:          ## Lance les tests du serveur
	cd server && npm ci && npm test

clean:         ## Arrête tout et supprime le volume Redis (efface le classement)
	docker compose down -v

demo-network:  ## Démo : web ne peut pas joindre Redis (réseau interne)
	@docker compose exec web sh -c "nc -zv -w 2 redis 6379" 2>&1 || echo "OK : web n'a pas accès à redis"
	@docker compose exec redis redis-cli ping

demo-security: ## Démo : serveur non-root et en lecture seule
	@docker compose exec server id
	@docker compose exec server sh -c "touch /app/test" 2>&1 || echo "OK : écriture refusée"

demo-volume:   ## Démo : le classement survit à un redémarrage
	@docker compose exec redis redis-cli ZREVRANGE lb:wins 0 4 WITHSCORES
	docker compose down
	docker compose up -d --wait
	@docker compose exec redis redis-cli ZREVRANGE lb:wins 0 4 WITHSCORES

demo-restart:  ## Démo : redémarrage automatique après un crash
	@echo "On simule un crash : le processus principal du serveur s'arrête."
	docker compose exec server kill 1
	@sleep 6
	docker compose ps server
