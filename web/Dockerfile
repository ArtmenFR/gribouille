# syntax=docker/dockerfile:1
# Front statique + reverse proxy : nginx sert les fichiers et relaie le WebSocket vers le serveur de jeu.
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="gribouille-web" \
      org.opencontainers.image.description="Front et reverse proxy du jeu Gribouille" \
      org.opencontainers.image.licenses="MIT"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY public /usr/share/nginx/html

# Les droits des fichiers dépendent de la machine qui construit (umask) :
# on les fixe pour que le processus nginx puisse toujours les lire.
RUN find /usr/share/nginx/html -type d -exec chmod 755 {} + \
 && find /usr/share/nginx/html -type f -exec chmod 644 {} + \
 && chmod 644 /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
