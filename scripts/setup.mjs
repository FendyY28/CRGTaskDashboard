/*
 * Cross-platform one-time setup (Windows / macOS / Linux).
 *
 *   1. Create backend/.env + frontend/.env from the templates (kept if present)
 *   2. Install backend + frontend dependencies
 *   3. Create the database, run Prisma migrations and seed the sample data
 *
 * Prerequisite: PostgreSQL reachable through DATABASE_URL in backend/.env
 * (Docker: `docker compose up -d postgres`).
 *
 * Usage: npm run setup
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';

function run(command, args, { cwd = root, allowFail = false } = {}) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false });
  if (result.status !== 0 && !allowFail) {
    console.error(`\n[ERROR] Perintah gagal: ${command} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
  return result.status ?? 1;
}

// 1. Environment files -------------------------------------------------------
run(process.execPath, [join(root, 'scripts', 'init-env.mjs')]);

const backendEnvPath = join(root, 'backend', '.env');
const envRaw = existsSync(backendEnvPath) ? readFileSync(backendEnvPath, 'utf8') : '';
const hasPlaceholders =
  envRaw.includes('your_password') || envRaw.includes('replace-with-a-long-random-secret');

if (hasPlaceholders) {
  console.warn(
    [
      '',
      '[!] backend/.env masih berisi nilai contoh.',
      '    Isi DATABASE_URL dan JWT_SECRET dengan nilai sebenarnya lalu jalankan lagi:',
      '      npm run setup',
      '    Atau langsung:  npm run db:setup --prefix backend',
      '',
    ].join('\n'),
  );
}

// 2. Dependencies ------------------------------------------------------------
run(npm, ['install', '--prefix', 'backend']);
run(npm, ['install', '--prefix', 'frontend']);

// 3. Database ----------------------------------------------------------------
// Skipped when the credentials are still placeholders, otherwise Prisma only
// prints a connection error.
if (hasPlaceholders) {
  console.log('\n[skip] Migrate/seed dilewati karena backend/.env belum diisi.');
  process.exit(0);
}

run(npm, ['run', 'setup', '--prefix', 'backend']);

console.log(
  [
    '',
    '============================================',
    '  Setup selesai.',
    '',
    '  Jalankan aplikasi : npm run dev',
    '  (Windows shortcut : run-local.bat)',
    '',
    '  Frontend : http://localhost:5173',
    '  Backend  : http://localhost:3000',
    '  Login    : admin@example.com / password123',
    '============================================',
    '',
  ].join('\n'),
);
