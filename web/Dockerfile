# syntax=docker/dockerfile:1
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="gribouille-web" \
      org.opencontainers.image.description="Front du jeu Gribouille (nginx)" \
      org.opencontainers.image.licenses="MIT"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY public /usr/share/nginx/html

# on force les droits sinon erreur 403 si la machine qui build a un umask strict
RUN find /usr/share/nginx/html -type d -exec chmod 755 {} + \
 && find /usr/share/nginx/html -type f -exec chmod 644 {} + \
 && chmod 644 /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
