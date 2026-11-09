<div align="center">

<img src="web/public/logo-ink.svg" alt="Gribouille" width="360">

**Dessine, devine, marque des points.** Un jeu de dessin multijoueur entre potes, entièrement conteneurisé.

Projet du cours de conteneurisation · B3 SRC · ESGI Reims

<img src="docs/screenshots/accueil.png" alt="Écran d'accueil" width="820">

</div>

## Le jeu

Un joueur crée une partie et reçoit un code à 4 lettres, ou un lien à partager. Les autres rejoignent depuis un PC ou un téléphone. À chaque tour, un joueur choisit un mot parmi trois et le dessine. Les autres tapent leurs propositions dans le chat : plus on trouve vite, plus on marque.

- **Ton pseudo et ton perso** : peau, sweat, yeux, bouche, accessoire, modifiables à tout moment dans le salon.
- **Réponses proches gardées privées** : un « tu chauffes » n'est visible que par son auteur, pour ne pas souffler la réponse aux autres.
- **Chat secret** entre le dessinateur et ceux qui ont déjà trouvé.
- **Réponses tolérantes** : majuscules, accents, tirets et même « c'est un chat ? » sont acceptés.
- **Thèmes de mots combinables** : classique, animaux, aliments, sucreries, amour, personnalités connues, geek, expressions, et deux thèmes +18. 999 mots au total, et des modes préréglés (Normal, Rapide, Gourmand, Love, Stars, Soirée, Hardcore…).
- **Mots perso cachés aux joueurs** : seul l'hôte les voit, avec l'option « uniquement nos mots ».
- **Mots faciles, moyens ou difficiles** : le dessinateur choisit, et un mot difficile rapporte deux fois plus de points. Les mots ne reviennent pas d'une partie à l'autre.
- **Vote pour le dessin** : des points bonus pour le dessinateur, et une récompense pour le meilleur dessin de la partie.
- **Mot masquable** pour le dessinateur, contre les regards quand on joue dans la même pièce.
- **Reconnexion automatique** : un rafraîchissement ou une coupure réseau ne fait pas perdre ses points.
- **Outils de dessin** : crayon, gomme, pot de peinture, 4 épaisseurs, 16 couleurs et une couleur libre, annuler (Ctrl+Z).
- **Fin de partie** : podium animé, galerie des dessins de la partie, bouton Rejouer, Hall of fame persistant.
- **Zéro dépendance externe** côté navigateur : polices et icônes hébergées avec le jeu, CSP stricte. Ça marche en LAN sans internet.
- **Compatible avec les navigateurs anti-pistage** (LibreWolf, Brave, Tor) : le jeu ne relit jamais le canvas.

## Lancer en 30 secondes

Prérequis : Docker (avec le plugin Compose) et `openssl`, sur une VM Linux ou ta machine.

```bash
git clone https://github.com/ArtmenFR/gribouille.git
cd gribouille
make up        # génère .env + mots de passe, build, démarre, attend que tout soit "healthy"
```

`make up` affiche ensuite les adresses. Tout passe par Traefik, un sous-domaine par service :

| Service | Adresse | Accès |
|---|---|---|
| Le jeu | `http://gribouille.localhost` | libre |
| Grafana (dashboards) | `http://grafana.localhost` | `admin` + mot de passe de `.env` |
| Prometheus, Alertmanager | `http://prometheus.localhost`, `http://alertmanager.localhost` | `admin` + mot de passe de `.env` |
| Boîte mail de test (Mailpit) | `http://mail.localhost` | idem |
| Dashboard Traefik | `http://traefik.localhost/dashboard/` | idem |

**Depuis un autre PC que la VM** : `*.localhost` ne fonctionne que sur la machine elle-même. Utilise `*.<ip-de-la-vm>.nip.io` (par exemple `http://gribouille.192.168.56.10.nip.io`, DNS public, aucune configuration) ou ajoute les noms dans le fichier `hosts` du PC. Si le port 80 est déjà pris, change `HTTP_PORT` dans `.env`.

Sans `make` : `./scripts/init.sh && docker compose up -d --build --wait`. Sans Docker, voir « Développer sans Docker » plus bas.

`make help` liste toutes les commandes utiles (`logs`, `ps`, `test`, `dev`, `scan`, et une démo par critère de la soutenance).

## Jouer avec ses potes

| Situation | Comment faire |
|---|---|
| Même réseau | Partager `http://gribouille.<ip-de-la-vm>.nip.io` (sur Linux : `hostname -I`) |
| À distance, sans configuration | `cloudflared tunnel --url http://localhost:80 --http-host-header gribouille.localhost` puis partager l'URL donnée |
| Réseau privé entre potes | Tailscale : chacun rejoint le réseau et utilise ton IP Tailscale |
| Serveur maison ou VPS | Lancer la stack dessus et ouvrir le port, idéalement derrière un proxy HTTPS |

## Documentation

