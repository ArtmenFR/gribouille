# Soutenance · 15 minutes, 4 intervenants

Consigne : pas de PowerPoint, on montre la stack qui tourne et on explique les choix. Tout le monde parle (le sujet demande de ne pas confier la partie applicative à une seule personne).

## Avant de passer (5 min de préparation)

```bash
make clean && make up     # on repart de zéro : montre aussi la reproductibilité
make urls                 # onglets déjà ouverts : jeu, Grafana, Mailpit, Traefik
```

Jouer une partie à 2 navigateurs pour que le classement ne soit pas vide. Garder un terminal dans le dossier du projet et `compose.yml` ouvert dans l'éditeur.

## Déroulé

| Min | Qui | Contenu | Démo |
|---|---|---|---|
| 0 – 1 | A | Le besoin : un jeu de dessin multijoueur (statique + WebSocket + base de données) = bon cas pour une vraie infra. Schéma d'architecture du README. | Le jeu dans le navigateur |
| 1 – 4 | A | **Application** : `server/Dockerfile` multi-stage (étape `deps` / `runtime`), cache des couches, non-root, healthcheck, `.dockerignore`, tags épinglés. `web/Dockerfile` (nginx). | `make images` (tailles) |
| 4 – 7 | B | **`compose.yml` et réseau** : 14 services, `depends_on` + `service_healthy`, ancre `x-common`, limites de ressources, logs bornés. **Traefik** : seul port publié, un sous-domaine par service, `basicAuth`, provider fichier (pourquoi pas le socket Docker). 4 réseaux internes. | `make urls`, `make demo-network` |
| 7 – 10 | C | **Données** : Redis master + replica, AOF + RDB, volumes nommés, `redis-backup` (dump du replica, rotation), `redis.conf` en bind mount. Persistance, restauration. | `make demo-replica`, `make demo-backup`, `make demo-volume` |
| 10 – 13 | D | **Monitoring + mail** : Prometheus, cAdvisor, node-exporter, exporters Redis, dashboard Grafana provisionné, 6 alertes → Alertmanager → Mailpit (serveur mail de la VM). | Lancer `make demo-alert` au début de la section, ouvrir Grafana, puis Mailpit à la fin |
| 13 – 15 | D puis tous | **Sécurité** (non-root, lecture seule, `cap_drop`, secrets générés, scan Trivy), **difficultés**, **améliorations**. | `make demo-security` |

## Difficultés à raconter (vraies, documentées dans `docs/`)

- Droits des fichiers copiés dans l'image (`umask`) : 403 en production, corrigé dans le Dockerfile.
- Priorité des `location` nginx qui interceptait `socket.io.min.js`.
- SELinux (Fedora) sur les bind mounts : option `:z`, `label=disable` pour cAdvisor.
- Docker 29 : API minimale relevée, anciens Traefik et cAdvisor cassés → provider fichier, versions récentes.
- Un volume neuf appartient à root : pourquoi `redis-backup` est l'exception non-root.

## Améliorations à citer

Redis Sentinel (failover automatique), HTTPS avec Let's Encrypt (nom de domaine public), Docker secrets, `/metrics` applicatif, copie des sauvegardes hors de la VM, Kubernetes.

## Grille de notation → où le montrer

| Critère | Preuve |
|---|---|
| Fonctionnel depuis zéro | `make clean && make up` |
| Bonnes pratiques (sécu, perfs) | Multi-stage, non-root, `read_only`, `cap_drop`, limites de ressources, `make scan` |
| Robustesse | `make ps` (healthchecks), `make demo-restart`, `depends_on: service_healthy` |
| Persistance | `make demo-volume`, volume `backups` |
| Proxy bien configuré | Un seul port publié, tous les services par sous-domaine (`make urls`), `dynamic.yml` |
| Clarté / délais | Ce tableau : 4 blocs de ~3 min |
| Cohérence | Chaque service répond à un besoin du jeu (données, accès, supervision, alertes) |
