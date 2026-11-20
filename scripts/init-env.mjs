/*
 * Creates backend/.env and frontend/.env from their .env.example templates.
 * Existing files are never overwritten, so it is safe to re-run.
 */
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
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
    // Values still copied from the template: point the user at the right ones.
    const raw = readFileSync(target, 'utf8');
    if (raw.includes('your_password') || raw.includes('replace-with-a-long-random-secret')) {
      console.log('       -> isi DATABASE_URL dan JWT_SECRET di file ini.');
    } else if (raw.includes('your_email@gmail.com') || raw.includes('your_gmail_app_password')) {
      console.log('       -> MAIL_USER/MAIL_PASS boleh dibiarkan: e-mail akan dicetak di console backend.');
    }
    continue;
  }
  if (!existsSync(source)) {
    console.warn(`[warn] ${from} tidak ditemukan, dilewati.`);
    continue;
  }
  copyFileSync(source, target);
  console.log(`[new ] ${to} dibuat dari ${from}.`);
}

console.log('\nLangkah berikutnya: isi DATABASE_URL dan JWT_SECRET di backend/.env, lalu jalankan setup lagi.');
