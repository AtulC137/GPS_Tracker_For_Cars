#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

if [ "${RUN_SEED}" = "true" ]; then
  echo "Seeding database..."
  npx prisma db seed
fi

echo "Starting backend..."
exec node dist/index.js
