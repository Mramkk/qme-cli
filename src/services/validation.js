const { runSync } = require("../process");

function isExecutableAvailable(command) {
  const result = runSync(command, ["--version"], {
    allowFailure: true,
    stdio: "ignore",
    windowsHide: true,
  });
  return !result.error && result.status === 0;
}

module.exports = { isExecutableAvailable };
