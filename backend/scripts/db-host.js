/*
 * Prints the database host used by backend/.env so the batch scripts can decide
 * whether a localhost port check makes sense. Prints nothing (exit code 1) when
 * DATABASE_URL is missing or unparsable.
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const url = (process.env.DATABASE_URL || '').trim();
if (!url) process.exit(1);

try {
  process.stdout.write(new URL(url).hostname);
} catch {
  process.exit(1);
}
