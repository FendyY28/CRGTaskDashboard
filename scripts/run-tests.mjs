/*
 * Cross-platform test runner (Windows / macOS / Linux).
 *
 * Runs the backend (Jest) and frontend (Vitest) suites in sequence and stops at
 * the first failure.
 *
 * Why a script instead of `npm run test --prefix backend && ...`:
 * on PowerShell, `npm` is `npm.cmd`, and calling it through npm's shell wrapper
 * makes PowerShell treat Jest's normal "PASS ..." lines on stderr as a
 * NativeCommandError — the run turns red and exits with code 1 even when every
 * test passes. Spawning npm directly with stdio inherited keeps the output on
 * the right stream and makes the exit code reflect the test result only.
 *
 * Usage: npm run test
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Keep Jest/Vitest non-interactive so they print plain "PASS/FAIL" lines
// instead of repainting a live status line that mangles piped output.
const env = { ...process.env, CI: process.env.CI ?? "true" };

/*
 * Launch each runner through its JS entry point rather than the .cmd shim
 * npm would use: Node 20+ refuses to spawn a .cmd without a shell, and going
 * through a shell reintroduces the PowerShell stderr problem this script
 * exists to avoid.
 */
/*
 * `mergeStderr` is for Jest: it reports even passing suites on stderr, and
 * PowerShell renders anything on a native command's stderr as a red
 * NativeCommandError and fails the pipeline. Capturing stderr and re-emitting
 * it on stdout keeps a green run green. Vitest already uses stdout.
 */
const suites = [
  {
    name: "backend",
    cwd: join(root, "backend"),
    args: [join(root, "backend", "node_modules", "jest", "bin", "jest.js"), "--ci"],
    mergeStderr: true,
  },
  {
    name: "frontend",
    cwd: join(root, "frontend"),
    args: [join(root, "frontend", "node_modules", "vitest", "vitest.mjs"), "run"],
    mergeStderr: false,
  },
];

for (const suite of suites) {
  console.log(`\n=== ${suite.name} ===`);
  const result = spawnSync(process.execPath, suite.args, {
    cwd: suite.cwd,
    // "pipe" + re-emit below, so Jest's stderr lands on our stdout.
    stdio: suite.mergeStderr
      ? ["inherit", "inherit", "pipe"]
      : ["inherit", "inherit", "inherit"],
    env,
    shell: false,
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.stderr && result.stderr.length > 0) {
    process.stdout.write(result.stderr);
  }

  if (result.error) {
    console.error(
      `\n[ERROR] Gagal menjalankan test ${suite.name}: ${result.error.message}`,
    );
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(
      `\n[FAILED] Test ${suite.name} gagal (exit code ${result.status}).`,
    );
    process.exit(result.status ?? 1);
  }
}

console.log("\nSemua test lulus.");
