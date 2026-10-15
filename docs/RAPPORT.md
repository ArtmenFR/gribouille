# Gribouille · rapport de projet

Projet du cours de conteneurisation, B3 Systèmes, Réseaux et Cybersécurité, ESGI Reims, octobre 2026.

Ce document raconte tout le projet : ce qu'on a construit, comment, pourquoi ces choix, et les problèmes réels rencontrés en route avec leur solution. Les détails techniques sont dans deux documents complémentaires :

- [`CONTENEURISATION.md`](CONTENEURISATION.md) : chaque notion Docker utilisée, la sécurité des conteneurs et le déroulé de démonstration.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) : le fonctionnement interne du jeu (protocole temps réel, score, anti-triche, rendu).

## Sommaire

1. Le projet en une page
2. Ce que fait le jeu
3. Comment le projet a été construit
4. Architecture
5. Conteneurisation
6. Sécurité
7. Qualité : tests et intégration continue
8. Problèmes rencontrés et solutions
9. Lancer le projet et jouer à distance
10. Organisation de l'équipe
11. Identité visuelle
12. Limites et suites possibles
13. Aide-mémoire des commandes

---

## 1. Le projet en une page

**Objectif du cours.** Conteneuriser une application composée de plusieurs services avec Docker et Docker Compose, en appliquant les bonnes pratiques : images légères et reproductibles, réseaux séparés, données persistantes, supervision de l'état des services, sécurité.

**Notre choix.** Plutôt qu'une application de démonstration, on a construit un vrai jeu multijoueur, Gribouille : un joueur dessine un mot, les autres le devinent dans le chat. Ce type d'application est intéressant à conteneuriser parce qu'il combine trois besoins différents :

| Besoin | Service | Technologie |
|---|---|---|
| Pages et fichiers statiques | `web` | nginx |
| Connexion temps réel permanente (WebSocket) | `server` | Node.js + Socket.io |
| Données qui doivent survivre aux redémarrages | `redis` | Redis + volume Docker |

**Résultat.** Une commande, `make up`, construit les images, lance les trois conteneurs dans le bon ordre et attend qu'ils soient tous en bonne santé. Le jeu est ensuite jouable à plusieurs, sur le même réseau ou à distance, depuis un PC ou un téléphone.

**Quelques chiffres.** 3 conteneurs, 2 réseaux dont un interne, 1 volume, 1 seul port exposé, 574 mots en 6 paquets, 10 tests automatiques, version 1.2.0.

## 2. Ce que fait le jeu

**Une partie, étape par étape**

1. Un joueur crée une partie et reçoit un code de 4 lettres, ou un lien à partager.
2. Les autres rejoignent avec ce code. Chacun choisit son pseudo et dessine son perso.
3. Dans le salon, l'hôte choisit un mode de jeu (normal, rapide, facile, geek, expert, hardcore) ou règle tout à la main.
4. À chaque tour, un joueur choisit un mot parmi trois et le dessine. Les autres tapent leurs propositions dans le chat.
5. Plus on trouve vite, plus on marque. Le dessinateur marque aussi pour chaque joueur qui trouve.
6. Chacun peut voter pour le dessin. Les votes positifs rapportent des points au dessinateur.
7. En fin de partie : podium, meilleur dessin récompensé, galerie de tous les dessins, bouton Rejouer.

**Les fonctionnalités**

- Pseudo et perso personnalisable (peau, sweat, yeux, bouche, accessoire), modifiables à tout moment dans le salon.
- 6 paquets de mots et 6 modes préréglés, plus des mots perso ajoutés par l'hôte et cachés aux joueurs.
- Indices : des lettres se dévoilent au fil du temps.
- Réponses tolérantes : majuscules, accents, tirets, et même une phrase qui contient le mot.
- « Tu chauffes » quand on est à une lettre près, visible seulement par celui qui a tapé.
- Chat secret entre le dessinateur et ceux qui ont déjà trouvé.
- Outils de dessin : crayon, gomme, pot de peinture, 4 épaisseurs, 16 couleurs et une couleur libre, annuler.
- Bouton pour flouter son mot quand on dessine, contre les regards par-dessus l'épaule quand on joue dans la même pièce.
- Reconnexion automatique sans perdre ses points, exclusion d'un joueur par l'hôte.
- Hall of fame persistant, stocké dans Redis.
- Compatible avec les navigateurs anti-pistage (LibreWolf, Brave, Tor).

## 3. Comment le projet a été construit

Le projet a avancé par versions successives. Chaque version a été testée, puis publiée sur le dépôt GitHub.

