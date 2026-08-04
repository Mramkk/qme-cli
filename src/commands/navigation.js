function runNavigationCommand(
  args,
  { openCurrentPathByPlatform, resolveLastVsCodeProjectPath, tryOpenInVsCode },
) {
  if (args[0] === ".") {
    openCurrentPathByPlatform();
    return true;
  }
  if (args[0] === "recent") {
    tryOpenInVsCode(resolveLastVsCodeProjectPath());
    return true;
  }
  return false;
}

module.exports = { runNavigationCommand };
