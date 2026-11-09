# Gribouille · dossier technique de conteneurisation

Projet réalisé dans le cadre du cours de conteneurisation (B3 Systèmes, Réseaux et Cybersécurité, ESGI Reims).

## 1. Objectif

Déployer une infrastructure web complète sur une VM, entièrement avec Docker et Docker Compose : l'application, un reverse proxy, un serveur web, une base de données répliquée, des sauvegardes, un service mail et du monitoring. Le tout doit être reproductible depuis zéro (`make up`), robuste (healthchecks, redémarrages), persistant (volumes) et durci (non-root, réseaux isolés, pas de socket Docker exposé).

L'application est un jeu de dessin multijoueur : un joueur dessine un mot, les autres le devinent dans le chat. Elle a été choisie parce qu'elle combine trois choses intéressantes à conteneuriser : du contenu statique, une connexion WebSocket permanente et une base de données.

## 2. Architecture

```
                    Navigateurs (PC, téléphone)
                              │ HTTP + WebSocket
                              ▼ port 80 (seul port publié)
 ┌─────────────────────────────────────────────────────────────────────┐
 │ traefik    reverse proxy : un sous-domaine par service              │  réseau proxy
 └──┬───────────┬────────────┬──────────────┬─────────────┬────────────┘
    │           │            │              │             │
  web         grafana    prometheus    alertmanager    mailpit
  nginx          │            │ scrape        │ SMTP        ▲
    │            └────────────┤               └─────────────┘   réseau monitoring
    │ réseau app              ├─ cadvisor (conteneurs)             (interne)
    │ (interne)               ├─ node-exporter (VM)
  server                      └─ redis-exporter ×2
  Node + Socket.io                          │
    │ réseau data (interne) ────────────────┘
  redis-master ──réplication──▶ redis-replica ──dump RDB──▶ redis-backup
        │                            │                           │
   vol. redis-data           vol. redis-replica-data       vol. backups
```

| Service | Image | Rôle | Réseaux | Persistance |
|---|---|---|---|---|
| `traefik` | `traefik:v3.6` | Reverse proxy, **seul port publié** (80) | proxy | config en bind mounts |
| `web` | construite (`web/Dockerfile`, nginx) | Serveur web : fichiers statiques + relais WebSocket | proxy, app | `nginx.conf` en bind mount |
| `server` | construite (`server/Dockerfile`, Node) | Application : jeu temps réel | app, data | mémoire (parties éphémères) |
| `redis-master` | `redis:7-alpine` | Base de données (classement) | data | volume `redis-data` (AOF + RDB) |
| `redis-replica` | `redis:7-alpine` | Réplica en lecture seule du master | data | volume `redis-replica-data` |
| `redis-backup` | `redis:7-alpine` | Dump RDB périodique du replica, rotation | data | volume `backups` |
| `mailpit` | `axllent/mailpit` | Serveur SMTP de test + interface web | proxy, monitoring | aucune |
| `prometheus` | `prom/prometheus` | Collecte des métriques, règles d'alerte | proxy, monitoring | volume `prometheus-data` |
| `alertmanager` | `prom/alertmanager` | Envoie les alertes par mail | proxy, monitoring | volume `alertmanager-data` |
| `grafana` | `grafana/grafana` | Dashboards (provisionnés par fichiers) | proxy, monitoring | volume `grafana-data` |
| `cadvisor` | `gcr.io/cadvisor/cadvisor` | Métriques par conteneur | monitoring | aucune |
| `node-exporter` | `prom/node-exporter` | Métriques de la VM | monitoring | aucune |
| `redis-exporter-master/-replica` | `oliver006/redis_exporter` | Métriques Redis et état de la réplication | data, monitoring | aucune |

## 3. Les choix et les notions Docker mises en œuvre

### 3.1 Images et Dockerfile

**Image multi-stage (`server/Dockerfile`).** La première étape `deps` installe uniquement les dépendances de production avec `npm ci`, qui suit exactement le `package-lock.json` (build reproductible). La seconde étape `runtime` repart d'une image propre et ne récupère que le dossier `node_modules`. Résultat : ni cache npm ni fichiers temporaires dans l'image finale.

**Ordre des couches et cache.** Les fichiers `package*.json` sont copiés avant le code source. Tant que les dépendances ne changent pas, Docker réutilise la couche `npm ci` en cache et un rebuild après une modification du code prend quelques secondes.

**Images de base Alpine, versions épinglées.** Aucune image `latest` : chaque tag est fixé pour que le build soit reproductible. Alpine réduit la taille et la surface d'attaque.

**`.dockerignore`, labels OCI.** Le contexte de build exclut `node_modules`, les tests et la documentation ; les labels `org.opencontainers.image.*` décrivent chaque image.