**Version 1.0 : le jeu qui marche.** Mise en place de l'architecture à trois conteneurs, du moteur de jeu (salons, tours, scores, indices), du dessin en temps réel et du chat. Dès le départ, deux principes : le serveur ne fait jamais confiance au navigateur, et le mot à deviner n'est jamais envoyé à ceux qui doivent le trouver. Ajout des tests automatiques et de la CI.

**Version 1.1 : une vraie identité.** Les premières maquettes ont été jugées trop génériques. Le design a été entièrement repris autour d'une idée unique, « tout se dessine au trait » : logo dessiné à la main qui s'écrit tout seul, ardoise et feuilles de papier, couleurs de marqueurs, une seule police manuscrite, un jeu d'icônes maison, plus aucun emoji. Ajout des persos personnalisables, des animations, de la galerie de fin de partie et d'une charte graphique complète. Image serveur passée en multi-stage et rédaction du dossier de conteneurisation.

**Version 1.2 : retours des premiers joueurs.** Après une première vraie partie entre amis : une banque de mots beaucoup plus grande rangée en paquets, des modes de jeu préréglés, le vote pour le meilleur dessin, le bouton pour masquer son mot, l'affichage de la version, et la correction de tous les problèmes découverts pendant ces tests (voir partie 8).

L'historique complet est dans [`CHANGELOG.md`](../CHANGELOG.md) et dans les commits du dépôt.

## 4. Architecture

```
                 Navigateurs (PC, téléphone)
                           │  HTTP + WebSocket
                           ▼  port 8080, seul port exposé
   ┌──────────────────────────────────────────────────┐
   │ web        nginx                                 │
   │            fichiers du jeu, reverse proxy,       │
   │            en-têtes de sécurité                  │
   └───────────────────────┬──────────────────────────┘
              réseau front │
   ┌───────────────────────▼──────────────────────────┐
   │ server     Node.js + Socket.io                   │
   │            règles du jeu, temps réel, API        │
   └───────────────────────┬──────────────────────────┘
              réseau back  │ interne, sans accès extérieur
   ┌───────────────────────▼──────────────────────────┐
   │ redis      classement, sauvegardé sur un volume  │
   └──────────────────────────────────────────────────┘
```

Le navigateur ne parle qu'à nginx. nginx sert les fichiers du jeu et relaie vers le serveur Node deux types de requêtes : `/socket.io/` (le temps réel) et `/api/` (santé du service, classement). Le serveur Node tient l'état des parties en mémoire et enregistre les résultats dans Redis, qui n'est joignable que par lui.

## 5. Conteneurisation

Les points principaux, détaillés dans [`CONTENEURISATION.md`](CONTENEURISATION.md) :

- **Images** : image serveur multi-stage (dépendances installées dans une étape à part), images de base Alpine, ordre des couches pensé pour le cache, `.dockerignore`, métadonnées OCI.
- **Compose** : trois fichiers (référence, développement avec rechargement du code, images publiées par la CI), démarrage ordonné par `depends_on` sur l'état de santé, politique de redémarrage automatique.
- **Réseaux** : `front` (nginx et serveur) et `back` (serveur et Redis), ce dernier déclaré interne. Les conteneurs se trouvent par leur nom de service grâce au DNS de Docker.
- **Volume** : `redis-data`, qui conserve le classement après un arrêt complet de la stack.
- **Santé** : un healthcheck par service, visible dans `docker compose ps`.
- **Durcissement** : serveur en utilisateur non-root, système de fichiers en lecture seule, aucune capability Linux, `no-new-privileges`.

## 6. Sécurité

On est dans une formation cybersécurité, donc la sécurité a été pensée à trois niveaux.

**Le jeu (anti-triche).** L'état de la partie est calculé séparément pour chaque joueur. Le mot n'est envoyé qu'au dessinateur et à ceux qui l'ont déjà trouvé : ouvrir les outils de développement du navigateur ne permet pas de tricher. Toutes les actions sont vérifiées par le serveur (qui a le droit de dessiner, de lancer, de modifier les règles), les coordonnées et couleurs du dessin sont bornées, et chaque connexion est limitée en débit pour éviter le spam.

**Le navigateur.** Une politique de sécurité de contenu (CSP) stricte interdit tout script ou ressource venant d'un autre site, ainsi que l'exécution de code fourni sous forme de texte. Les polices et icônes sont hébergées avec le jeu. Les pseudos et messages des joueurs ne sont jamais injectés comme du HTML, ce qui ferme la porte aux attaques XSS.

**Les conteneurs.** Un seul port exposé, une base de données isolée sur un réseau interne, un serveur sans privilèges et en lecture seule.

## 7. Qualité : tests et intégration continue

**Tests automatiques** (`cd server && npm test`). Ils démarrent un vrai serveur et de vrais clients qui jouent : création et code, rejoindre, choix du mot, dessin, devinettes, « tu chauffes », chat secret, reconnexion, changement de pseudo et de perso, exclusion, modes préréglés, votes et meilleur dessin. Ils vérifient en particulier que le mot ne fuite jamais chez ceux qui doivent le deviner.

