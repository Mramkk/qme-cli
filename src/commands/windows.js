function runWindowsAliasCommand(args, runWindowsCommand) {
  const command = args[0];

  if (command === "win" || command === "w") {
    runWindowsCommand(args[1], args.slice(2));
    return true;
  }
  if (command === "wintask" || command === "taskm") {
    runWindowsCommand("taskmgr");
    return true;
  }
  if (command === "wl") {
    runWindowsCommand("lock");
    return true;
  }
  if (command === "path") {
    runWindowsCommand("explorer");
    return true;
  }
  if (command === "postman") {
    runWindowsCommand("postman", [], { fireAndForget: true });
    return true;
  }
  if (command === "chrome") {
    runWindowsCommand("chrome");
    return true;
  }

  return false;
}

module.exports = { runWindowsAliasCommand };
