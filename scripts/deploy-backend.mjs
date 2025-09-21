#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function run(cmd, args = [], opts = {}, fatal = true) {
  console.log(`$ ${[cmd, ...args].join(" ")}`);
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: false, ...opts });
  const signal = res && res.signal ? res.signal : null;
  const code = typeof res.status === "number" ? res.status : 1;
  if (code !== 0 || signal) {
    if (signal) {
      console.error(
        `Command terminated by signal ${signal}: ${cmd} ${args.join(" ")}`,
      );
    } else {
      console.error(
        `Command failed with exit code ${code}: ${cmd} ${args.join(" ")}`,
      );
    }
    if (res.error && res.error.message) console.error(res.error.message);
    if (fatal) process.exit(code || 1);
  }
  return code;
}

function ensureCwd() {
  const envBackend = process.env.BACKEND_DIR;
  if (envBackend && envBackend.trim().length > 0) {
    const configuredDir = resolve(process.cwd(), envBackend);
    if (existsSync(resolve(configuredDir, "server.js"))) {
      process.chdir(configuredDir);
      return;
    }
    console.error(
      `BACKEND_DIR='${envBackend}' provided, but could not find 'server.js' in: ${configuredDir}`,
    );
    process.exit(1);
  }
  const backendDir = resolve(process.cwd(), "backend");
  if (existsSync(resolve(backendDir, "server.js"))) {
    process.chdir(backendDir);
    return;
  }
  if (existsSync(resolve(process.cwd(), "server.js"))) {
    return; // already in backend
  }
  const parentBackend = resolve(process.cwd(), "../backend");
  if (existsSync(resolve(parentBackend, "server.js"))) {
    process.chdir(parentBackend);
    return;
  }
  console.error(
    "Could not locate backend directory. Run from repo root or backend folder.",
  );
  process.exit(1);
}

function hasCommand(cmd) {
  const res = spawnSync(cmd, ["--version"], { stdio: "ignore" });
  return res && res.status === 0;
}

function ensureCli(name, npmPkg = null) {
  if (hasCommand(name)) return true;
  if (npmPkg) {
    console.log(
      `${name} CLI not found. Installing globally via npm: ${npmPkg}`,
    );
    const code = run("npm", ["i", "-g", npmPkg], {}, false);
    if (code === 0) return true;
    console.error(`Failed to install ${name} CLI. Please install it manually.`);
    return false;
  }
  console.error(
    `${name} CLI not found. Please install it and ensure it is on your PATH.`,
  );
  return false;
}

function main() {
  const platform = process.argv[2] || "railway";
  ensureCwd();
  console.log(`Deploying backend to ${platform}...`);

  // Install dependencies based on detected package manager/lockfile
  const cwd = process.cwd();
  const hasNpmLock = existsSync(resolve(cwd, "package-lock.json"));
  const hasYarnLock = existsSync(resolve(cwd, "yarn.lock"));
  const hasPnpmLock = existsSync(resolve(cwd, "pnpm-lock.yaml"));
  if (hasNpmLock) {
    run("npm", ["ci", "--omit=dev"]);
  } else if (hasYarnLock) {
    run("yarn", ["install", "--frozen-lockfile"]);
  } else if (hasPnpmLock) {
    run("pnpm", ["install", "--frozen-lockfile"]);
  } else {
    run("npm", ["install", "--production"]);
  }

  // Run tests if defined and not skipped
  let hasTests = false;
  try {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf-8"),
    );
    hasTests = !!(pkg && pkg.scripts && pkg.scripts.test);
  } catch {
    hasTests = false;
  }
  if (process.env.SKIP_TESTS === "1") {
    console.log("SKIP_TESTS=1 set. Skipping tests.");
  } else if (hasTests) {
    const code = run("npm", ["test"], {}, false);
    if (code !== 0) {
      console.error("Tests failed. Aborting deployment.");
      process.exit(code || 1);
    }
  } else {
    console.log("No test script found in package.json. Skipping tests.");
  }

  if (platform === "railway") {
    if (!ensureCli("railway", "@railway/cli")) process.exit(1);
    const loggedIn = run("railway", ["whoami"], {}, false) === 0;
    if (!loggedIn) {
      run("railway", ["login"]);
    }
    run("railway", ["up"]);
    return;
  }
  if (platform === "render") {
    console.log(
      "Configure via Render dashboard (build/start commands, env vars).",
    );
    return;
  }
  if (platform === "heroku") {
    if (!ensureCli("heroku")) process.exit(1);
    const loggedIn = run("heroku", ["whoami"], {}, false) === 0;
    if (!loggedIn) run("heroku", ["login"]);
    console.log(
      "Use Heroku Git or GitHub integration to deploy the backend subdir.",
    );
    return;
  }
  if (platform === "fly") {
    if (!ensureCli("flyctl")) process.exit(1);
    const loggedIn = run("flyctl", ["auth", "whoami"], {}, false) === 0;
    if (!loggedIn) run("flyctl", ["auth", "login"]);
    if (!existsSync("fly.toml")) {
      run("flyctl", ["launch", "--no-deploy"]);
    }
    run("flyctl", ["deploy"]);
    return;
  }
  console.error(`Unknown platform: ${platform}`);
  process.exit(1);
}

main();
