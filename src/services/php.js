const { runSync } = require("../process");

function getPhpVersion(baseDir) {
  try {
    const result = runSync("php", ["-v"], {
      cwd: baseDir,
      windowsHide: true,
      allowFailure: true,
    });

    if (result.error || result.status !== 0) return "";

    const firstLine =
      String(result.stdout || "")
        .trim()
        .split(/\r?\n/)[0] || "";
    const match = firstLine.match(/PHP\s+([0-9]+\.[0-9]+\.[0-9]+(?:-[^\s]+)?)/i);
    if (match?.[1]) return match[1];

    const fallback = runSync("php", ["-r", "echo PHP_VERSION;"], {
      cwd: baseDir,
      windowsHide: true,
      allowFailure: true,
    });
    return fallback.error || fallback.status !== 0 ? "" : String(fallback.stdout || "").trim();
  } catch {
    return "";
  }
}

module.exports = { getPhpVersion };