### 3.2 Orchestration avec Docker Compose

**Fichier `compose.yml` + surcharges.** `compose.yml` est la stack de référence ; `compose.dev.yml` monte le code source dans les conteneurs (rechargement à chaud) ; `compose.ghcr.yml` utilise les images publiées par la CI au lieu de les construire.

**Ordre de démarrage fiable.** `depends_on` avec `condition: service_healthy` : Redis master → replica → backup ; Redis → server → web ; Mailpit → Alertmanager ; Prometheus → Grafana. `docker compose up --wait` ne rend la main que quand tous les services sont sains.

**Réglages communs (ancre YAML `x-common`).** Redémarrage `unless-stopped`, `no-new-privileges` et rotation des logs (`json-file`, 10 Mo × 3) définis une seule fois.

**Limites de ressources.** Chaque service a une limite mémoire (`mem_limit`), le serveur de jeu aussi une limite CPU : un service qui s'emballe ne peut pas faire tomber la VM. Redis a en plus `maxmemory` et la politique `noeviction` (on refuse d'écrire plutôt que d'effacer le classement).

**Configuration par fichiers (bind mounts).** `nginx.conf`, `redis.conf`, la config Traefik, Prometheus, Alertmanager et le provisioning Grafana sont montés en lecture seule depuis le dépôt : on modifie un fichier sur la VM, on redémarre le service, sans rebuild. Le code du jeu n'est monté qu'en mode dev (`compose.dev.yml`) : en production, l'image doit rester autonome et ses droits de fichiers maîtrisés.

**Secrets.** Les mots de passe sont générés aléatoirement par `scripts/init.sh` dans un `.env` ignoré par Git (permissions 600). Le compose refuse de démarrer s'ils manquent (`${REDIS_PASSWORD:?…}`). Aucun secret n'est écrit dans une image ni dans un fichier suivi par Git.

### 3.3 Reverse proxy (Traefik)

Traefik est le seul conteneur qui publie un port. Chaque service expose son interface web sur son propre sous-domaine (`gribouille.`, `grafana.`, `prometheus.`, `alertmanager.`, `mail.`, `traefik.`). Les règles de routage utilisent une expression régulière sur le début du nom d'hôte (`^grafana\..+$`) : le domaine n'est écrit nulle part, donc `*.localhost`, `*.<ip>.nip.io` ou un nom du fichier `hosts` fonctionnent sans rien changer.