**Tests de bout en bout** pendant le développement : des parties complètes à trois navigateurs, dont un au format téléphone, à travers la vraie configuration nginx, avec comparaison pixel par pixel des dessins chez tous les joueurs, et un navigateur piégé qui brouille la lecture du canvas comme LibreWolf.

**Intégration continue** (GitHub Actions, à chaque push) :

1. installation reproductible et tests ;
2. construction de la stack Docker, démarrage avec attente de l'état sain, puis vérification des routes clés : page d'accueil, API, client Socket.io et poignée de main WebSocket ;
3. sur la branche principale, publication des images sur GitHub Container Registry.

## 8. Problèmes rencontrés et solutions

Ces problèmes sont tous apparus en conditions réelles, sur la machine Fedora de l'équipe ou pendant la première partie entre amis. Chacun a été diagnostiqué, corrigé, et quand c'était possible, protégé par un test pour qu'il ne revienne pas.

### 8.1 Conflit de paquets Docker sur Fedora

**Symptôme.** L'installation de `docker-ce` depuis le dépôt de Docker échouait avec des dizaines de conflits.
**Cause.** Fedora fournit déjà Docker via ses propres paquets (`moby-engine`, `docker-cli`, `docker-compose`), qui étaient installés.
**Solution.** Garder les paquets de Fedora, supprimer le dépôt Docker ajouté en trop, activer le service et ajouter l'utilisateur au groupe `docker`.
**Ce qu'on retient.** Vérifier ce qui est déjà installé avant d'ajouter un dépôt tiers.

### 8.2 Erreur 403 de nginx

**Symptôme.** La page d'accueil renvoyait « 403 Forbidden ».
**Cause.** Sur la machine de build, le masque de création de fichiers (`umask 077`) rendait les fichiers clonés lisibles par leur seul propriétaire. Docker les a copiés tels quels dans l'image, et l'utilisateur `nginx` du conteneur ne pouvait pas les lire.
**Solution.** Le `Dockerfile` du front fixe lui-même les droits (755 pour les dossiers, 644 pour les fichiers). L'image fonctionne désormais quelle que soit la configuration de la machine qui la construit.
**Ce qu'on retient.** Une image ne doit pas dépendre de l'environnement de build.

### 8.3 Le jeu s'affichait mais ne démarrait pas

**Symptôme.** Pas de perso, pas d'icônes, impossible de créer une partie.
**Cause.** Dans nginx, une règle par expression régulière (`location ~* \.js$`, ajoutée pour le cache) passe avant un simple préfixe. Le fichier `/socket.io/socket.io.min.js`, qui doit être fourni par le serveur Node, était cherché parmi les fichiers statiques et renvoyait 404. Sans lui, le script du jeu s'arrêtait dès le chargement.
**Solution.** Préfixe prioritaire `location ^~ /socket.io/` (et `^~ /api/`). La CI vérifie maintenant ce fichier et la poignée de main WebSocket.
**Ce qu'on retient.** Tester à travers le vrai reverse proxy, pas seulement le serveur applicatif.

### 8.4 Dessin rayé sur LibreWolf

**Symptôme.** Sur LibreWolf, le dessin se transformait en rayures colorées après un coup de pot de peinture.
**Cause.** LibreWolf (comme Brave et Tor) protège contre le pistage par « empreinte canvas » : quand une page relit les pixels d'un dessin, il renvoie du bruit aléatoire. Le pot de peinture relisait le canvas, récupérait ce bruit et le recollait.
**Solution.** Le jeu calcule désormais le dessin lui-même dans un tableau de pixels en mémoire et ne fait que l'afficher. Il ne relit plus jamais le canvas, et le rendu est identique sur tous les navigateurs. Vérifié avec un navigateur volontairement piégé : zéro lecture du canvas.
**Ce qu'on retient.** Une protection de vie privée côté client peut casser une fonctionnalité légitime. Mieux vaut adapter l'application que demander aux joueurs de baisser leur protection.

### 8.5 Mise à jour invisible chez les joueurs

