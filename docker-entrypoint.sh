#!/bin/sh
set -eu

umask 077

DATABASE_PATH="${DATABASE_PATH:-/data/gamevault.db}"
DATABASE_URL="${DATABASE_URL:-file:${DATABASE_PATH}}"
export DATABASE_PATH DATABASE_URL

mkdir -p "$(dirname "$DATABASE_PATH")"
chown -R nextjs:nodejs "$(dirname "$DATABASE_PATH")"

if [ ! -e "$DATABASE_PATH" ]; then
  install -o nextjs -g nodejs -m 0600 /dev/null "$DATABASE_PATH"
fi

gosu nextjs ./node_modules/.bin/prisma migrate deploy

exec gosu nextjs "$@"