**Choix : provider « fichier » plutôt que labels Docker.** Avec les labels, Traefik doit lire le socket Docker, qui donne un contrôle total de l'hôte à qui le compromet (Traefik est exposé sur Internet). Avec un fichier de routes, Traefik n'a aucun accès à Docker : surface d'attaque réduite, et pas de dépendance à la version de l'API Docker (Docker 29 a d'ailleurs cassé les anciennes versions de Traefik). Le prix : les routes sont écrites à la main dans `traefik/dynamic.yml`, ce qui est raisonnable pour une stack fixe.

**Authentification.** Prometheus, Alertmanager, Mailpit et le dashboard Traefik n'ont pas d'authentification propre : ils passent par un middleware `basicAuth` (fichier `users.htpasswd` généré, hors Git). Grafana a la sienne.

**Traefik lui-même** tourne en `nobody` (port interne 8000, donc aucune capability nécessaire), en lecture seule, `cap_drop: ALL`. Le WebSocket du jeu traverse Traefik puis nginx sans configuration spéciale.

**Pourquoi garder nginx derrière Traefik ?** Traefik est le point d'entrée unique et sait router plusieurs services ; nginx reste le serveur web du jeu : fichiers statiques, compression, en-têtes de sécurité (CSP stricte), cache. Chacun fait ce qu'il fait le mieux.

### 3.4 Réseaux

Quatre réseaux bridge, **tous `internal: true` sauf `proxy`** (le seul qui doit porter le port publié) :

| Réseau | Membres | Pourquoi |
|---|---|---|
| `proxy` | traefik, web, grafana, prometheus, alertmanager, mailpit | Ce que Traefik doit pouvoir joindre |
| `app` (interne) | web, server | Le front parle au serveur de jeu, rien d'autre |
| `data` (interne) | server, redis ×2, backup, exporters Redis | Les données ne sont joignables ni par Traefik ni par web |
| `monitoring` (interne) | prometheus, alertmanager, grafana, mailpit, cadvisor, node-exporter, exporters | La collecte reste privée |

Conséquences vérifiables : `web` ne peut pas joindre Redis (`make demo-network`), et le serveur de jeu, Redis et la pile de monitoring n'ont aucune sortie vers Internet. Les conteneurs se trouvent par leur **nom de service** (DNS interne de Docker), aucune IP écrite en dur.

### 3.5 Volumes et persistance

| Volume | Contenu | Détruit par |
|---|---|---|
| `redis-data` | AOF (`appendfsync everysec`) + RDB du master | `down -v` seulement |
| `redis-replica-data` | copie du replica | `down -v` |
| `backups` | dumps `redis-AAAAMMJJ-HHMMSS.rdb`, 12 conservés (`BACKUP_KEEP`) toutes les 5 min (`BACKUP_INTERVAL`) | `down -v` |
| `prometheus-data` | métriques, rétention 7 jours | `down -v` |
| `grafana-data`, `alertmanager-data` | préférences Grafana, silences d'alertes | `down -v` |

`docker compose down` suivi de `up` ne perd rien. L'état des parties en cours reste en mémoire dans `server` : choix assumé (données éphémères, performance).

### 3.6 Réplication et sauvegardes

**Master / replica.** `redis-replica` suit `redis-master` (`--replicaof`, authentifié par `--masterauth`) et refuse les écritures. Son healthcheck vérifie que le lien de réplication est établi (`master_link_status:up`), pas seulement que Redis répond. Il apporte une copie à chaud et sert de source aux sauvegardes.

**Sauvegardes.** `redis-backup` exécute `redis-cli --rdb` **sur le replica**, ce qui évite de charger le master. Un dump est pris à intervalle régulier dans le volume `backups`, les plus anciens sont supprimés. Son healthcheck échoue si aucun dump récent n'existe.

**Restauration** (à tester sur un environnement de démonstration avant de s'y fier) :

```bash
docker compose stop server redis-replica redis-master redis-backup
docker run --rm -v gribouille_redis-data:/data -v gribouille_backups:/backups:ro redis:7-alpine \
  sh -c 'rm -rf /data/appendonlydir /data/appendonly.aof && cp /backups/redis-XXXX.rdb /data/dump.rdb && chown redis:redis /data/dump.rdb'
docker compose up -d --wait        # puis : docker compose exec redis-master redis-cli dbsize
```

### 3.7 Santé des services

Tous les services applicatifs déclarent un `HEALTHCHECK` (`traefik healthcheck`, `wget` sur `/api/health`, `redis-cli ping`, `/mailpit readyz`, `/-/healthy` pour Prometheus et Alertmanager, `/api/health` pour Grafana, âge du dernier dump pour le backup). `docker compose ps` affiche `healthy` / `unhealthy` et ces états pilotent l'ordre de démarrage. Les exporters et cAdvisor n'en ont pas : leur disparition est détectée par l'alerte `TargetDown`.

### 3.8 Monitoring et alertes

Prometheus collecte Traefik (requêtes, codes HTTP), cAdvisor (CPU/RAM/réseau par conteneur), node-exporter (la VM) et les deux exporters Redis (clients, mémoire, commandes/s, état de la réplication). Grafana charge au démarrage, depuis des fichiers, la source de données et le dashboard **Gribouille : vue d'ensemble** : rien à configurer à la main.

Six règles d'alerte (`monitoring/prometheus/alerts.yml`) : cible injoignable, replica déconnecté, mémoire Redis > 80 %, mémoire d'un conteneur > 90 % de sa limite, erreurs 5xx en continu, disque de la VM > 90 %. Alertmanager les envoie **par mail à Mailpit**, qui joue le rôle de serveur mail de la VM : on voit les alertes arriver dans son interface (`mail.<domaine>`). En production, on remplace `mailpit:1025` par un vrai relais SMTP dans `alertmanager.yml`.

### 3.9 Sécurité

| Mesure | Où | Effet |
|---|---|---|
| Un seul port publié | Traefik | Surface d'attaque réduite au reverse proxy |
| Pas de socket Docker monté dans Traefik | `traefik/dynamic.yml` | Un Traefik compromis ne contrôle pas l'hôte |
| Réseaux internes | `app`, `data`, `monitoring` | Pas de sortie Internet, Redis invisible du proxy et du front |
| Authentification Redis | `--requirepass` / `--masterauth` | Même sur le réseau interne, il faut le mot de passe |
| Mots de passe générés, hors Git | `scripts/init.sh`, `.env` en 600 | Aucun secret par défaut ni dans le dépôt |
| `basicAuth` sur les interfaces d'admin | Traefik | Prometheus, Alertmanager, Mailpit, dashboard protégés |
| Non-root | `USER node`, `redis`, Traefik en `nobody` | Une faille ne donne pas root dans le conteneur |
| Système de fichiers en lecture seule | `read_only: true` + `tmpfs` | Impossible d'écrire un fichier malveillant dans l'image |
| `cap_drop: ALL` | server, redis, Traefik, backup, exporters | Aucun privilège noyau superflu |
| `no-new-privileges` | tous les services | Bloque l'élévation de privilèges via setuid |
| Limites de ressources, logs bornés | tous les services | Un service qui déraille ne sature ni la RAM ni le disque |
| Versions épinglées | tous les tags | Builds reproductibles, pas de mise à jour surprise |
| En-têtes HTTP | `web/nginx.conf` | CSP stricte, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `server_tokens off` |
| Validation côté serveur | `server/src/game.js` | Le client n'est jamais cru ; le mot à deviner n'est jamais envoyé à ceux qui doivent le trouver |

Exceptions assumées : `redis-backup` tourne en root (`cap_drop: ALL`, système de fichiers en lecture seule) car un volume neuf appartient à root ; `cadvisor` et `node-exporter` doivent lire l'hôte (montages en lecture seule, `pid: host` pour node-exporter), c'est inhérent à leur rôle.

### 3.10 Intégration et livraison continues

Le workflow `.github/workflows/ci.yml` s'exécute à chaque push :

1. **Tests** : `npm ci` puis tests unitaires et d'intégration (de vrais clients Socket.io jouent une partie).
2. **Docker** : `init.sh`, construction et démarrage de **toute** la stack avec `--wait`, puis vérifications : le jeu via Traefik, Grafana, authentification refusée (401) puis acceptée sur Mailpit, réplication Redis active, Redis injoignable depuis `web`, présence d'un backup.
3. **Publication** : sur `main`, les deux images sont poussées sur `ghcr.io`, taguées `latest` et avec le hash du commit.

## 4. Démonstration

Une cible `make` par critère (`make help`) :

| Critère | Commande | Ce qu'on montre |
|---|---|---|
| Reproductible | `make clean && make up` | De zéro à tout `healthy` en une commande |
| Robustesse | `make ps`, `make demo-restart` | Healthchecks ; le serveur est relancé seul après un crash |
| Persistance | `make demo-volume` | Le classement survit à `down` / `up` |
| Réplication | `make demo-replica` | Donnée écrite sur le master lue sur le replica, écriture refusée sur le replica |
| Sauvegardes | `make demo-backup` | Dump pris sur le replica, listé dans le volume `backups` |
| Réseau / proxy | `make demo-network`, `make urls` | `web` ne voit pas Redis ; chaque service accessible par son sous-domaine |
| Sécurité | `make demo-security`, `make scan` | Non-root, lecture seule ; scan Trivy des images |
| Monitoring + mail | `make demo-alert` | Le replica est coupé, l'alerte arrive dans Mailpit en ~2 minutes |

## 5. Incidents réels et leur résolution

Problèmes liés à la conteneurisation rencontrés en conditions réelles : conflit entre les paquets Docker de Fedora et ceux de Docker, erreur 403 due aux droits des fichiers copiés dans l'image (`umask`), priorité des règles `location` de nginx qui interceptait le client Socket.io, étiquettes SELinux sur les volumes de développement (détail dans la partie 8 du [rapport](RAPPORT.md)). Sur la stack étendue : Docker 29 a relevé la version minimale de son API, ce qui casse les Traefik antérieurs à 3.6.1 (le provider « fichier » évite le problème) et impose une version récente de cAdvisor.

## 6. Limites et pistes d'amélioration

- **Basculement automatique.** Le replica apporte une copie et des sauvegardes, pas un failover : si le master tombe, le jeu perd son classement le temps de le relancer. Redis Sentinel automatiserait la promotion.
- **Mise à l'échelle horizontale.** Les parties vivent en mémoire dans un seul conteneur `server`. Plusieurs instances demanderaient l'adaptateur Redis de Socket.io et l'état des salons dans Redis.
- **HTTPS.** Le certificat Let's Encrypt automatique de Traefik nécessite un vrai nom de domaine public ; sur une VM de laboratoire, la pile reste en HTTP.
- **Secrets.** Les mots de passe sont dans `.env` (visible par `docker inspect`) ; les Docker secrets ou un coffre (Vault, SOPS) seraient l'étape suivante.
- **Métriques applicatives.** Un endpoint `/metrics` dans le serveur (joueurs connectés, parties en cours) enrichirait le dashboard.
- **Sauvegardes hors VM.** Le volume `backups` est sur la même machine : une copie vers un stockage distant est nécessaire contre la perte de la VM.
- **Orchestrateur.** Le passage à Kubernetes demanderait un Deployment par service, un Ingress à la place de Traefik/compose et des PersistentVolumeClaims.
