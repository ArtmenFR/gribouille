# Contribuer à Gribouille

Voici comment on travaille à plusieurs sans se marcher dessus.

## L'équipe

| GitHub | Rôle |
|---|---|
| [@ArtmenFR](https://github.com/ArtmenFR) | Propriétaire du dépôt |
| [@cytrafps](https://github.com/cytrafps) | Collaborateur |

Le dépôt est privé. Pour rejoindre l'équipe, demande une invitation au propriétaire puis accepte-la sur GitHub.

## Workflow Git

1. Récupère la dernière version : `git pull origin main`
2. Crée une branche par fonctionnalité : `git checkout -b feat/mode-equipes` (ou `fix/...`, `docs/...`)
3. Commit souvent, avec des messages clairs :
   - `feat: ajoute le mode équipes`
   - `fix: le chrono ne s'arrêtait pas quand le dessinateur part`
   - `docs: explique le déploiement sur VPS`
4. Pousse ta branche et ouvre une pull request vers `main`
5. Un autre membre relit, la CI doit être verte, puis on fusionne

On ne pousse jamais directement sur `main`.

## Avant d'ouvrir une pull request

- [ ] `cd server && npm test` passe
- [ ] `docker compose up -d --build` démarre sans erreur
- [ ] Testé avec au moins 2 navigateurs (une fenêtre privée suffit pour le 2e joueur)
- [ ] Le mot à deviner n'est toujours envoyé qu'à ceux qui ont le droit de le voir
- [ ] L'interface respecte la charte (voir plus bas)

## Où toucher quoi

| Je veux… | Fichier |
|---|---|
| Ajouter des mots | `server/src/words.js` |
| Changer les règles, le score, les délais | `server/src/game.js` (constantes en haut du fichier) |
| Ajouter un événement réseau | `server/src/game.js` (fonction `attach`) et `web/public/app.js` (section réseau) |
| Modifier l'interface | `web/public/index.html`, `style.css`, `app.js` |
| Ajouter une pièce de perso | `web/public/avatar.js` et `AVATAR_LIMITS` dans `server/src/game.js` |
| Ajouter une icône | `web/public/icons.js` |
| Changer l'infra | `docker-compose.yml`, `web/nginx.conf`, les `Dockerfile` |

## Charte graphique

La référence complète est la page `/charte.html` du jeu. Les règles à retenir :

- **Pas d'emoji**, nulle part : ni dans l'interface, ni dans les messages du serveur, ni dans la doc. On utilise les icônes de `icons.js`.
- **Une seule police**, Shantell Sans, en 400, 600 ou 800. Les tailles viennent des variables `--fs-*`.
- **Couleurs** : uniquement les jetons de `style.css` (`--slate-*`, `--paper*`, `--ink*` et les marqueurs). Un seul bouton jaune par écran.
- **Espacements** : uniquement `--s1` à `--s7`.
- **Mouvement** : ce qui apparaît se trace ou glisse (`--ease-out`), les récompenses rebondissent (`--ease-spring`). Toute nouvelle animation doit rester désactivée quand le système demande moins d'animations.
- **Textes** : tutoiement, phrases courtes, un bouton dit exactement ce qu'il fait, une erreur dit quoi faire.

## Idées d'amélioration

**Gameplay**
- [ ] Mode équipes
- [ ] Packs de mots thématiques au choix (cyber, films, ESGI) et autres langues
- [ ] Vote pour exclure un joueur
- [ ] Mode « dessin à l'aveugle »

**Outils de dessin**
- [ ] Formes (rectangle, cercle, ligne droite)
- [ ] Rejouer le dessin en accéléré à la fin du tour, export en PNG
- [x] Couleur libre
- [x] Galerie des dessins de la partie

**Infra**
- [ ] Certificat HTTPS automatique (Traefik ou Caddy)
- [ ] Supervision Prometheus et Grafana
- [ ] Plusieurs instances `server` avec l'adaptateur Redis de Socket.io
- [x] Publication des images sur GitHub Container Registry depuis la CI

**Sécurité**
- [ ] Filtre de mots configurable
- [ ] Scan des images avec Trivy dans la CI
- [ ] Audit : essayer de tricher ou de faire tomber le serveur, documenter et corriger

Avant de commencer un gros chantier, crée une issue pour prévenir les autres.
