.DEFAULT_GOAL := help
.PHONY: help init up down restart logs ps urls config images dev test clean scan \
        demo-network demo-security demo-volume demo-restart demo-replica demo-backup demo-alert demo-alert-reset

# port lu dans .env, juste pour afficher les urls
PORT_SUFFIX = $(shell p=$$(sed -n 's/^HTTP_PORT=//p' .env 2>/dev/null); [ -n "$$p" ] && [ "$$p" != 80 ] && echo ":$$p")

help:          ## Affiche cette aide
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  \033[33m%-18s\033[0m %s\n", $$1, $$2}'

init:          ## Génère .env et les mots de passe (une seule fois)
	@./scripts/init.sh

up: init       ## Construit et lance toute la stack (attend que tout soit "healthy")
	docker compose up -d --build --wait
	@$(MAKE) --no-print-directory urls

urls:          ## Affiche les adresses des services
	@echo "  Jeu           http://gribouille.localhost$(PORT_SUFFIX)"
	@echo "  Grafana       http://grafana.localhost$(PORT_SUFFIX)"
	@echo "  Prometheus    http://prometheus.localhost$(PORT_SUFFIX)"
	@echo "  Alertmanager  http://alertmanager.localhost$(PORT_SUFFIX)"
	@echo "  Mail (test)   http://mail.localhost$(PORT_SUFFIX)"
	@echo "  Traefik       http://traefik.localhost$(PORT_SUFFIX)/dashboard/"
	@echo "  (depuis un autre PC : remplace .localhost par .<ip-de-la-vm>.nip.io)"

down:          ## Arrête la stack (données et sauvegardes conservées)
	docker compose down

restart: down up ## Relance tout

logs:          ## Suit les logs de tous les services
	docker compose logs -f --tail=50

ps:            ## État et santé des conteneurs
	docker compose ps

config:        ## Vérifie la syntaxe du compose
	docker compose config -q && echo "compose.yml valide"

images:        ## Taille des images construites
	docker image ls --filter "reference=gribouille*"

dev:           ## Mode dev : code monté, rechargement auto
	docker compose -f compose.yml -f compose.dev.yml up --build

test:          ## Lance les tests du serveur
	cd server && npm ci && npm test

scan:          ## Scan de vulnérabilités (Trivy) des deux images construites
	@for i in gribouille-server gribouille-web; do \
	  docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest \
	    image --severity HIGH,CRITICAL --scanners vuln $$i; \
	done

clean:         ## Arrête tout et supprime TOUS les volumes (classement, sauvegardes, métriques)
	docker compose down -v

demo-network:  ## Démo : web ne peut pas joindre Redis (réseau interne)
	@docker compose exec web sh -c "nc -zv -w 2 redis-master 6379" 2>&1 || echo "OK : web n'a pas accès à Redis"
	@docker compose exec redis-master redis-cli ping

demo-security: ## Démo : serveur non-root et en lecture seule
	@docker compose exec server id
	@docker compose exec server sh -c "touch /app/test" 2>&1 || echo "OK : écriture refusée"

demo-volume:   ## Démo : le classement survit à un redémarrage
	@docker compose exec redis-master redis-cli ZREVRANGE lb:wins 0 4 WITHSCORES
	docker compose down
	docker compose up -d --wait
	@docker compose exec redis-master redis-cli ZREVRANGE lb:wins 0 4 WITHSCORES

demo-replica:  ## Démo : le replica reçoit les données et refuse les écritures
	@docker compose exec redis-master redis-cli info replication | grep -E "^(role|connected_slaves|slave0)"
	@docker compose exec redis-master redis-cli set demo:replica "ok depuis le master"
	@echo "Lecture sur le replica :" && docker compose exec redis-replica redis-cli get demo:replica
	@docker compose exec redis-replica redis-cli set interdit 1 || true

demo-backup:   ## Démo : déclenche une sauvegarde et liste le volume de backups
	@docker compose exec redis-backup sh -c 'redis-cli -h redis-replica --rdb /backups/redis-manuel-$$(date +%H%M%S).rdb >/dev/null 2>&1; ls -lh /backups'

demo-alert:    ## Démo : coupe le replica, l'alerte arrive par mail (~2 min) dans Mailpit
	docker compose stop redis-replica
	@echo "Attends ~2 minutes puis ouvre http://mail.localhost$(PORT_SUFFIX) (et Prometheus > Alerts)."
	@echo "Pour tout remettre en ordre : make demo-alert-reset"

demo-alert-reset: ## Remet le replica en route
	docker compose start redis-replica

demo-restart:  ## Démo : redémarrage automatique après un crash
	@echo "On simule un crash : le processus principal du serveur s'arrête."
	docker compose exec server kill 1
	@sleep 6
	docker compose ps server
