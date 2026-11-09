#!/bin/sh
# Prépare la configuration locale (idempotent : ne touche pas à ce qui existe déjà).
#   .env                    mots de passe aléatoires (ignoré par Git)
#   traefik/users.htpasswd  accès protégé aux interfaces d'administration (ignoré par Git)
set -eu
cd "$(dirname "$0")/.."

command -v openssl >/dev/null 2>&1 || { echo "openssl est requis (apt install openssl)" >&2; exit 1; }

rand() { openssl rand -hex 16; }

if [ ! -f .env ]; then
  umask 077
  cat > .env <<EOF
# Généré par scripts/init.sh : ne pas committer
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
  chmod 644 traefik/users.htpasswd   # simple hash ; Traefik tourne en non-root et doit pouvoir le lire
  echo "→ traefik/users.htpasswd créé"
fi

. ./.env
echo
echo "Identifiants (également dans .env) :"
echo "  Prometheus / Alertmanager / Mail / Traefik : ${ADMIN_USER:-admin} / ${ADMIN_PASSWORD}"
echo "  Grafana                                    : admin / ${GRAFANA_ADMIN_PASSWORD}"
