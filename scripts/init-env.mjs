/*
 * Creates backend/.env and frontend/.env from their .env.example templates.
 * Existing files are never overwritten, so it is safe to re-run.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const targets = [
  ['backend/.env.example', 'backend/.env'],
  ['frontend/.env.example', 'frontend/.env'],
];

for (const [from, to] of targets) {
  const source = join(root, from);
  const target = join(root, to);

  if (existsSync(target)) {
    console.log(`[skip] ${to} sudah ada.`);
    continue;
  }
  if (!existsSync(source)) {
    console.warn(`[warn] ${from} tidak ditemukan, dilewati.`);
    continue;
  }
  copyFileSync(source, target);
  console.log(`[new ] ${to} dibuat dari ${from}.`);
}

console.log('\nJangan lupa isi DATABASE_URL dan JWT_SECRET di backend/.env.');
