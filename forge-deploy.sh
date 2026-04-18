#!/bin/bash
# Laravel Forge deploy script for the React/Vite frontend.
# Paste this into Forge → Sites → anfrage-professionalclean.ch → App → Deploy Script.

set -e

cd /home/forge/anfrage-professionalclean.ch

# ── Node version (Forge ships with nvm) ──────────────────────────────────────
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
nvm use 20 || nvm install 20

# ── Install dependencies ──────────────────────────────────────────────────────
cd frontend
npm ci --prefer-offline

# ── Production build ──────────────────────────────────────────────────────────
npm run build

# The compiled files land in frontend/dist — point your Nginx root there.
echo "Build complete → frontend/dist"
