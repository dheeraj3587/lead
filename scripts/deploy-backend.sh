#!/usr/bin/env bash

# Backend Deployment Script
# Usage: ./scripts/deploy-backend.sh [platform]
# Platforms: railway, render, heroku, fly

set -euo pipefail

PLATFORM=${1:-railway}
BACKEND_DIR="backend"

echo "🚀 Deploying backend to $PLATFORM..."

# Locate backend directory (supports running from root or backend folder)
if [ -d "$BACKEND_DIR" ] && [ -f "$BACKEND_DIR/server.js" ]; then
  cd "$BACKEND_DIR"
elif [ -f "server.js" ]; then
  echo "📁 Running from backend directory"
else
  if [ -d "../$BACKEND_DIR" ] && [ -f "../$BACKEND_DIR/server.js" ]; then
    cd "../$BACKEND_DIR"
  else
    echo "❌ Error: Could not locate backend directory. Run from repo root or backend folder."
    exit 1
  fi
fi

echo "📦 Installing dependencies..."
npm ci --omit=dev || npm install --production

if npm run -s test >/dev/null 2>&1; then
  echo "🧪 Running tests..."
  npm test
fi

case "$PLATFORM" in
  railway)
    echo "🚂 Deploying to Railway..."
    if ! command -v railway >/dev/null 2>&1; then
      echo "❌ Railway CLI not found. Install: npm install -g @railway/cli"
      exit 1
    fi
    if ! railway whoami >/dev/null 2>&1; then
      echo "🔐 Please login: railway login"
      exit 1
    fi
    railway up
    echo "✅ Deployed to Railway successfully!"
    ;;
  render)
    echo "🎨 Deploying to Render..."
    echo "ℹ️  Configure via Render dashboard (build/start cmds, env vars)."
    ;;
  heroku)
    echo "🟣 Deploying to Heroku..."
    if ! command -v heroku >/dev/null 2>&1; then
      echo "❌ Heroku CLI not found: https://devcenter.heroku.com/articles/heroku-cli"
      exit 1
    fi
    if ! heroku whoami >/dev/null 2>&1; then
      echo "🔐 Please login: heroku login"
      exit 1
    fi
    APP_NAME="lead-management-backend-$(date +%s)"
    read -rp "Enter Heroku app name (default: $APP_NAME): " USER_APP
    APP_NAME=${USER_APP:-$APP_NAME}
    heroku apps:info "$APP_NAME" >/dev/null 2>&1 || heroku create "$APP_NAME"
    heroku addons:create mongolab:sandbox -a "$APP_NAME" || true
    heroku config:set NODE_ENV=production -a "$APP_NAME"
    heroku config:set JWT_SECRET="$(openssl rand -base64 32)" -a "$APP_NAME"
    git subtree push --prefix=backend heroku main || git push heroku "$(git subtree split --prefix=backend main)":main --force
    echo "✅ Deployed to Heroku successfully!"
    echo "🔗 App URL: https://$APP_NAME.herokuapp.com"
    ;;
  fly)
    echo "🪰 Deploying to Fly.io..."
    if ! command -v flyctl >/dev/null 2>&1; then
      echo "❌ Fly CLI not found: https://fly.io/docs/getting-started/installing-flyctl/"
      exit 1
    fi
    if ! flyctl auth whoami >/dev/null 2>&1; then
      echo "🔐 Please login: flyctl auth login"
      exit 1
    fi
    [ -f fly.toml ] || flyctl launch --no-deploy
    flyctl deploy
    echo "✅ Deployed to Fly.io successfully!"
    ;;
  *)
    echo "❌ Unknown platform: $PLATFORM"
    echo "Supported: railway, render, heroku, fly"
    exit 1
    ;;
 esac

 echo "🎉 Backend deployment completed!"
 echo "📋 Post-deploy checklist:"
 echo "   1) Set env vars on platform"
 echo "   2) Update FRONTEND_URL"
 echo "   3) Check /api/health"
 echo "   4) Update frontend VITE_API_URL"
