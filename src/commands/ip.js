function runIpCommand(getCurrentIpAddress) {
  const ipAddress = getCurrentIpAddress();
  if (ipAddress) {
    console.log(ipAddress);
    return;
  }

  process.exit(1);
}

module.exports = { runIpCommand };
