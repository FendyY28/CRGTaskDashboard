/*
 * Lightweight database readiness probe used by run-local.bat / setup-local.bat.
 *
 * Succeeds (exit code 0) when the app schemas exist and the database answers a
 * real query; fails (exit code 1) when the database is unreachable or has not
 * been migrated yet. `npm run db:check` is the entry point.
 */
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  if (!(process.env.DATABASE_URL || '').trim()) {
    throw new Error('DATABASE_URL belum diisi di backend/.env');
  }

  // Real query on an app table: proves both connectivity and that migrations ran.
  await prisma.$queryRaw`SELECT 1`;
  await prisma.user.count();
}

async function run() {
  try {
    await main();
  } catch (err) {
    console.error(`[db:check] ${err.code || err.message}`);
    // Do not throw here: throwing before disconnect would leak the pool.
    return 1;
  } finally {
    await prisma.$disconnect();
  }
  return 0;
}

run().then((code) => {
  process.exitCode = code;
});
