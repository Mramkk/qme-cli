const test = require("node:test");
const assert = require("node:assert/strict");

const { runIpCommand } = require("../src/commands/ip");
const { runOpenCommand } = require("../src/commands/open");
const { runFlutterCommand } = require("../src/commands/flutter");
const { runConfigCommand } = require("../src/commands/config");
const { runMysqlCommand } = require("../src/commands/mysql");
const { runNodeToolCommand } = require("../src/commands/node-tools");
const { runXamppCommand } = require("../src/commands/xampp");

test("ip command prints the detected address", () => {
  const originalLog = console.log;
  const output = [];
  console.log = (value) => output.push(value);

  try {
    runIpCommand(() => "192.168.1.20");
  } finally {
    console.log = originalLog;
  }

  assert.deepEqual(output, ["192.168.1.20"]);
});

test("open command forwards the supplied URL", () => {
  let openedUrl = "";
  runOpenCommand(["open", "https://example.com"], (url) => {
    openedUrl = url;
  });

  assert.equal(openedUrl, "https://example.com");
});

test("flutter command maps debug to flutter run --debug", async () => {
  let command;
  await runFlutterCommand(["flutter", "debug", "--device-id", "demo"], {
    runFlutterMenu: async () => {},
    runFlutterCommand: (args) => {
      command = args;
    },
    getFlutterSubcommands: () => [],
    printSuggestions: () => {},
  });

  assert.deepEqual(command, ["run", "--debug", "--device-id", "demo"]);
});

test("config command updates the automatic-update setting", async () => {
  let enabled;
  const handled = await runConfigCommand(["config", "auto-update", "enable"], {
    getUpdateCheckSetting: () => false,
    setUpdateCheckSetting: (value) => {
      enabled = value;
    },
    getConfigPath: () => "config.json",
  });

  assert.equal(handled, true);
  assert.equal(enabled, true);
});

test("mysql permission command selects the permission operation", async () => {
  let permissionCalled = false;
  let menuCalled = false;
  await runMysqlCommand(["mysql", "permissions"], {
    runMysqlPermission: () => {
      permissionCalled = true;
    },
    runMysqlMenu: async () => {
      menuCalled = true;
    },
  });

  assert.equal(permissionCalled, true);
  assert.equal(menuCalled, false);
});

test("node tool aliases map n to npm", () => {
  let call;
  runNodeToolCommand(["n", "install"], (tool, args) => {
    call = { tool, args };
  });

  assert.deepEqual(call, { tool: "npm", args: ["install"] });
});

test("xampp command maps xstop to the platform stop operation", async () => {
  let stopped = false;
  let stopOptions;
  await runXamppCommand(["xstop"], {
    runXamppStartByPlatform: () => {},
    runXamppStopByPlatform: async (options) => {
      stopped = true;
      stopOptions = options;
    },
    runXamppSwitch: async () => {},
    resolveXamppPhpIniPath: () => "",
    tryOpenInVsCode: () => {},
    runXamppProjects: async () => {},
  });

  assert.equal(stopped, true);
  assert.equal(stopOptions.killCodeFirst, true);
});

test("xampp switch forwards the requested version", async () => {
  let requestedVersion;
  await runXamppCommand(["xampp", "switch", "8.1"], {
    runXamppStartByPlatform: () => {},
    runXamppStopByPlatform: async () => {},
    runXamppSwitch: async (version) => {
      requestedVersion = version;
    },
    resolveXamppPhpIniPath: () => "",
    tryOpenInVsCode: () => {},
    runXamppProjects: async () => {},
  });

  assert.equal(requestedVersion, "8.1");
});
