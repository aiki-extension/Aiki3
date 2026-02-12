const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const secretPath = path.join(projectRoot, "back4app.secret");
const outputPath = path.join(projectRoot, "src", "util", "back4appConfig.local.js");

const DEFAULTS = {
  SERVER_URL: "https://parseapi.back4app.com",
  ENVIRONMENT: "production",
};

function parseSecretFile(contents) {
  return contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .reduce((acc, line) => {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) return acc;
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (key) acc[key] = value;
      return acc;
    }, {});
}

function stringify(value) {
  return JSON.stringify(value ?? "");
}

function writeConfig(config) {
  const fileContents = `export const BACK4APP_CONFIG = {
  appId: ${stringify(config.appId)},
  restKey: ${stringify(config.restKey)},
  serverURL: ${stringify(config.serverURL || DEFAULTS.SERVER_URL)},
  environment: ${stringify(config.environment || DEFAULTS.ENVIRONMENT)},
};
`;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, fileContents);
}

function buildConfig() {
  if (!fs.existsSync(secretPath)) {
    console.warn("[back4app] back4app.secret not found. Writing placeholder config.");
    return {
      appId: "",
      restKey: "",
      serverURL: DEFAULTS.SERVER_URL,
      environment: DEFAULTS.ENVIRONMENT,
    };
  }

  const raw = fs.readFileSync(secretPath, "utf8");
  const parsed = parseSecretFile(raw);

  const config = {
    appId: parsed.APP_ID || "",
    restKey: parsed.REST_KEY || "",
    serverURL: parsed.SERVER_URL || DEFAULTS.SERVER_URL,
    environment: parsed.ENVIRONMENT || DEFAULTS.ENVIRONMENT,
  };

  if (!config.appId || !config.restKey) {
    console.warn("[back4app] APP_ID or REST_KEY missing in back4app.secret. Writing placeholder config.");
  } else {
    console.log("[back4app] Generated Back4App config from back4app.secret.");
  }

  return config;
}

writeConfig(buildConfig());
