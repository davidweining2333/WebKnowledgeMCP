/**
 * Cross-platform MCP launcher for Cherry Studio.
 *
 * Cherry Studio (and other MCP clients) launch stdio servers via a single
 * command + args.  This launcher resolves the project root, sets mandatory
 * environment variables, and then spawns the built server as a child process.
 *
 * We use child_process.spawn instead of a dynamic import() because:
 *   1. It avoids ESM resolution issues with pnpm's symlink structure.
 *   2. It gives the server a clean Node.js process, identical to `node dist/main.js`.
 *   3. It works reliably across all Node.js versions and Electron bundles.
 *
 * Usage in Cherry Studio MCP config:
 *   {
 *     "command": "node",
 *     "args": ["/absolute/path/to/this/file/launcher.mjs"]
 *   }
 */

import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';

// ── Resolve project root ────────────────────────────────────────────────
// integrations/cherry-studio/launcher.mjs  →  project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..', '..');

// ── Ensure data directory exists ────────────────────────────────────────
const dataDir = join(PROJECT_ROOT, 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// ── Build environment ───────────────────────────────────────────────────
const env = { ...process.env };
if (!env.DATABASE_URL) {
  // Use absolute path so the DB is always in the project's data/ folder
  // regardless of the cwd that Cherry Studio spawns us from.
  env.DATABASE_URL = `file:${join(PROJECT_ROOT, 'data', 'web-knowledge.db')}`;
}

// ── Launch server as child process ──────────────────────────────────────
// We use process.execPath (the same node binary that runs this launcher)
// so Cherry Studio's bundled Node.js version is used consistently.
const entryPath = join(PROJECT_ROOT, 'dist', 'main.js');
const child = spawn(process.execPath, [entryPath], {
  cwd: PROJECT_ROOT,
  env,
  stdio: 'inherit',  // pipe stdin/stdout/stderr straight through for MCP protocol
});

child.on('error', (err) => {
  console.error('Failed to start Web Knowledge MCP server:', err.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (code !== 0 && code !== null) {
    console.error(`Web Knowledge MCP server exited with code ${code}`);
  }
  process.exit(code ?? (signal ? 1 : 0));
});