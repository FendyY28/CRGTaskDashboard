/*
 * Creates the PostgreSQL database named in DATABASE_URL if it does not exist yet.
 *
 * `prisma migrate` cannot create a database it has to connect to, so a fresh
 * clone needs this one extra step. Safe to run repeatedly: when the database
 * already exists it exits successfully without touching any data.
 */
require('dotenv').config();

const { Client } = require('pg');

async function main() {
  const databaseUrl = (process.env.DATABASE_URL || '').trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL belum diisi di backend/.env');
  }

  const target = new URL(databaseUrl);
  const dbName = decodeURIComponent(target.pathname.replace(/^\//, ''));
  if (!dbName) {
    throw new Error('DATABASE_URL tidak memuat nama database');
  }

  // Connect to the maintenance database of the same server.
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rowCount > 0) {
      console.log(`Database "${dbName}" sudah ada.`);
      return;
    }
    // Identifiers cannot be parameterised; escape the quotes instead.
    await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    console.log(`Database "${dbName}" dibuat.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  // Not fatal: the database may already exist and the current user may simply
  // lack CREATEDB rights. `prisma migrate` will report anything that matters.
  console.warn(`[create-db] dilewati: ${err.message}`);
  process.exitCode = 0;
});
