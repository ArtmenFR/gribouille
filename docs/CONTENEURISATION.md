# Gribouille · dossier technique de conteneurisation

Projet réalisé dans le cadre du cours de conteneurisation (B3 Systèmes, Réseaux et Cybersécurité, ESGI Reims).

## 1. Objectif

Déployer une application temps réel complète, composée de plusieurs services, entièrement avec Docker et Docker Compose, en appliquant les bonnes pratiques vues en cours : images légères et reproductibles, séparation des réseaux, persistance des données, supervision de l'état des services et durcissement de la sécurité.

L'application est un jeu de dessin multijoueur : un joueur dessine un mot, les autres le devinent dans le chat. Elle a été choisie parce qu'elle combine trois choses intéressantes à conteneuriser : du contenu statique, une connexion WebSocket permanente et une base de données.

## 2. Architecture

```
                 Navigateurs (PC, téléphone)
                           │  HTTP + WebSocket
                           ▼  port 8080 (seul port exposé)
   ┌──────────────────────────────────────────────────┐
   │ web        nginx:1.27-alpine                     │
   │            fichiers statiques, reverse proxy,    │
   │            en-têtes de sécurité, gzip            │
   └───────────────────────┬──────────────────────────┘
              réseau front │
   ┌───────────────────────▼──────────────────────────┐
   │ server     node:20-alpine (multi-stage)          │
   │            logique du jeu, Socket.io, API REST   │
   │            utilisateur non-root, lecture seule   │
   └───────────────────────┬──────────────────────────┘
              réseau back  │ (internal: aucune sortie)
   ┌───────────────────────▼──────────────────────────┐
   │ redis      redis:7-alpine                        │
   │            classement persistant (volume)        │
   └──────────────────────────────────────────────────┘
```

| Service | Image | Rôle | Réseaux | Port publié | Données |
|---|---|---|---|---|---|
| `web` | construite depuis `web/Dockerfile` | Front + reverse proxy | front | 8080 → 80 | aucune |
| `server` | construite depuis `server/Dockerfile` | Jeu temps réel | front, back | aucun | en mémoire |
| `redis` | `redis:7-alpine` officielle | Classement | back | aucun | volume `redis-data` |

## 3. Les notions Docker mises en œuvre

### 3.1 Images et Dockerfile

**Image multi-stage (`server/Dockerfile`).** La première étape `deps` installe uniquement les dépendances de production avec `npm ci`, qui suit exactement le `package-lock.json` (build reproductible). La seconde étape `runtime` repart d'une image propre et ne récupère que le dossier `node_modules`. Résultat : ni cache npm ni fichiers temporaires dans l'image finale.

**Ordre des couches et cache.** Les fichiers `package*.json` sont copiés avant le code source. Tant que les dépendances ne changent pas, Docker réutilise la couche `npm ci` en cache et un rebuild après une modification du code prend quelques secondes.

**Images de base Alpine.** `node:20-alpine`, `nginx:1.27-alpine` et `redis:7-alpine` réduisent la taille des images et la surface d'attaque (moins de paquets, donc moins de vulnérabilités potentielles).

**`.dockerignore`.** Le contexte de build exclut `node_modules`, les tests et la documentation : le build est plus rapide et rien d'inutile ne se retrouve dans l'image.

**Métadonnées OCI.** Les labels `org.opencontainers.image.*` décrivent chaque image (titre, description, licence), visibles avec `docker inspect`.

### 3.2 Orchestration avec Docker Compose

**Plusieurs fichiers Compose.**
- `docker-compose.yml` : la stack de référence.
- `docker-compose.dev.yml` : surcharge de développement, monte le code source dans les conteneurs et relance Node à chaque modification.
- `docker-compose.ghcr.yml` : surcharge qui utilise les images déjà publiées par la CI au lieu de les construire.

**Ordre de démarrage fiable.** `depends_on` avec `condition: service_healthy` : `server` n'est lancé que quand Redis répond, et `web` que quand `server` est sain. Un simple `depends_on` ne garantirait que l'ordre de création, pas que le service est prêt.

**Variables d'environnement.** L'URL de Redis est passée au serveur par `REDIS_URL`. Le port publié est configurable par `PORT` (fichier `.env.example`).

**Politique de redémarrage.** `restart: unless-stopped` relance automatiquement un conteneur qui plante, sauf s'il a été arrêté volontairement.

### 3.3 Réseaux

Deux réseaux bridge définis par l'utilisateur :

- `front` relie `web` et `server`.
- `back` relie `server` et `redis`. Il est déclaré `internal: true` : aucun conteneur de ce réseau ne peut sortir vers Internet, et `web` n'y a pas accès du tout.

Les conteneurs se trouvent par leur **nom de service** grâce au DNS interne de Docker : nginx contacte `server:3000`, le serveur contacte `redis:6379`. Aucune adresse IP n'est écrite en dur.

Seul `web` publie un port sur la machine hôte. Le serveur Node et Redis ne sont joignables que depuis les réseaux internes.

### 3.4 Volumes et persistance

Le volume nommé `redis-data` est monté sur `/data`. Redis y écrit son fichier AOF (`--appendonly yes`) et un instantané toutes les 60 secondes. Le classement survit donc à un `docker compose down` suivi d'un `up`. Seul `docker compose down -v` le supprime.

