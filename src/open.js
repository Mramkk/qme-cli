const chalk = require("chalk");
const { execSync } = require("child_process");

function normalizeUrl(raw) {
  const input = String(raw || "").trim();
  if (!input) {
    return "";
  }

  // If user provides localhost:8000, treat as http.
  if (/^[a-zA-Z0-9.-]+:\d+\b/.test(input) && !/^https?:\/\//i.test(input)) {
    return `http://${input}`;
  }

  // If user provides just localhost or an IP without scheme, assume http.
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input) && /^[\w.-]+(\:\d+)?(\/|$)/.test(input)) {
    return `http://${input}`;
  }

  return input;
}

function openUrlInBrowser(url) {
  const target = normalizeUrl(url);
  if (!target) {
    throw new Error("URL is required");
  }

  if (process.platform === "win32") {
    const safe = target.replace(/"/g, '""');
    execSync(`start "" "${safe}"`, { stdio: "ignore", shell: true });
    return;
  }

  const escaped = target.replace(/"/g, "\\\"");
  if (process.platform === "darwin") {
    execSync(`open "${escaped}"`, { stdio: "ignore" });
    return;
  }

  execSync(`xdg-open "${escaped}"`, { stdio: "ignore" });
}

function runOpen(url) {
  try {
    openUrlInBrowser(url);
    console.log(chalk.green("✅ Opened in browser"));
    console.log(chalk.cyan(normalizeUrl(url)));
  } catch (err) {
    console.log(chalk.red("❌ Failed to open URL"));
    console.log(chalk.yellow(err && err.message ? String(err.message) : String(err)));
    process.exit(1);
  }
}

module.exports = {
  runOpen,
  openUrlInBrowser,
  normalizeUrl,
};
