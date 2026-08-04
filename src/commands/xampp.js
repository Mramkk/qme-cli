async function runXamppCommand(
  args,
  {
    runXamppStartByPlatform,
    runXamppStopByPlatform,
    runXamppSwitch,
    resolveXamppPhpIniPath,
    tryOpenInVsCode,
    runXamppProjects,
  },
) {
  const command = args[0];

  if (command === "xini") {
    tryOpenInVsCode(resolveXamppPhpIniPath(), "XAMPP php.ini");
    return true;
  }
  if (command === "xproj") {
    await runXamppProjects();
    return true;
  }
  if (command === "xstart" || (command === "xampp" && args[1] === "start")) {
    runXamppStartByPlatform();
    return true;
  }
  if (command === "xstop" || (command === "xampp" && args[1] === "stop")) {
    await runXamppStopByPlatform();
    return true;
  }
  if (command === "xswitch" || (command === "xampp" && args[1] === "switch")) {
    const requestedVersion = command === "xswitch" ? args[1] : args[2];
    await runXamppSwitch(requestedVersion);
    return true;
  }

  return false;
}

module.exports = { runXamppCommand };
