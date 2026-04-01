#!/usr/bin/env node

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const REQUIRED_NODE_MAJOR = 20;
const REQUIRED_NPM_MAJOR = 10;
const SUPPORTED_TARGETS = new Set(["chrome", "firefox"]);
const SUPPORTED_FLAGS = new Set(["--skip-install"]);

const projectRoot = path.resolve(__dirname, "..");
const npmCacheDir = path.join(projectRoot, ".npm-cache");
const rawArgs = process.argv.slice(2);
const flags = rawArgs.filter((arg) => arg.startsWith("--"));
const positionalArgs = rawArgs.filter((arg) => !arg.startsWith("--"));
const target = (positionalArgs[0] || "chrome").toLowerCase();
const skipInstall = flags.includes("--skip-install");

function parseMajor(version) {
  const [major] = String(version).trim().split(".");
  return Number(major);
}

function fail(message) {
  console.error(`\n[build:addon] ${message}`);
  process.exit(1);
}

function run(command, args) {
  console.log(`\n[build:addon] > ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      NPM_CONFIG_CACHE: npmCacheDir,
      npm_config_cache: npmCacheDir,
    },
  });

  if (result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function validateEnvironment() {
  fs.mkdirSync(npmCacheDir, { recursive: true });

  const nodeMajor = parseMajor(process.versions.node);
  if (!Number.isInteger(nodeMajor) || nodeMajor < REQUIRED_NODE_MAJOR) {
    fail(
      `Node.js ${REQUIRED_NODE_MAJOR}+ is required (found ${process.versions.node}).`
    );
  }

  const npmVersionCheck = spawnSync("npm", ["--version"], {
    cwd: projectRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      NPM_CONFIG_CACHE: npmCacheDir,
      npm_config_cache: npmCacheDir,
    },
  });

  if (npmVersionCheck.status !== 0) {
    fail("npm is required but was not found in PATH.");
  }

  const npmVersion = npmVersionCheck.stdout.trim();
  const npmMajor = parseMajor(npmVersion);
  if (!Number.isInteger(npmMajor) || npmMajor < REQUIRED_NPM_MAJOR) {
    fail(`npm ${REQUIRED_NPM_MAJOR}+ is required (found ${npmVersion}).`);
  }
}

if (!SUPPORTED_TARGETS.has(target)) {
  fail(
    `Unsupported target "${target}". Use one of: ${Array.from(
      SUPPORTED_TARGETS
    ).join(", ")}.`
  );
}

for (const flag of flags) {
  if (!SUPPORTED_FLAGS.has(flag)) {
    fail(`Unsupported flag "${flag}". Supported flags: --skip-install.`);
  }
}

console.log(`[build:addon] Target browser: ${target}`);
validateEnvironment();

const manifestScript =
  target === "firefox" ? "scripts/buildFirefox.js" : "scripts/buildChrome.js";

if (skipInstall) {
  console.log(
    "\n[build:addon] Skipping dependency installation (--skip-install)."
  );
} else {
  run("npm", ["ci"]);
}
run("node", ["scripts/generateBack4AppConfig.js"]);
run("node", [manifestScript]);
run("npm", ["exec", "--", "rollup", "-c"]);

console.log("\n[build:addon] Build completed successfully.");
