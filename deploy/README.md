# Deploying HANA Eats to eatsapp.hanaplatform.com (port 3016)

Target server: `77.42.88.156`, alongside ~18 other projects, reverse-proxied via nginx.

## Order of operations (run as root on the server)

1. **DNS**: point an A record for `eatsapp.hanaplatform.com` at `77.42.88.156` first —
   certbot's HTTP-01 challenge needs it resolving before step 5 will work.

2. **Prereqs** (skip anything already installed for the other 18 projects):
   ```bash
   node -v   # need 18+
   npm i -g pm2
   which nginx || apt-get install -y nginx
   ```

3. **Clone + build + start**:
   ```bash
   mkdir -p /var/www/hanaeats
   cd /var/www
   # copy this deploy/ folder here first, or scp the whole repo once and
   # re-run deploy.sh afterwards for updates — see note below
   bash deploy.sh
   ```
   `deploy.sh` clones `git@github-vasu:vasuAnkola/app.git` (uses the
   `github-vasu` SSH host you already configured) into `/var/www/hanaeats/app`,
   runs `npm ci && npm run build`, and starts it under pm2 as process
   `hanaeats` on `127.0.0.1:3016`.

   **Before first start**, create `/var/www/hanaeats/app/.env.local` with
   production values (it's gitignored, so it's never in the clone):
   ```
   DATABASE_URL=<same production Postgres URL used locally — copy from your local .env.local, do not commit it>
   NEXTAUTH_SECRET=<generate a new strong secret — don't reuse the local dev one>
   NEXTAUTH_URL=https://eatsapp.hanaplatform.com
   ```
   Generate a secret with: `openssl rand -base64 32`

4. **nginx**:
   ```bash
   cp nginx-eatsapp.conf /etc/nginx/sites-available/eatsapp.hanaplatform.com
   ln -s /etc/nginx/sites-available/eatsapp.hanaplatform.com /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   ```

5. **SSL**:
   ```bash
   bash ssl-setup.sh
   ```
   This runs `certbot --nginx -d eatsapp.hanaplatform.com`, which obtains the
   cert and rewrites the nginx config in place to add the HTTPS server block
   and HTTP->HTTPS redirect. Renewal is automatic via certbot's own timer.

6. **Verify**: `curl -I https://eatsapp.hanaplatform.com` and `pm2 status hanaeats`.

## Redeploying after future pushes

```bash
cd /var/www/hanaeats/app && bash deploy/deploy.sh
```
Pulls latest `master`, reinstalls, rebuilds, and `pm2 reload`s (zero-downtime
reload since it's a single fork-mode process — brief connection drop only if
the build itself fails).

## Notes

- Port 3016 is only bound to `127.0.0.1` by pm2/Next — nginx is the only
  public entry point, consistent with a shared-server setup.
- pm2 process name `hanaeats` — use `pm2 logs hanaeats`, `pm2 restart hanaeats`
  to manage it alongside the other projects' processes.
- Run `pm2 startup` once (if not already done for this server) so pm2's
  process list survives a reboot; `pm2 save` (already called in deploy.sh)
  persists the process list itself.
