function configureOutput(args) {
  const quiet = args.includes("--quiet");
  const verbose = args.includes("--verbose");

  if (quiet) {
    process.env.QME_QUIET = "1";
    console.log = () => {};
  }
  if (verbose) {
    process.env.QME_VERBOSE = "1";
  }

  return args.filter((arg) => arg !== "--quiet" && arg !== "--verbose");
}

module.exports = { configureOutput };
