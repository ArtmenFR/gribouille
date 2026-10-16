# Historique des versions

## 1.4.0 · 16 octobre 2026

- Difficulté des mots : chaque mot est facile, moyen ou difficile, et rapporte ×1, ×1,5 ou ×2, à ceux qui trouvent comme au dessinateur.
- Le dessinateur choisit entre un mot de chaque niveau ; le niveau du mot s'affiche pendant le tour et à la fin.
- Plus de mots en double : un mot déjà proposé ne revient pas dans le salon, même en relançant une partie. Le serveur évite aussi les derniers mots joués, gardés dans Redis.

## 1.3.0 · 15 octobre 2026

- Thèmes de mots cochables et combinables dans le salon : on en choisit un ou plusieurs, les mots sont tirés dans tout ce qui est coché.
- 11 thèmes et 999 mots différents. Nouveaux thèmes : Animaux, Aliments, Sucreries et desserts, Amour, Personnalités connues, Gros mots (+18).
- Nouveaux modes préréglés : Gourmand, Love, Stars, Soirée. Le mode Hardcore combine les deux thèmes +18.
- Les thèmes +18 sont signalés dans le salon.

## 1.2.2 · 15 octobre 2026

- Les scripts et styles sont chargés avec le numéro de version dans leur adresse : après une mise à jour, le navigateur télécharge forcément la nouvelle version, même s'il gardait l'ancienne en cache.
- Un test vérifie que ce numéro correspond toujours à la version du serveur.

## 1.2.1 · 15 octobre 2026

- nginx : les scripts et styles sont revalidés à chaque chargement, une mise à jour est visible dès le premier rechargement.
- CI : vérifie la présence de la CSP et de l'en-tête de cache.

## 1.2.0 · 15 octobre 2026

**Nouveautés**
- Banque de mots rangée en 6 paquets : classique, facile, difficile, geek, hardcore, tout mélangé (574 mots).
- Modes de jeu préréglés dans le salon : normal, rapide, facile, geek, expert, hardcore.
- Vote pour le dessin pendant et après le tour : +25 points par vote positif net pour le dessinateur.
- Meilleur dessin de la partie : +150 points pour son auteur, mis en avant sur le podium et dans la galerie.
- Bouton pour flouter son mot quand on dessine (appui long pour le voir).
- Numéro de version affiché dans le jeu et exposé par `/api/health`.

**Corrections**
- Dessin rayé sur les navigateurs anti-pistage (LibreWolf, Brave) : le jeu ne relit plus jamais le canvas.
- nginx : le client Socket.io était intercepté par la règle de cache des fichiers `.js`.
- nginx : erreur 403 quand l'image était construite sur une machine avec un `umask` restrictif.
- Mode développement compatible SELinux (Fedora).

## 1.1.0 · 15 octobre 2026

- Nouvelle identité visuelle : logo dessiné à la main et animé, ardoise et papier, police Shantell Sans, icônes maison, plus aucun emoji.
- Persos personnalisables : peau, sweat, yeux, bouche, accessoire.
- Animations : tracés, chrono griffonné, gerbe de craie, scores animés, podium.
- Galerie des dessins de la partie, bouton Rejouer, couleur libre.
- Charte graphique consultable dans le jeu.
- Image serveur multi-stage, dossier de conteneurisation, démos `make`.

## 1.0.0 · 15 octobre 2026

- Première version : salons à code, tours, indices, scores, chat, chat secret, anti-triche.
- Stack Docker Compose : nginx, Node.js + Socket.io, Redis.
- Tests automatiques et intégration continue.
