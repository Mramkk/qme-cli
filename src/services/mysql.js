const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const chalk = require("chalk");

function createMysqlHelpers(getXamppPathCandidates) {
  function getMysqlBinExecutableCandidates(binaryName) {
    const fileName = process.platform === "win32" ? `${binaryName}.exe` : binaryName;
    const candidates = getXamppPathCandidates().map((xamppRoot) =>
      path.join(xamppRoot, "mysql", "bin", fileName),
    );
    candidates.push(binaryName);
    return [...new Set(candidates.filter(Boolean))];
  }

  function getMysqlExecutableCandidates() {
    return getMysqlBinExecutableCandidates("mysql");
  }

  function getMysqldumpExecutableCandidates() {
    return getMysqlBinExecutableCandidates("mysqldump");
  }

  function getMysqlBaseArgs() {
    return ["-u", process.env.QME_MYSQL_USER || "root"];
  }

  function runMysqlCapture(mysqlPath, mysqlArgs, options = {}) {
    return spawnSync(mysqlPath, mysqlArgs, {
      encoding: "utf8",
      windowsHide: true,
      ...options,
    });
  }

  function resolveMysqlBinExecutable(candidates, label) {
    for (const candidate of candidates) {
      const result = runMysqlCapture(candidate, ["--version"]);
      if (!result.error && result.status === 0) return candidate;
    }
    console.log(chalk.red(`❌ ${label} not found`));
    console.log(
      chalk.yellow(
        `Install MySQL client tools, add \`${label}\` to PATH, or set XAMPP path: qme config xampp-path <path>`,
      ),
    );
    process.exit(1);
  }

  return {
    getMysqlBinExecutableCandidates,
    getMysqlExecutableCandidates,
    getMysqldumpExecutableCandidates,
    getMysqlBaseArgs,
    runMysqlCapture,
    resolveMysqlBinExecutable,
    resolveMysqlExecutable: () =>
      resolveMysqlBinExecutable(getMysqlExecutableCandidates(), "MySQL client"),
    resolveMysqldumpExecutable: () =>
      resolveMysqlBinExecutable(getMysqldumpExecutableCandidates(), "mysqldump"),
    quoteMysqlIdentifier,
    isProtectedDatabase,
    parseMysqlLines,
  };
}

function quoteMysqlIdentifier(value) {
  return `\`${String(value).replace(/`/g, "``")}\``;
}

function isProtectedDatabase(databaseName) {
  return [
    "information_schema",
    "mysql",
    "performance_schema",
    "phpmyadmin",
    "sys",
    "test",
  ].includes(String(databaseName || "").toLowerCase());
}

