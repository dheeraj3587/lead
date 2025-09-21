#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', ...opts });
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.error(`Command failed: ${cmd}`);
    console.error(msg);
    // Non-zero exit ensures CI marks the job as failed
    const exitCode = (err && typeof err.status === 'number')
      ? (err.status || 1)
      : (err && typeof err.code === 'number')
        ? (err.code || 1)
        : 1;
    process.exit(exitCode);
  }
}

function ensureCwd() {
  // If run from frontend/scripts, the package.json should be one level up
  const pkg = resolve(process.cwd(), 'package.json');
  if (existsSync(pkg)) return;
  const upOne = resolve(process.cwd(), '..', 'package.json');
  if (existsSync(upOne)) {
    process.chdir(resolve(process.cwd(), '..'));
    return;
  }
  console.error('Could not locate frontend package.json. Run from the frontend package.');
  process.exit(1);
}

function build() {
  const cwd = process.cwd();
  const isPnpm = existsSync(resolve(cwd, 'pnpm-lock.yaml'));
  const isYarn = existsSync(resolve(cwd, 'yarn.lock'));
  if (isPnpm) {
    run('pnpm install');
    run('pnpm run build');
    return;
  }
  if (isYarn) {
    // Prefer frozen install if lockfile matches; fall back to standard install
    run('yarn install --frozen-lockfile || yarn install');
    run('yarn build');
    return;
  }
  // Default to npm
  run('npm ci || npm install');
  run('npm run build');
}

function requireFile(path) {
  if (!existsSync(path)) {
    console.error(`Required file missing: ${path}`);
    process.exit(1);
  }
}

function main() {
  const platform = process.argv[2] || 'vercel';
  ensureCwd();

  // Basic sanity checks
  requireFile(resolve(process.cwd(), 'vite.config.js'));
  requireFile(resolve(process.cwd(), 'src', 'main.jsx'));

  console.log(`Deploying frontend to ${platform}...`);

  if (platform === 'vercel') {
    build();
    run('which vercel || npm i -g vercel');
    run('vercel deploy --prebuilt --prod');
    return;
  }
  if (platform === 'netlify') {
    build();
    run('which netlify || npm i -g netlify-cli');
    run('netlify deploy --dir=dist --prod');
    return;
  }
  if (platform === 'surge') {
    build();
    run('which surge || npm i -g surge');
    run('surge ./dist');
    return;
  }
  if (platform === 'gh-pages') {
    build();
    run('npx gh-pages -d dist');
    return;
  }
  if (platform === 'static') {
    build();
    console.log('Static build ready at frontend/dist');
    return;
  }
  console.error(`Unknown platform: ${platform}`);
  process.exit(1);
}

main();
