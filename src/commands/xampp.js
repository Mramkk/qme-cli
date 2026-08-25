async function runXamppCommand(
  args,
  {
    runXamppStartByPlatform,
    runXamppStopByPlatform,
    runXamppSwitch,
    resolveXamppPhpIniPath,
    tryOpenInVsCode,
    runXamppProjects,
    askQuestion,
    getXamppPath,
    setXamppPath,
    onMysqlReady,
  },
) {
  const command = args[0];

  if (command === "xampp" && !args[1]) {
    while (true) {
      console.log();
      console.log("XAMPP menu");
      console.log("  1) Start");
      console.log("  2) Stop");
      console.log("  3) Switch version");
      console.log("  4) php.ini");
      console.log("  5) Projects");
      console.log("  6) Path");
      console.log("  q) Exit");

      const choice = (await askQuestion("👉 Choose an option: ")).trim().toLowerCase();
      if (!choice || choice === "q" || choice === "quit" || choice === "exit") return true;

      const selected = {
        1: ["xampp", "start"],
        2: ["xampp", "stop"],
        3: ["xampp", "switch"],
        4: ["xini"],
        5: ["xproj"],
      }[choice];
      if (choice === "6") {
        const xamppPath = getXamppPath();
        console.log(
          xamppPath ? `Current XAMPP path: ${xamppPath}` : "XAMPP path is not configured",
        );
        console.log("  1) Change path");
        console.log("  q) Back");
        const pathChoice = (await askQuestion("👉 Choose an option: ")).trim().toLowerCase();
        if (pathChoice === "1") {
          const nextPath = (await askQuestion("👉 Enter new XAMPP path: ")).trim();
          if (!nextPath) {
            console.log("❌ XAMPP path cannot be empty");
          } else {
            setXamppPath(nextPath);
            console.log(`✅ XAMPP path updated: ${nextPath}`);
          }
        }
        continue;
      }
      if (selected) {
        await runXamppCommand(selected, {
          runXamppStartByPlatform,
          runXamppStopByPlatform,
          runXamppSwitch,
          resolveXamppPhpIniPath,
          tryOpenInVsCode,
          runXamppProjects,
          askQuestion,
          getXamppPath,
          setXamppPath,
          onMysqlReady,
        });
      }
    }
  }

  if (command === "xini") {
    tryOpenInVsCode(resolveXamppPhpIniPath(), "XAMPP php.ini");
    return true;
  }
  if (command === "xproj") {
    await runXamppProjects();
    return true;
  }
  if (command === "xstart" || (command === "xampp" && args[1] === "start")) {
    runXamppStartByPlatform({ onMysqlReady });
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
