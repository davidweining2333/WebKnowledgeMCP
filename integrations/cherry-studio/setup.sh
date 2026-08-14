#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
# Cherry Studio integration — setup script (Linux / macOS)
# Run this BEFORE configuring the MCP server in Cherry Studio.
# ──────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "==> Project root: $PROJECT_ROOT"

# 1. Install Node.js dependencies
echo "==> Installing dependencies..."
cd "$PROJECT_ROOT"
pnpm install

# 2. Generate Prisma client
echo "==> Generating Prisma client..."
pnpm prisma:generate

# 3. Push database schema (creates SQLite DB if needed)
echo "==> Setting up database..."
pnpm prisma:push

# 4. Build the project
echo "==> Building project..."
pnpm build

# 5. Install Playwright browsers (Chromium)
#    If the default CDN is blocked (common in China), set the mirror:
#    export PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/
echo "==> Installing Playwright browser (Chromium)..."
if [ -z "${PLAYWRIGHT_DOWNLOAD_HOST:-}" ]; then
  echo "    (using default CDN; if download fails, re-run with --mirror)"
fi
npx playwright install chromium || {
  echo ""
  echo "[!] Playwright download failed."
  echo "    Try the China mirror:"
  echo "      export PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/"
  echo "      npx playwright install chromium"
  echo "    Or re-run: ./setup.sh --mirror"
  exit 1
}

# On Linux, also install system dependencies if needed
if [[ "$(uname -s)" == "Linux" ]]; then
  echo "==> Installing Playwright system dependencies..."
  npx playwright install-deps chromium 2>/dev/null || echo "    (skip — may need sudo)"
fi

echo ""
echo "============================================="
echo " Setup complete!"
echo " LAUNCHER PATH: $PROJECT_ROOT/integrations/cherry-studio/launcher.mjs"
echo ""
echo " Copy this path into your Cherry Studio MCP config."
echo "============================================="