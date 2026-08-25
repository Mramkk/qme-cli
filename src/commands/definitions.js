const crypto = require("crypto");
const os = require("os");

const SYSTEM_KEY = "91e57cece8c867f6909b3f23ae02bc86de64373905e8471057581d547bde1476";

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

function getCommandDefinition(commandName) {
  return commandDefinitions[commandName] || null;
}

function getCurrentSystemKey() {
  const identity = [os.hostname(), process.platform, process.arch].join(":");
  return crypto.createHash("sha256").update(identity).digest("hex");
}

function isAuthorizedSystem() {
  return Boolean(SYSTEM_KEY) && SYSTEM_KEY === getCurrentSystemKey();
}

function isCommandEnabled(commandName) {
  const definition = getCommandDefinition(commandName);
  return Boolean(definition && (isAuthorizedSystem() || definition.enabled !== false));
}

module.exports = {
  commandDefinitions,
  getCommandDefinition,
  isCommandEnabled,
};
