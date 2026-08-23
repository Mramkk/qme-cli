const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ENV_FILE_PATHS = [path.join(process.cwd(), ".env"), path.join(__dirname, "..", "..", ".env")];

/**
 * Command-level feature switches.
 *
 * Keep command behavior in the command definition so commands can be enabled
 * or disabled without changing their implementation.
 */
const commandDefinitions = {
  help: { enabled: true },
  alias: { enabled: false },
  git: { enabled: true },
  gsync: { enabled: true },
  config: { enabled: true },
  update: { enabled: false },
  proj: { enabled: false },
  open: { enabled: false },
  ip: { enabled: false },
  pem: { enabled: false },
  npm: { enabled: false },
  npx: { enabled: false },
  n: { enabled: false },
  timer: { enabled: false },
  pa: { enabled: false },
  mysql: { enabled: false, systemBound: true },
  flutter: { enabled: false },
  adb: { enabled: false },
  dokr: { enabled: false },
  run: { enabled: false },
  init: { enabled: false },
  win: { enabled: false },
  w: { enabled: false },
  wintask: { enabled: false },
  taskm: { enabled: false },
  wl: { enabled: false },
  ".": { enabled: false },
  recent: { enabled: false },
  path: { enabled: false },
  postman: { enabled: false },
  chrome: { enabled: false },
  gchat: { enabled: false },
  hub: { enabled: false },
  mail: { enabled: false },
  "sprint-review": { enabled: false },
  "sprint-plan": { enabled: false },
  sprint: { enabled: false },
  notepad: { enabled: false },
  note: { enabled: false },
  notes: { enabled: false },
  quit: { enabled: false },
  xstart: { enabled: false },
  xstop: { enabled: false },
  xswitch: { enabled: false },
  xini: { enabled: false },
  xproj: { enabled: false },
  xampp: { enabled: false },
};

function getEnvValue(name) {
  if (process.env[name]) {
    return String(process.env[name]).trim();
  }

  const envFilePath = ENV_FILE_PATHS.find((filePath) => fs.existsSync(filePath));
  if (!envFilePath) {
    return "";
  }

  const line = fs
    .readFileSync(envFilePath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${name}=`));
  if (!line) {
    return "";
  }

  return line
    .slice(line.indexOf("=") + 1)
    .trim()
    .replace(/^(["'])(.*)\1$/, "$2");
}

function getCurrentSystemKey() {
  const identity = [os.hostname(), process.platform, process.arch].join(":");
  return crypto.createHash("sha256").update(identity).digest("hex");
}

function isAuthorizedSystem() {
  const allowedSystemKey = getEnvValue("QME_SYSTEM_KEY");
  return Boolean(allowedSystemKey) && allowedSystemKey === getCurrentSystemKey();
}

function getCommandDefinition(commandName) {
  return commandDefinitions[commandName] || null;
}

function isCommandEnabled(commandName) {
  const definition = getCommandDefinition(commandName);
  if (!definition) {
    return true;
  }

  // The authorized machine can use every defined command, even if disabled.
  if (isAuthorizedSystem()) {
    return true;
  }

  // Every other machine can use only explicitly enabled commands.
  return definition.enabled !== false;
}

module.exports = {
  commandDefinitions,
  getCommandDefinition,
  isCommandEnabled,
};
