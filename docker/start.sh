#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until node -e "
const { Client } = require('pg');
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set'); process.exit(1); }
const client = new Client({ connectionString: url });
client
  .connect()
  .then(() => client.end())
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
"; do
  echo "PostgreSQL is unavailable - sleeping 2s"
  sleep 2
done
echo "PostgreSQL is ready"

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting Next.js..."
exec npm run start
