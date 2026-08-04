function runArtisanCommand(args, runArtisan) {
  if (args[0] !== "pa") return false;
  runArtisan(args.slice(1));
  return true;
}

module.exports = { runArtisanCommand };