function parseMysqlLines(output) {
  return String(output || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function runMysqlPermission(getXamppPath) {
  if (process.platform !== "win32") {
    console.log(chalk.red("❌ This command is only available on Windows"));
    process.exit(1);
  }

  const xamppPath = getXamppPath();
  if (!xamppPath) {
    console.log(chalk.red("❌ XAMPP path is not configured"));
    console.log(chalk.yellow('Set it first: qme config xampp-path "H:\\xampp"'));
    process.exit(1);
  }

  const mysqlDataPath = path.join(xamppPath, "mysql", "data");
  if (!fs.existsSync(mysqlDataPath)) {
    console.log(chalk.red(`❌ MySQL data folder was not found: ${mysqlDataPath}`));
    process.exit(1);
  }

  const username = String(process.env.USERNAME || "").trim();
  if (!username) {
    console.log(chalk.red("❌ Windows username could not be detected"));
    process.exit(1);
  }

  console.log(chalk.cyan(`Applying permissions to: ${mysqlDataPath}`));
  const attribResult = spawnSync("attrib", ["-R", path.join(mysqlDataPath, "*"), "/S", "/D"], {
    stdio: "inherit",
    windowsHide: true,
  });
  if (attribResult.error || attribResult.status !== 0) {
    console.log(chalk.red("❌ Failed to remove read-only attributes"));
    process.exit(1);
  }

  const icaclsResult = spawnSync("icacls", [mysqlDataPath, "/grant", `${username}:(OI)(CI)M`], {
    stdio: "inherit",
    windowsHide: true,
  });
  if (icaclsResult.error || icaclsResult.status !== 0) {
    console.log(chalk.red("❌ Permission update failed. Run this command as Administrator."));
    process.exit(1);
  }

  console.log(chalk.green("✅ MySQL permissions updated"));
}

function createMysqlOperations(helpers, { askQuestion, parseFileUriPath }) {
  const {
    getMysqlBaseArgs,
    runMysqlCapture,
    quoteMysqlIdentifier,
    isProtectedDatabase,
    parseMysqlLines,
  } = helpers;
  const createAction = "__create_database__";

  function getMysqlDatabases(mysqlPath) {
    const result = runMysqlCapture(mysqlPath, [
      ...getMysqlBaseArgs(),
      "--batch",
      "--skip-column-names",
      "-e",
      "SHOW DATABASES;",
    ]);
    if (result.error || result.status !== 0) {
      throw new Error(
        `Failed to list MySQL databases${result.stderr ? `: ${result.stderr.trim()}` : ""}`,
      );
    }
    return parseMysqlLines(result.stdout).filter((name) => !isProtectedDatabase(name));
  }

  async function askMysqlDatabase(databases) {
    console.log(chalk.blueBright("MySQL databases:"));
    console.log(chalk.green("  0) Create new database"));
    databases.forEach((database, index) => console.log(chalk.green(`  ${index + 1}) ${database}`)));
    console.log();
    const answer = await askQuestion(
      chalk.yellow(`👉 Choose database (0-${databases.length}) [press Enter to abort]: `),
    );
    if (!answer) return process.exit(0);
    const selectedIndex = Number.parseInt(answer, 10);
    if (selectedIndex === 0) return createAction;
    if (Number.isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > databases.length) {
      throw new Error("Invalid database selection");
    }
    return databases[selectedIndex - 1];
  }

  async function askMysqlAction(databaseName) {
    console.log();
    console.log(chalk.blueBright(`Selected database: ${databaseName}`));
    [
      "Import database",
      "Export database",
      "Drop all tables",
      "Delete database",
      "Open mysql shell",
      "Abort",
    ].forEach((label, index) => console.log(chalk.green(`  ${index + 1}) ${label}`)));
    const answer = await askQuestion(chalk.yellow("👉 Choose action (1/2/3/4/5/6) [default: 6]: "));
    return { 1: "import", 2: "export", 3: "truncate", 4: "delete", 5: "shell" }[answer] || "abort";
  }

  function resolveSqlFilePath(inputPath) {
    const resolvedPath = parseFileUriPath(inputPath);
    const fs = require("fs");
    if (!resolvedPath || !fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
      throw new Error(`SQL file not found: ${inputPath}`);
    }
    return resolvedPath;
  }

  function createMysqlDatabase(mysqlPath, databaseName) {
    if (!databaseName) throw new Error("Database name required");
    if (isProtectedDatabase(databaseName))
      throw new Error(`Refusing to create protected database name: ${databaseName}`);
    const result = runMysqlCapture(mysqlPath, [
      ...getMysqlBaseArgs(),
      "-e",
      `CREATE DATABASE ${quoteMysqlIdentifier(databaseName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    ]);
    if (result.error || result.status !== 0)
      throw new Error(
        `Failed to create database${result.stderr ? `: ${result.stderr.trim()}` : ""}`,
      );
    console.log(chalk.green(`✅ Created database: ${databaseName}`));
  }

  async function deleteMysqlDatabase(mysqlPath, databaseName) {
    if (isProtectedDatabase(databaseName))
      throw new Error(`Refusing to delete protected database: ${databaseName}`);
    console.log(chalk.red(`⚠️ This will permanently delete database: ${databaseName}`));
    const confirmation = await askQuestion(chalk.yellow("Are you sure? yes/no [default: no]: "));
    if (
      String(confirmation || "")
        .trim()
        .toLowerCase() !== "yes"
    )
      return;
    const result = runMysqlCapture(mysqlPath, [
      ...getMysqlBaseArgs(),
      "-e",
      `DROP DATABASE ${quoteMysqlIdentifier(databaseName)};`,
    ]);
    if (result.error || result.status !== 0)
      throw new Error(
        `Failed to delete database${result.stderr ? `: ${result.stderr.trim()}` : ""}`,
      );
    console.log(chalk.green(`✅ Deleted database: ${databaseName}`));
  }

  function importMysqlDatabase(mysqlPath, databaseName, sqlFilePath) {
    const result = spawnSync(mysqlPath, [...getMysqlBaseArgs(), databaseName], {
      stdio: ["pipe", "inherit", "inherit"],
      input: fs.readFileSync(sqlFilePath),
      windowsHide: true,
    });
    if (result.error || result.status !== 0) process.exit(result.status || 1);
    console.log(chalk.green(`✅ Imported ${sqlFilePath} into ${databaseName}`));
  }

  function exportMysqlDatabase(mysqldumpPath, databaseName, outputPath) {
    const outFd = fs.openSync(outputPath, "w");
    try {
      const result = spawnSync(
        mysqldumpPath,
        [...getMysqlBaseArgs(), "--routines", "--triggers", "--single-transaction", databaseName],
        { stdio: ["ignore", outFd, "inherit"], windowsHide: true },
      );
      if (result.error || result.status !== 0) {
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size === 0)
          fs.unlinkSync(outputPath);
        process.exit(result.status || 1);
      }
    } finally {
      fs.closeSync(outFd);
    }
    console.log(chalk.green(`✅ Exported ${databaseName} to ${outputPath}`));
  }

  function runMysqlShell(mysqlPath, databaseName) {
    const result = spawnSync(mysqlPath, [...getMysqlBaseArgs(), databaseName], {
      stdio: "inherit",
      windowsHide: false,
    });
    if (result.error) process.exit(1);
    process.exit(typeof result.status === "number" ? result.status : 0);
  }

  function getMysqlTables(mysqlPath, databaseName) {
    const result = runMysqlCapture(mysqlPath, [
      ...getMysqlBaseArgs(),
      "--batch",
      "--skip-column-names",
      databaseName,
      "-e",
      "SHOW FULL TABLES WHERE Table_type = 'BASE TABLE';",
    ]);
    if (result.error || result.status !== 0) process.exit(1);
    return parseMysqlLines(result.stdout)
      .map((line) => line.split(/\t/)[0])
      .filter(Boolean);
  }

  async function dropMysqlTables(mysqlPath, databaseName) {
    if (isProtectedDatabase(databaseName)) process.exit(1);
    const tables = getMysqlTables(mysqlPath, databaseName);
    if (tables.length === 0) {
      console.log(chalk.yellow(`ℹ️ No base tables found in ${databaseName}`));
      return;
    }
    console.log(chalk.yellow(`⚠️ This will drop ${tables.length} table(s) in ${databaseName}.`));
    const confirmation = await askQuestion(chalk.yellow(`Type DROP ${databaseName} to continue: `));
    if (confirmation !== `DROP ${databaseName}`) process.exit(0);
    const statements = [
      "SET FOREIGN_KEY_CHECKS=0;",
      ...tables.map((table) => `DROP TABLE ${quoteMysqlIdentifier(table)};`),
      "SET FOREIGN_KEY_CHECKS=1;",
    ].join("\n");
    const result = runMysqlCapture(mysqlPath, [
      ...getMysqlBaseArgs(),
      databaseName,
      "-e",
      statements,
    ]);
    if (result.error || result.status !== 0) process.exit(1);
    console.log(chalk.green(`✅ Dropped ${tables.length} table(s) in ${databaseName}`));
  }

  return {
    createAction,
    getMysqlDatabases,
    askMysqlDatabase,
    askMysqlAction,
    resolveSqlFilePath,
    createMysqlDatabase,
    deleteMysqlDatabase,
    importMysqlDatabase,
    exportMysqlDatabase,
    runMysqlShell,
    getMysqlTables,
    dropMysqlTables,
    quoteMysqlIdentifier,
    isProtectedDatabase,
  };
}

module.exports = {
  createMysqlHelpers,
  createMysqlOperations,
  quoteMysqlIdentifier,
  isProtectedDatabase,
  parseMysqlLines,
  runMysqlPermission,
};
