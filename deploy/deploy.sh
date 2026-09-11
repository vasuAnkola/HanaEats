#!/usr/bin/env bash
# Deploy HANA Eats to this server on port 3016, managed by pm2.
# Run as root (or a user with write access to /var/www) from anywhere.
#
# Prereqs on this server before running:
#   1. Node.js (18+) and npm installed
#   2. pm2 installed globally: npm i -g pm2
#   3. ~/.ssh/config has the "github-vasu" host block (already set up per your message):
#        Host github-vasu
#            HostName github.com
#            User git
#            IdentityFile ~/.ssh/id_ed25519_vasu
#            IdentitiesOnly yes
#   4. That deploy key is added as a read (or read/write) key on the
#      vasuAnkola/app GitHub repo, or vasuAnkola's account has SSO/access to it.
#   5. A real .env.local for this app (DB creds, NEXTAUTH_SECRET, etc.) —
#      this script does NOT create one for you; see the ENV NOTE below.
set -euo pipefail

REPO="git@github-vasu:vasuAnkola/app.git"
APP_ROOT="/var/www/hanaeats"
APP_DIR="$APP_ROOT/app"
BRANCH="master"
PORT=3016

mkdir -p "$APP_ROOT"

if [ -d "$APP_DIR/.git" ]; then
  echo "Existing checkout found, pulling latest..."
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull origin "$BRANCH"
else
  echo "Cloning $REPO..."
  git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"

# --- ENV NOTE ---
# .env.local is gitignored and will NOT be in the clone. Create it here
# (once) with production values before the first start, e.g.:
#   DATABASE_URL=postgresql://work_user:...@159.69.2.97:5432/hanaeats
#   NEXTAUTH_SECRET=<generate a strong random secret, don't reuse the local one>
#   NEXTAUTH_URL=https://eatsapp.hanaplatform.com
if [ ! -f "$APP_DIR/.env.local" ]; then
  echo "WARNING: $APP_DIR/.env.local is missing. Create it with production DB creds"
  echo "and NEXTAUTH_URL=https://eatsapp.hanaplatform.com before starting the app."
fi

echo "Installing dependencies..."
npm ci

echo "Building..."
npm run build

echo "Starting/reloading with pm2..."
if pm2 describe hanaeats >/dev/null 2>&1; then
  pm2 reload "$APP_DIR/deploy/ecosystem.config.js"
else
  pm2 start "$APP_DIR/deploy/ecosystem.config.js"
  pm2 save
fi

echo "Done. App should be running on 127.0.0.1:$PORT (pm2 process 'hanaeats')."
echo "Next: install deploy/nginx-eatsapp.conf, then run deploy/ssl-setup.sh."
