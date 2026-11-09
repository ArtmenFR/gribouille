# syntax=docker/dockerfile:1

# etape 1 : on installe seulement les dependances de prod
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# etape 2 : image finale, on reprend juste node_modules et le code
FROM node:20-alpine AS runtime

LABEL org.opencontainers.image.title="gribouille-server" \
      org.opencontainers.image.description="Serveur du jeu Gribouille (Node.js + Socket.io)" \
      org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src

# pas de root
USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "src/index.js"]