**Symptôme.** Après une mise à jour réussie côté serveur, les nouveautés n'apparaissaient pas dans le navigateur.
**Cause.** nginx autorisait les navigateurs à garder les scripts en cache pendant une heure : la nouvelle page était chargée avec l'ancien script.
**Solution.** Les scripts, styles et pages sont désormais revalidés à chaque chargement (`Cache-Control: no-cache`, réponse 304 très légère si rien n'a changé). Seules les polices, qui ne changent jamais, restent en cache. Piège évité au passage : un `add_header` dans un bloc `location` fait perdre tous les en-têtes de sécurité hérités, dont la CSP. On utilise donc la directive `expires`, et la CI vérifie maintenant la présence de la CSP.

### 8.6 SELinux et le mode développement

**Cause.** Sur Fedora, SELinux bloque par défaut l'accès d'un conteneur aux dossiers de l'hôte montés en volume.
**Solution.** Option `:z` sur les montages du fichier `docker-compose.dev.yml`, qui donne la bonne étiquette SELinux aux fichiers.

### 8.7 La CSP bloque l'outil de test

**Constat.** Un outil de test qui exécutait du code passé sous forme de texte a été bloqué par la CSP du jeu.
**Lecture.** Ce n'était pas un bug mais la preuve que la politique de sécurité fonctionne : elle bloque exactement ce qu'un attaquant tenterait. Le test a été adapté, la CSP n'a pas été affaiblie.

## 9. Lancer le projet et jouer à distance

**Lancer** (Docker et Docker Compose nécessaires) :

```bash
gh repo clone ArtmenFR/gribouille
cd gribouille
make up          # puis http://localhost:8080
```

**Jouer avec d'autres personnes**

| Situation | Méthode |
|---|---|
| Même réseau Wi-Fi | Ouvrir le port (`sudo firewall-cmd --add-port=8080/tcp` sur Fedora), puis partager `http://IP-locale:8080` |
| À distance, sans configuration | Tunnel Cloudflare : `cloudflared tunnel --url http://localhost:8080` donne une adresse HTTPS publique temporaire |
| Réseau privé entre amis | Tailscale : les membres du réseau utilisent l'adresse Tailscale de la machine |

Le tunnel Cloudflare a été utilisé pour la première partie à distance : il fonctionne sans compte, sans toucher à la box, et transporte correctement le WebSocket. L'adresse disparaît dès qu'on coupe le tunnel.

## 10. Organisation de l'équipe

- **Dépôt GitHub privé** `ArtmenFR/gribouille`, avec les collaborateurs de l'équipe.
- **Une branche par fonctionnalité**, puis une pull request relue par un autre membre, CI au vert avant fusion. On ne pousse pas directement sur `main`.
- **Modèles** d'issues (bug, idée) et de pull request pour garder des échanges clairs.
- **Règles communes** dans [`CONTRIBUTING.md`](../CONTRIBUTING.md) : où modifier quoi, checklist avant pull request, règles de la charte graphique.
- **Commits signés** avec l'adresse « noreply » de GitHub pour ne pas exposer d'adresse personnelle.

## 11. Identité visuelle

L'identité tient en une idée : **tout se dessine au trait**. Une ardoise sombre, des feuilles de papier posées dessus, des marqueurs de couleur, une seule police manuscrite très lisible (Shantell Sans), un logo dessiné à la main qui s'écrit tout seul et un jeu d'icônes maison au même trait. Les animations suivent la même logique : ce qui apparaît se trace, ce qui récompense rebondit, et tout se coupe si le système demande moins d'animations.

La charte complète (logo, couleurs, typographie, icônes, persos, composants, mouvement, ton des textes) est consultable dans le jeu à l'adresse `/charte.html`.

## 12. Limites et suites possibles

- **Plusieurs serveurs de jeu.** Les parties vivent en mémoire dans un seul conteneur. Pour en lancer plusieurs, il faudrait l'adaptateur Redis de Socket.io et stocker les salons dans Redis.
- **HTTPS en production.** Ajouter Traefik ou Caddy devant nginx pour un certificat Let's Encrypt automatique.
- **Supervision.** Exporter des métriques (joueurs connectés, parties en cours) vers Prometheus et Grafana.
- **Scan des images.** Ajouter Trivy dans la CI pour bloquer une image vulnérable.
- **Kubernetes.** Un Deployment par service, un Service pour l'exposition, un PersistentVolumeClaim pour Redis.
- **Jeu.** Mode équipes, formes géométriques, export des dessins, plus de paquets de mots.

## 13. Aide-mémoire des commandes

| Commande | Effet |
|---|---|
| `make up` | Construit et lance la stack, attend qu'elle soit saine |
| `make ps` | État et santé des conteneurs |
| `make logs` | Journaux en direct |
| `make down` | Arrête tout (le classement est conservé) |
| `make clean` | Arrête tout et efface le classement |
| `make dev` | Mode développement avec rechargement du code |
| `make test` | Lance les tests du serveur |
| `make demo-network` | Démo : nginx ne peut pas joindre Redis |
| `make demo-security` | Démo : serveur non-root et en lecture seule |
| `make demo-volume` | Démo : le classement survit à un redémarrage |
| `make demo-restart` | Démo : redémarrage automatique après un crash |
