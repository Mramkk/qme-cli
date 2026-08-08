const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const { runSync } = require("../src/process");
const { isExecutableAvailable } = require("../src/services/validation");
const { getPhpVersion } = require("../src/services/php");
const { configureOutput } = require("../src/output");
const { loadPluginCommands } = require("../src/plugins");
const {
  getAvailableXamppVersions,
  getXamppSwitchVersionCandidate,
} = require("../src/services/xampp");

test("process runner executes Node without shell concatenation", () => {
  const result = runSync(process.execPath, ["-e", "process.stdout.write('ok')"]);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "ok");
});

test("validation detects the current Node executable", () => {
  assert.equal(isExecutableAvailable(process.execPath), true);
});

test("PHP service returns an empty version when PHP is unavailable", () => {
  assert.equal(typeof getPhpVersion(process.cwd()), "string");
});

test("output configuration removes global output flags", () => {
  const originalLog = console.log;
  const originalQuiet = process.env.QME_QUIET;
  const originalVerbose = process.env.QME_VERBOSE;

  try {
    const args = configureOutput(["run", "--quiet", "--verbose"]);
    assert.deepEqual(args, ["run"]);
    assert.equal(process.env.QME_QUIET, "1");
    assert.equal(process.env.QME_VERBOSE, "1");
  } finally {
    console.log = originalLog;
    if (originalQuiet === undefined) delete process.env.QME_QUIET;
    else process.env.QME_QUIET = originalQuiet;
    if (originalVerbose === undefined) delete process.env.QME_VERBOSE;
    else process.env.QME_VERBOSE = originalVerbose;
  }
});

test("plugin loader accepts explicit command modules", () => {
  const commands = loadPluginCommands(path.join(process.cwd(), "src/commands/open.js"));
  assert.equal(typeof commands.runOpenCommand, "function");
});

test("XAMPP version helpers normalize folders and sort switch targets", () => {
  const fakeFs = {
    existsSync: () => true,
    statSync: () => ({ isDirectory: () => true }),
    readdirSync: () => [
      { name: "xampp-8.1", isDirectory: () => true },
      { name: "xampp-7.4", isDirectory: () => true },
      { name: "notes", isDirectory: () => true },
    ],
  };

  assert.equal(getXamppSwitchVersionCandidate("xampp-8.1.12"), "8.1");
  assert.deepEqual(getAvailableXamppVersions("C:\\xampp", "8.1", fakeFs), ["7.4"]);
});
