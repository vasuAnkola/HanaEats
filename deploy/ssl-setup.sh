#!/usr/bin/env bash
# Obtain/renew a Let's Encrypt SSL cert for eatsapp.hanaplatform.com via certbot's
# nginx plugin. Run this AFTER nginx-eatsapp.conf is installed, enabled, and
# `nginx -t` passes, and AFTER the DNS A record for eatsapp.hanaplatform.com
# already points at 77.42.88.156 (propagation must be complete or the HTTP-01
# challenge will fail).
set -euo pipefail

DOMAIN="eatsapp.hanaplatform.com"
if [ -z "${CERTBOT_EMAIL:-}" ]; then
  echo "Set CERTBOT_EMAIL to the address certbot should use for renewal notices, e.g.:"
  echo "  CERTBOT_EMAIL=you@example.com bash ssl-setup.sh"
  exit 1
fi
EMAIL="$CERTBOT_EMAIL"

if ! command -v certbot >/dev/null 2>&1; then
  echo "certbot not found, installing..."
  apt-get update -y
  apt-get install -y certbot python3-certbot-nginx
fi

certbot --nginx \
  -d "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --redirect \
  -m "$EMAIL"

nginx -t && systemctl reload nginx

echo "Certificate installed for $DOMAIN. certbot's systemd timer/cron will handle renewal automatically."
echo "Verify auto-renewal with: certbot renew --dry-run"
