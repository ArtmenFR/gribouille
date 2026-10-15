# Contribuer à Gribouille

Bienvenue dans l'équipe ! Voici comment on bosse à plusieurs sans se marcher dessus.

## Workflow Git

1. Récupère la dernière version : `git pull origin main`
2. Crée une branche par fonctionnalité : `git checkout -b feat/mode-equipes` (ou `fix/...`, `docs/...`)
3. Code, teste, commit souvent avec des messages clairs :
   - `feat: ajoute le mode équipes`
   - `fix: le timer ne s'arrêtait pas quand le dessinateur part`
   - `docs: explique le déploiement sur VPS`
4. Pousse ta branche et ouvre une **Pull Request** vers `main`
5. Un autre membre relit, la CI doit être verte, puis on merge

On ne pousse jamais directement sur `main`.

## Avant d'ouvrir une PR

- [ ] `cd server && npm test` passe
- [ ] `docker compose up -d --build` démarre sans erreur
- [ ] Testé à au moins 2 navigateurs (une fenêtre privée suffit pour le 2e joueur)
- [ ] Rien qui envoie le mot à deviner à un joueur qui ne doit pas le voir

## Où toucher quoi

| Je veux… | Fichier |
|---|---|
| Ajouter des mots | `server/src/words.js` |
| Changer les règles, le score, les délais | `server/src/game.js` (constantes en haut du fichier) |
| Ajouter un événement réseau | `server/src/game.js` (fonction `attach`) + `web/public/app.js` (section réseau) |
| Modifier l'interface | `web/public/index.html`, `style.css`, `app.js` |
| Changer l'infra | `docker-compose.yml`, `web/nginx.conf`, les `Dockerfile` |

## Idées d'améliorations (servez-vous !)

**Gameplay**
- [ ] Mode équipes (2 équipes qui s'affrontent)
- [ ] Packs de mots thématiques au choix (cyber, films, ESGI…) et autres langues
- [ ] Vote pour exclure un joueur toxique
- [ ] Mode « dessin à l'aveugle » (le dessinateur ne voit pas son canvas)
- [ ] Bonus de rapidité visible, combo de bonnes réponses

**Outils de dessin**
- [ ] Formes (rectangle, cercle, ligne droite)
- [ ] Sélecteur de couleur libre
- [ ] Rejouer le dessin en accéléré à la fin du tour, export en PNG
- [ ] Galerie des meilleurs dessins de la partie

**Infra / DevOps**
- [ ] Certificat HTTPS automatique (Traefik + Let's Encrypt, ou Caddy)
- [ ] Monitoring Prometheus + Grafana (joueurs connectés, parties en cours)
- [ ] Plusieurs instances `server` avec l'adaptateur Redis de Socket.io
- [x] Publication des images sur GitHub Container Registry depuis la CI

**Sécurité**
- [ ] Filtre de gros mots configurable
- [ ] Scan des images avec Trivy dans la CI
- [ ] Audit : essayer de tricher ou de faire planter le serveur, documenter et corriger

Avant de commencer un gros chantier, crée une issue pour prévenir les autres et éviter les doublons.

## Charte graphique

L'univers, c'est le **street art** : un mur de béton, des stickers collés, une affiche scotchée pour dessiner.

| Rôle | Valeur |
|---|---|
| Mur (fond) | `#2d2c33` + grain |
| Papier | `#f6f4ee` |
| Encre | `#141316` |
| Bombe rose (action principale) | `#ff3d8b` |
| Bombe jaune (stickers, actif) | `#ffd60a` |
| Bombe cyan (action secondaire) | `#2ad4ff` |
| Bombe verte (bonne réponse) | `#8cf25b` |

Polices : **Rubik Wet Paint** uniquement pour le logo et les grands effets, **Permanent Marker** pour ce qui est écrit à la main (pseudos, mots, code, titres), **Rubik** pour tout le reste. Bordures épaisses noires et ombres décalées, jamais d'ombres floues sur les éléments d'interface.
