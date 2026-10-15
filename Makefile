.PHONY: up down restart logs ps test dev clean

up:        ## Construit et lance la stack
	docker compose up -d --build

down:      ## Arrête la stack
	docker compose down

restart: down up

logs:      ## Suit les logs de tous les services
	docker compose logs -f

ps:        ## État des conteneurs
	docker compose ps

dev:       ## Mode dev : code monté, rechargement auto
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

test:      ## Lance les tests du serveur
	cd server && npm install && npm test

clean:     ## Arrête tout et supprime le volume Redis (efface le classement)
	docker compose down -v
