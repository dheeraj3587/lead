# Deployment Guide

This guide explains how to deploy the backend (Express API) and frontend (Vite + React) to common platforms, plus environment variables, health checks, and troubleshooting.

## Prereqs
- Node.js 18+ and npm
- Git repository with clean history
- MongoDB connection string (for production)
- JWT secret and cookie settings

## Environment Variables

Backend (`backend/.env` or platform config):
- NODE_ENV=production
- PORT=8080
- MONGO_URI=mongodb+srv://user:pass@cluster/db
- JWT_SECRET=your-strong-secret (32+ chars)
- FRONTEND_URL=https://your-frontend.app
- ADDITIONAL_ORIGINS=https://staging-frontend.app,https://preview-frontend.app (optional)
- JWT_EXPIRE=7d (optional)
- CROSS_SITE_COOKIES=true (optional; enables cross-site cookie behavior where used)

Frontend (`frontend/.env.production`):
- VITE_API_URL=https://your-backend.app
- VITE_APP_NAME=Erino Lead Manager

## Validate locally
- Backend: `npm run start` from `backend`, then GET `/api/health/detailed`
- Frontend: `npm run build && npm run preview` from `frontend`

## Deploy Backend

Use the helper script from project root:
- Railway: `./scripts/deploy-backend.sh railway`
- Render: `./scripts/deploy-backend.sh render` (manual config in dashboard)
- Heroku: `./scripts/deploy-backend.sh heroku`
- Fly.io: `./scripts/deploy-backend.sh fly`

Notes:
- Ensure FRONTEND_URL is set and ADDITIONAL_ORIGINS includes any extra domains
- In production, the server trusts proxy automatically for secure cookies/IPs

## Deploy Frontend

From project root:
- Vercel: `./scripts/deploy-frontend.sh vercel`
- Netlify: `./scripts/deploy-frontend.sh netlify`
- Surge: `./scripts/deploy-frontend.sh surge`
- GitHub Pages: `./scripts/deploy-frontend.sh gh-pages`
- Static build: `./scripts/deploy-frontend.sh static`

SPA fallback:
- Netlify: add `public/_redirects` with `/* /index.html 200`
- Vercel: add `vercel.json` rewrites to `index.html`

## CI/CD tips
- Cache `~/.npm` and `node_modules` between builds
- Run "build" and "test" on PRs
- Use production env files and secrets in CI provider
 - Tests: backend uses Jest with `--passWithNoTests` and a minimal smoke test so CI stays green until real tests are added
 - Lint: `npm run lint` runs ESLint with a basic recommended config in the backend

## Health checks
- `/api/health` (fast ping)
- `/api/health/detailed` (db checks + version)

## Routes
- API routes are served under `/api/*` only. The previous non-API alias `/leads` has been removed to avoid ambiguity.

## Security checklist
- JWT_SECRET is long and random
- HTTPS enforced at platform level
- CORS restricted via FRONTEND_URL and ADDITIONAL_ORIGINS
- Security headers enabled (already wired)
- Cookies: Secure + SameSite appropriately

## Troubleshooting
- CORS errors: verify ALLOWED_ORIGINS and VITE_API_URL
- 401/403: check domain/secure cookie settings and TRUST_PROXY
- Date off-by-one: confirm client timezone vs. UTC normalization
- Build fails: ensure Node 18+ and clean install `npm ci`
 - bcrypt native builds: We use `bcryptjs` (pure JS) to avoid native compilation issues; if switching to native `bcrypt`, ensure build tools are available on CI/containers and pin a stable version.
