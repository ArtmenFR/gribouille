#!/bin/sh
# cree .env (mots de passe aleatoires) et traefik/users.htpasswd
# ne touche a rien si les fichiers existent deja
set -eu
cd "$(dirname "$0")/.."

command -v openssl >/dev/null 2>&1 || { echo "openssl est requis (apt install openssl)" >&2; exit 1; }

rand() { openssl rand -hex 16; }

if [ ! -f .env ]; then
  umask 077
  cat > .env <<EOF
# cree par scripts/init.sh, ne pas mettre dans git
HTTP_PORT=80
REDIS_PASSWORD=$(rand)
GRAFANA_ADMIN_PASSWORD=$(rand)
ADMIN_USER=admin
ADMIN_PASSWORD=$(rand)
BACKUP_INTERVAL=300
BACKUP_KEEP=12
EOF
  echo "→ .env créé avec des mots de passe aléatoires"
fi

if [ ! -f traefik/users.htpasswd ]; then
  # shellcheck disable=SC1091
  . ./.env
  printf '%s:%s\n' "${ADMIN_USER:-admin}" "$(openssl passwd -apr1 "$ADMIN_PASSWORD")" > traefik/users.htpasswd
  chmod 644 traefik/users.htpasswd   # traefik (non root) doit pouvoir le lire
  echo "→ traefik/users.htpasswd créé"
fi

. ./.env
echo
echo "Identifiants (également dans .env) :"
echo "  Prometheus / Alertmanager / Mail / Traefik : ${ADMIN_USER:-admin} / ${ADMIN_PASSWORD}"
echo "  Grafana                                    : admin / ${GRAFANA_ADMIN_PASSWORD}"
