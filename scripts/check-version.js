const fs = require("fs");
const path = require("path");

const packagePath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const version = String(packageJson.version || "").trim();

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Invalid semantic version: ${version || "(empty)"}`);
  process.exit(1);
}

console.log(`Version ${version} is valid semver.`);