L'état des parties en cours, lui, reste en mémoire dans le conteneur `server` : c'est un choix assumé (données éphémères, performance), documenté dans les limites.

### 3.5 Santé des services

Chaque service déclare un `HEALTHCHECK` :

- `server` interroge sa propre route `/api/health`.
- `web` vérifie que nginx répond.
- `redis` exécute `redis-cli ping`.

`docker compose ps` affiche l'état `healthy` / `unhealthy`, et ces états pilotent l'ordre de démarrage vu plus haut.

### 3.6 Sécurité

| Mesure | Où | Effet |
|---|---|---|
| Utilisateur non-root | `USER node` dans l'image serveur | Une faille dans l'appli ne donne pas root dans le conteneur |
| Système de fichiers en lecture seule | `read_only: true` + `tmpfs: /tmp` | Impossible d'écrire un fichier malveillant dans l'image |
| Aucune capability Linux | `cap_drop: [ALL]` | Le processus n'a aucun privilège noyau superflu |
| `no-new-privileges` | les trois services | Bloque l'élévation de privilèges via setuid |
| Réseau interne | `back: internal: true` | Redis isolé d'Internet et du front |
| Un seul port exposé | `web` uniquement | Surface d'attaque réduite au reverse proxy |
| En-têtes HTTP | `web/nginx.conf` | CSP stricte sans origine externe, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `server_tokens off` |
| Validation côté serveur | `server/src/game.js` | Le client n'est jamais cru : coordonnées, couleurs, textes, droits vérifiés |
| Limitation de débit | par connexion | Protège contre le spam de messages et de dessin |

Côté application, le mot à deviner n'est jamais envoyé aux joueurs qui doivent le trouver : l'état est calculé séparément pour chaque joueur. Inspecter le trafic WebSocket dans le navigateur ne permet pas de tricher.

### 3.7 Intégration et livraison continues

Le workflow `.github/workflows/ci.yml` s'exécute à chaque push :

1. **Tests** : installation reproductible (`npm ci`) puis tests unitaires et d'intégration (de vrais clients Socket.io jouent une partie).
2. **Docker** : construction de la stack, démarrage avec `--wait` (attend que tous les services soient sains), appels HTTP de vérification.
3. **Publication** : sur la branche `main`, les deux images sont poussées sur GitHub Container Registry (`ghcr.io`), taguées `latest` et avec le hash du commit pour pouvoir revenir à une version précise.

## 4. Démonstration pour la soutenance

Chaque étape correspond aussi à une cible du `Makefile` (`make help` pour la liste).

```bash
# 1. Construire et lancer toute la stack
docker compose up -d --build

# 2. Vérifier l'état et la santé des services
docker compose ps

# 3. Taille des images construites
docker image ls | grep gribouille

# 4. Isolation réseau : web ne peut pas joindre Redis…
docker compose exec web sh -c "nc -zv -w 2 redis 6379" || echo "web ne voit pas redis"
#    …alors que le serveur, lui, y accède
docker compose exec redis redis-cli ping

# 5. Le serveur ne tourne pas en root
docker compose exec server id

# 6. Son système de fichiers est en lecture seule
docker compose exec server sh -c "touch /app/test" || echo "écriture refusée"

# 7. Persistance : jouer une partie, puis
docker compose exec redis redis-cli ZREVRANGE lb:wins 0 4 WITHSCORES
docker compose down && docker compose up -d
docker compose exec redis redis-cli ZREVRANGE lb:wins 0 4 WITHSCORES   # toujours là

# 8. Redémarrage automatique après un crash
docker compose exec server kill 1     # le processus principal s'arrête
sleep 6 && docker compose ps server   # il a été relancé tout seul

# 9. Logs en direct
docker compose logs -f server
```

## 5. Incidents réels et leur résolution

Plusieurs problèmes liés à la conteneurisation sont apparus en conditions réelles : conflit entre les paquets Docker de Fedora et ceux de Docker, erreur 403 due aux droits des fichiers copiés dans l'image (`umask`), priorité des règles `location` de nginx qui interceptait le client Socket.io, étiquettes SELinux sur les volumes de développement. Leur diagnostic et leur correction sont détaillés dans la partie 8 du [rapport](RAPPORT.md).

## 6. Limites et pistes d'amélioration

- **Mise à l'échelle horizontale.** Les parties vivent en mémoire dans un seul conteneur `server`. Pour en lancer plusieurs (`--scale server=3`), il faudrait l'adaptateur Redis de Socket.io et déplacer l'état des salons dans Redis.
- **HTTPS.** En production, ajouter Traefik ou Caddy devant `web` pour obtenir un certificat Let's Encrypt automatiquement.
- **Supervision.** Exporter des métriques (joueurs connectés, parties en cours) vers Prometheus et les afficher dans Grafana.
- **Scan de vulnérabilités.** Ajouter Trivy dans la CI pour bloquer une image qui contiendrait une faille critique.
- **Orchestrateur.** Le passage à Kubernetes demanderait un Deployment par service, un Service pour l'exposition et un PersistentVolumeClaim pour Redis.
