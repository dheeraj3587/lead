#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  try {
    execSync(cmd, { stdio: "inherit", ...opts });
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.error(`Command failed: ${cmd}`);
    console.error(msg);
    const exitCode =
      err && typeof err.status === "number"
        ? err.status || 1
        : err && typeof err.code === "number"
        ? err.code || 1
        : 1;
    process.exit(exitCode);
  }
}

function ensureCwd() {
  const frontendDir = resolve(process.cwd(), "frontend");
  if (existsSync(resolve(frontendDir, "package.json"))) {
    process.chdir(frontendDir);
    return;
  }
  if (
    existsSync(resolve(process.cwd(), "package.json")) &&
    existsSync(resolve(process.cwd(), "vite.config.js"))
  ) {
    return; // already in frontend
  }
  const parentFrontend = resolve(process.cwd(), "../frontend");
  if (existsSync(resolve(parentFrontend, "package.json"))) {
    process.chdir(parentFrontend);
    return;
  }
  console.error(
    "Could not locate frontend directory. Run from repo root or frontend folder.",
  );
  process.exit(1);
}

function build() {
  // Deterministic install: try npm ci first, fall back to npm install explicitly
  console.log("Installing dependencies (npm ci)...");
  try {
    execSync("npm ci", { stdio: "inherit" });
  } catch (e) {
    console.warn("npm ci failed, falling back to npm install");
    try {
      execSync("npm install", { stdio: "inherit" });
    } catch (err) {
      console.error("npm install failed. Aborting.");
      const code =
        err && typeof err.status === "number"
          ? err.status || 1
          : err && typeof err.code === "number"
          ? err.code || 1
          : 1;
      process.exit(code);
    }
  }
  run("npm run build");
}

function main() {
  const platform = process.argv[2]
    ? String(process.argv[2]).toLowerCase()
    : "vercel";
  ensureCwd();
  console.log(`Deploying frontend to ${platform}...`);

  if (platform === "vercel") {
    build();
    run("which vercel || npm i -g vercel");
    run("vercel deploy --prebuilt --prod");
    return;
  }
  if (platform === "netlify") {
    build();
    run("which netlify || npm i -g netlify-cli");
    run("netlify deploy --dir=dist --prod");
    return;
  }
  if (platform === "surge") {
    build();
    run("which surge || npm i -g surge");
    run("surge ./dist");
    return;
  }
  if (platform === "gh-pages") {
    build();
    run("npx gh-pages -d dist");
    return;
  }
  if (platform === "static") {
    build();
    console.log("Static build ready at frontend/dist");
    return;
  }
  console.error(`Unknown platform: ${platform}`);
  process.exit(1);
}

main();
