#!/usr/bin/env bash

# Frontend Deployment Script
# Usage: ./scripts/deploy-frontend.sh [platform]
# Platforms: vercel, netlify, surge, gh-pages, static

set -euo pipefail

on_err() {
  local exit_code=$?
  echo "❌ Error on line ${BASH_LINENO[0]} while executing: ${BASH_COMMAND} (exit: $exit_code)" >&2
}
trap on_err ERR

PLATFORM=${1:-vercel}
# Allow overriding the frontend directory via env or arg 2
FRONTEND_DIR=${FRONTEND_DIR:-${2:-frontend}}

# Defaults; can be overridden by env
BUILD_CMD=${BUILD_CMD:-build}
BUILD_DIR=${BUILD_DIR:-dist}

detect_package_manager() {
  if [ -f "pnpm-lock.yaml" ]; then echo "pnpm"; return; fi
  if [ -f "yarn.lock" ]; then echo "yarn"; return; fi
  if [ -f "package-lock.json" ]; then echo "npm"; return; fi
  echo "npm"
}

ensure_pm() {
  local pm=$1
  if ! command -v "$pm" >/dev/null 2>&1; then
    echo "❌ Package manager '$pm' is not installed or not in PATH." >&2
    exit 1
  fi
}

ensure_cli() {
  local cmd=$1
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "❌ Required CLI '$cmd' is not installed or not in PATH." >&2
    exit 1
  fi
}

build_frontend() {
  local pm
  pm=$(detect_package_manager)
  ensure_pm "$pm"

  echo "📦 Installing dependencies with $pm..."
  case "$pm" in
    pnpm)
      pnpm install ;;
    yarn)
      yarn install --frozen-lockfile || yarn install ;;
    npm)
      if [ -f "package-lock.json" ]; then npm ci || npm install; else npm install; fi ;;
  esac

  # Verify build script exists before attempting to run (use Node to avoid jq dependency)
  if ! node -e "const s=require('./package.json').scripts||{}; if(!Object.prototype.hasOwnProperty.call(s,'$BUILD_CMD')) process.exit(1);"; then
    echo "⚠️  No '$BUILD_CMD' script found in package.json. Skipping build step."
    return
  fi

  echo "🏗️  Building production bundle with $pm run $BUILD_CMD..."
  case "$pm" in
    pnpm) pnpm run "$BUILD_CMD" ;;
    yarn) yarn "$BUILD_CMD" ;;
    npm) npm run "$BUILD_CMD" ;;
  esac
}

echo "🚀 Deploying frontend to $PLATFORM..."

# Resolve FRONTEND_DIR relative to repo root (script dir one level up)
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ABS_FRONTEND_DIR="$(cd "$REPO_ROOT" && cd "$FRONTEND_DIR" 2>/dev/null && pwd || true)"

if [ -z "$ABS_FRONTEND_DIR" ] || [ ! -f "$ABS_FRONTEND_DIR/package.json" ]; then
  echo "❌ Error: FRONTEND_DIR '$FRONTEND_DIR' is invalid. Make sure it contains a package.json." >&2
  exit 1
fi
echo "📁 Using frontend directory: $ABS_FRONTEND_DIR"
cd "$ABS_FRONTEND_DIR"

# Ensure package.json is readable
node -e "require('./package.json')" >/dev/null 2>&1 || { echo "❌ Error: package.json is not valid JSON or cannot be read." >&2; exit 1; }

case "$PLATFORM" in
  vercel)
    ensure_cli vercel
    echo "▲ Deploying to Vercel..."
    # Build using Vercel's local build to produce .vercel/output
    vercel build
    if [ ! -d ".vercel/output" ] || [ -z "$(ls -A ".vercel/output" 2>/dev/null)" ]; then
      echo "❌ Vercel build output '.vercel/output' is missing or empty. Aborting." >&2
      exit 1
    fi
    vercel deploy --prebuilt --prod
    echo "✅ Deployed to Vercel successfully!"
    ;;
  netlify)
    ensure_cli netlify
    echo "🔼 Deploying to Netlify..."
    if ! command -v netlify >/dev/null 2>&1; then
      echo "❌ Netlify CLI not found. Install: npm i -g netlify-cli"
      exit 1
    fi
    build_frontend
    if [ ! -d "$BUILD_DIR" ] || [ -z "$(ls -A "$BUILD_DIR" 2>/dev/null)" ]; then
      echo "❌ Build output directory '$BUILD_DIR' is missing or empty. Aborting." >&2
      exit 1
    fi
    netlify deploy --dir="$BUILD_DIR" --prod
    echo "✅ Deployed to Netlify successfully!"
    ;;
  surge)
    ensure_cli surge
    echo "🌊 Deploying to Surge.sh..."
    if ! command -v surge >/dev/null 2>&1; then
      echo "❌ Surge CLI not found. Install: npm i -g surge"
      exit 1
    fi
    build_frontend
    if [ ! -d "$BUILD_DIR" ] || [ -z "$(ls -A "$BUILD_DIR" 2>/dev/null)" ]; then
      echo "❌ Build output directory '$BUILD_DIR' is missing or empty. Aborting." >&2
      exit 1
    fi
    surge "./$BUILD_DIR"
    echo "✅ Deployed to Surge successfully!"
    ;;
  gh-pages)
    ensure_cli npx
    echo "🧭 Deploying to GitHub Pages..."
    build_frontend
    if [ ! -d "$BUILD_DIR" ] || [ -z "$(ls -A "$BUILD_DIR" 2>/dev/null)" ]; then
      echo "❌ Build output directory '$BUILD_DIR' is missing or empty. Aborting." >&2
      exit 1
    fi
    npx gh-pages -d "$BUILD_DIR"
    echo "✅ Deployed to GitHub Pages successfully!"
    ;;
  static)
    build_frontend
    if [ ! -d "$BUILD_DIR" ] || [ -z "$(ls -A "$BUILD_DIR" 2>/dev/null)" ]; then
      echo "❌ Build output directory '$BUILD_DIR' is missing or empty. Aborting." >&2
      exit 1
    fi
    echo "📁 Static build ready at $ABS_FRONTEND_DIR/$BUILD_DIR"
    ;;
  *)
    echo "❌ Unknown platform: $PLATFORM"
    echo "Supported: vercel, netlify, surge, gh-pages, static"
    exit 1
    ;;
 esac

 echo "🎉 Frontend deployment completed!"
 echo "📋 Post-deploy checklist:"
 echo "   1) Set VITE_API_URL to your backend"
 echo "   2) Verify 200 on / (index.html) and network requests"
 echo "   3) Configure SPA fallback (Netlify _redirects or Vercel rewrites)"
