function runNodeToolCommand(args, runTool) {
  const tool = args[0] === "n" ? "npm" : args[0];
  runTool(tool, args.slice(1));
}

module.exports = { runNodeToolCommand };
