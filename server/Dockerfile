# syntax=docker/dockerfile:1

# ---------- Étape 1 : dépendances de production ----------
# On installe les modules dans une étape à part : l'image finale ne garde
# ni le cache npm ni les fichiers temporaires de l'installation.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---------- Étape 2 : image d'exécution ----------
FROM node:20-alpine AS runtime

LABEL org.opencontainers.image.title="gribouille-server" \
      org.opencontainers.image.description="Serveur temps réel du jeu Gribouille (Node.js + Socket.io)" \
      org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src

# Jamais root dans le conteneur
USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "src/index.js"]
