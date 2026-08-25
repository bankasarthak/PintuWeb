#!/bin/bash
# HTTPS + nginx for the PintuWeb website (Next.js frontend + FastAPI backend
# reachable via the frontend's built-in /backend rewrite).
#
# Usage (on the target host, after DNS A record already points here):
#   cd "$REPO_DIR"
#   DOMAIN=jerkbox.net bash deploy/setup_https_web.sh
#
# Env vars (override instead of editing this file):
#   DOMAIN          (required)              — e.g. jerkbox.net
#   REPO_DIR        (default: /home/ec2-user/PintuWeb)
#   FRONTEND_PORT   (default: 3000)
#   ACME_EMAIL      (default: admin@krewbay.in)
#
# Prerequisites:
#   - DNS A record: $DOMAIN (and www.$DOMAIN) → this host's public IP
#   - Ports 80/443 open in security group
set -euo pipefail

DOMAIN="${DOMAIN:?Set DOMAIN, e.g. DOMAIN=jerkbox.net}"
REPO_DIR="${REPO_DIR:-/home/ec2-user/PintuWeb}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
ACME_EMAIL="${ACME_EMAIL:-admin@krewbay.in}"
NGINX_CONF_NAME="pintu-$(echo "$DOMAIN" | tr '.' '-').conf"

echo "=== Installing nginx and certbot ==="
sudo yum install -y nginx certbot 2>/dev/null || sudo apt-get install -y nginx certbot

echo "=== SSL certificate for $DOMAIN and www.$DOMAIN ==="
sudo mkdir -p /var/www/certbot
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  # Temporary HTTP-only vhost so ACME webroot challenge can succeed
  sudo tee "/etc/nginx/conf.d/$NGINX_CONF_NAME" > /dev/null << NGINX
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 "ok"; add_header Content-Type text/plain; }
}
NGINX
  sudo nginx -t && sudo systemctl reload nginx
  sudo certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" -d "www.$DOMAIN" \
    --non-interactive --agree-tos --email "$ACME_EMAIL"
else
  echo "Certificate already exists for $DOMAIN"
fi

echo "=== Generating nginx config for $DOMAIN (frontend port: $FRONTEND_PORT) ==="
sudo tee "/etc/nginx/conf.d/$NGINX_CONF_NAME" > /dev/null << NGINX
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 26M;

    # Next.js handles /backend/* itself via next.config.ts rewrites, so a
    # single location block covers the whole site (pages + API proxy).
    location / {
        proxy_pass http://127.0.0.1:$FRONTEND_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
NGINX
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo "=== Done ==="
echo "Website: https://$DOMAIN"
echo "In @BotFather run: /setdomain @<bot_username> $DOMAIN"
