async function runMysqlCommand(args, { runMysqlPermission, runMysqlMenu }) {
  if (args[1] === "permission" || args[1] === "permissions") {
    runMysqlPermission();
    return;
  }

  await runMysqlMenu(args);
}

module.exports = { runMysqlCommand };