| Document | Contenu |
|---|---|
| [`docs/RAPPORT.md`](docs/RAPPORT.md) | **Le rapport complet du projet** : démarche, choix, sécurité, problèmes rencontrés et solutions |
| [`docs/CONTENEURISATION.md`](docs/CONTENEURISATION.md) | Chaque notion Docker utilisée, les choix techniques et la procédure de restauration |
| [`docs/SOUTENANCE.md`](docs/SOUTENANCE.md) | Plan de la présentation de 15 minutes et démos associées |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Fonctionnement du jeu : protocole, score, anti-triche, rendu |
| [`CHANGELOG.md`](CHANGELOG.md) | Historique des versions |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Travailler à plusieurs sur le projet |
| `/charte.html` dans le jeu | Charte graphique complète |

## Architecture

```
   Navigateurs ──HTTP + WebSocket──▶ :80
                                      │
   ┌──────────────────────────────────▼───────────────────────────────┐
   │ traefik  (seul port publié) : un sous-domaine par service        │  réseau proxy
   └──┬──────────┬────────────┬─────────────┬──────────────┬──────────┘
      │          │            │             │              │
   web (nginx)  grafana   prometheus   alertmanager     mailpit  ◀── alertes par mail
      │          └────────────┴──── scrape ─┬──────────────┘          (réseau monitoring)
      │ réseau app (interne)                 │ cadvisor · node-exporter · redis-exporter ×2
   server (Node + Socket.io)                 │
      │ réseau data (interne)  ──────────────┘
   redis-master ──réplication──▶ redis-replica ──dump RDB──▶ redis-backup ─▶ volume backups
```

Toutes les notions Docker utilisées (multi-stage, réseaux, volumes, healthchecks, durcissement, CI) sont expliquées dans **[`docs/CONTENEURISATION.md`](docs/CONTENEURISATION.md)**, avec le déroulé de démonstration pour la soutenance. Le fonctionnement du jeu (protocole, score, anti-triche) est dans [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Charte graphique

L'identité visuelle complète (logo, couleurs, typographie, icônes, persos, composants, animations, ton) est consultable directement dans le jeu à l'adresse **`/charte.html`**, ou dans [`web/public/charte.html`](web/public/charte.html).

## Arborescence

```
gribouille/
├── compose.yml               Stack complète (14 services, 4 réseaux, 6 volumes)
├── compose.dev.yml           Surcharge dev : code monté, rechargement auto
├── compose.ghcr.yml          Utiliser les images publiées par la CI
├── .env.example              Variables (le vrai .env est généré par scripts/init.sh)
├── Makefile                  Commandes et démos
├── scripts/init.sh           Génère .env et les mots de passe
├── traefik/                  Reverse proxy : traefik.yml (statique) + dynamic.yml (routes)
├── redis/redis.conf          Persistance AOF + RDB, mémoire bornée
├── monitoring/               Prometheus (+ alertes), Alertmanager, Grafana (dashboard provisionné)
├── server/                   Serveur de jeu (Node.js)
│   ├── Dockerfile            Image multi-stage, non-root
│   ├── src/
│   │   ├── index.js          Point d'entrée HTTP + Socket.io
│   │   ├── game.js           Salons, tours, scores, anti-triche
│   │   ├── store.js          Classement Redis
│   │   └── words.js          Paquets de mots et modes de jeu
│   └── test/                 Tests unitaires et partie simulée
├── web/                      Serveur web (fichiers statiques + relais WebSocket)
│   ├── Dockerfile
│   ├── nginx.conf            Proxy WebSocket, en-têtes de sécurité
│   └── public/               Pages, styles, logo, icônes, persos, polices
├── CHANGELOG.md              Historique des versions
├── docs/
│   ├── RAPPORT.md            Rapport complet du projet
│   ├── CONTENEURISATION.md   Dossier technique du cours
│   ├── SOUTENANCE.md         Plan de présentation (15 min) et démos
│   ├── ARCHITECTURE.md       Fonctionnement du jeu
│   └── screenshots/
└── .github/                  CI, modèles d'issues et de PR
```

## Tests

```bash
cd server && npm ci && npm test
```

Les 14 tests lancent un vrai serveur et de vrais clients Socket.io qui jouent : création, code, choix du mot, dessin, devinettes, chat secret, reconnexion, changement de pseudo, exclusion, modes de jeu, votes et meilleur dessin, difficulté des mots et absence de répétition. Ils vérifient aussi que le mot ne fuite jamais chez ceux qui doivent le deviner. La CI les relance à chaque push, construit les images et vérifie que la stack démarre.

## Développer sans Docker

```bash
cd server
npm install
npm run dev          # http://localhost:3000, redémarre à chaque modification
```

Sans `REDIS_URL`, le jeu fonctionne normalement, seul le Hall of fame est désactivé.

## Contribuer

La méthode de travail à plusieurs et les idées d'amélioration sont dans [`CONTRIBUTING.md`](CONTRIBUTING.md) : une branche par fonctionnalité, une pull request, les tests au vert.

## Captures

| Salon | Le dessinateur | Fin de partie |
|---|---|---|
| ![](docs/screenshots/salon.png) | ![](docs/screenshots/jeu-dessinateur.png) | ![](docs/screenshots/podium.png) |

## Licence

MIT, voir [`LICENSE`](LICENSE).
