# Architecture technique

## Vue d'ensemble

Trois conteneurs orchestrés par Docker Compose, sur deux réseaux :

| Service | Image | Rôle | Réseaux | Exposé |
|---|---|---|---|---|
| `web` | nginx:1.27-alpine | Sert le front statique, reverse proxy HTTP/WebSocket, en-têtes de sécurité | front | oui (8080) |
| `server` | node:20-alpine | Logique du jeu temps réel (Socket.io), API `/api/*` | front, back | non |
| `redis` | redis:7-alpine | Classement global persistant | back (`internal`) | non |

Le réseau `back` est déclaré `internal: true` : Redis n'a aucune route vers l'extérieur et n'est joignable que par `server`.

## Cycle d'une partie

```
lobby ──(hôte lance)──► choosing ──(mot choisi / 15 s)──► drawing ──(temps écoulé / tous ont trouvé)──► turnEnd
                            ▲                                                                            │ 6 s
                            └──────────────────────────── tour suivant ◄───────────────────────────────┘
                                                              │ plus de tours
                                                              ▼
                                                          gameOver ──(15 s)──► lobby
```

L'état de chaque salon vit en mémoire dans le serveur (`Room` dans `game.js`). Une boucle globale tourne toutes les 250 ms pour gérer les délais (choix du mot, fin du temps, indices, nettoyage).

## Protocole Socket.io

### Client → serveur

| Événement | Données | Qui |
|---|---|---|
| `room:create` | `{ name, avatar, token }` + callback | tous |
| `room:join` | `{ code, name, avatar, token }` + callback | tous |
| `room:leave` | | joueur |
| `room:settings` | `{ rounds?, drawTime?, maxPlayers?, hints?, customOnly?, customWords? }` | hôte, au salon |
| `room:kick` | `playerId` | hôte |
| `game:start` | callback | hôte |
| `word:choose` | index 0..2 | dessinateur |
| `draw` | op de dessin (voir plus bas) | dessinateur |
| `draw:undo` | | dessinateur |
| `chat` | texte (100 car. max) | joueur |
| `react` | `1` ou `-1` | devineurs |

### Serveur → client

| Événement | Contenu |
|---|---|
| `state` | État **personnalisé** du salon pour ce joueur |
| `history` | Toutes les ops du dessin en cours (arrivée en cours de tour) |
| `draw` / `undo` | Op à appliquer / trait à retirer |
| `chat` | Message (`chat`, `system`, `success`, `close`, `secret`, …) |
| `reactions`, `sfx`, `kicked` | Divers |

### Ops de dessin

Le canvas a une résolution logique fixe de **800×600**, mise à l'échelle par le CSS. Toutes les coordonnées sont dans ce repère, ce qui rend le rendu identique chez tout le monde, y compris le pot de peinture.

```js
{ t: 'l', s: 'id-trait', c: '#rrggbb', w: 10, p: [x0, y0, x1, y1] }  // segment
{ t: 'f', s: 'id-trait', c: '#rrggbb', p: [x, y] }                  // remplissage
{ t: 'c', s: 'id-trait' }                                            // tout effacer
```

Annuler retire toutes les ops consécutives qui partagent le même identifiant de trait `s`.

## Score

- Devineur : `100 + 400 × (temps restant / temps total)`, +50 pour le premier
- Dessinateur : `50 + 50 × (temps restant / temps total)` par joueur qui trouve
- Indices : jusqu'à 3 lettres dévoilées à 45 %, 65 % et 82 % du temps

## Sécurité (c'est aussi un projet cyber 😉)

**Anti-triche**
- Le mot n'est envoyé qu'au dessinateur et à ceux qui l'ont trouvé : l'état est calculé **par joueur**, jamais diffusé tel quel. Inspecter le trafic WebSocket ne donne rien.
- Les choix de mots et les mots perso ne sont visibles que par ceux qui doivent les voir.
- Les réponses « presque » ne sont pas diffusées, le chat des joueurs ayant trouvé est isolé.
- Toutes les actions sont vérifiées côté serveur (qui dessine, état du tour, hôte…).

**Validation des entrées**
- Pseudos et messages nettoyés (caractères de contrôle, caractères bidi), longueur limitée.
- Ops de dessin validées strictement : type, couleur `#rrggbb`, épaisseur et coordonnées bornées.
- Le front n'utilise jamais `innerHTML` avec des données joueurs (pas de XSS possible via pseudo ou chat).
- Limitation de débit par socket (chat, dessin, actions) et taille max des messages Socket.io.

**Durcissement des conteneurs**
- `server` tourne en utilisateur `node`, système de fichiers en lecture seule, toutes les capabilities retirées, `no-new-privileges`.
- Redis isolé sur un réseau interne.
- nginx : `server_tokens off`, CSP stricte, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Healthchecks sur les trois services, démarrage ordonné via `depends_on: condition: service_healthy`.

## Limites connues

- L'état des parties est en mémoire : un redémarrage du conteneur `server` coupe les parties en cours (le classement Redis est conservé).
- Un seul conteneur `server` : pour en lancer plusieurs, il faudrait l'adaptateur Redis de Socket.io et stocker les salons dans Redis.
