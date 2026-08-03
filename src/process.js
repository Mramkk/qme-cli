const { spawnSync } = require("child_process");

/**
 * Run an executable with arguments without invoking a shell.
 * Keep shell execution out of normal command paths so arguments are not
 * concatenated into a command string.
 */
function runSync(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: options.encoding || "utf8",
    input: options.input,
    stdio: options.stdio,
    windowsHide: options.windowsHide ?? true,
    shell: false,
  });

  if (result.error && options.allowFailure !== true) {
    throw result.error;
  }

  if (
    options.allowFailure !== true &&
    typeof result.status === "number" &&
    result.status !== 0
  ) {
    const error = new Error(`${command} exited with code ${result.status}`);
    error.code = result.status;
    error.result = result;
    throw error;
  }

  return result;
}

module.exports = { runSync };
