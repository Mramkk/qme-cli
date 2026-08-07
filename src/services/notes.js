const fs = require("fs");
const os = require("os");
const path = require("path");

function createNotesService({ chalk }) {
  function getDesktopNotesPath() {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = String(now.getFullYear());
    return path.join(os.homedir(), "Documents", `notes-${dd}-${mm}-${yyyy}.txt`);
  }

  function appendNoteText(notePath, text, options = {}) {
    const { showSuccess = true } = options;
    const fullPath = path.resolve(notePath);
    const dirPath = path.dirname(fullPath);

    try {
      fs.mkdirSync(dirPath, { recursive: true });
      const existing = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
      const needsLeadingNewline = existing.length > 0 && !existing.endsWith("\n");
      fs.appendFileSync(fullPath, `${needsLeadingNewline ? "\n" : ""}${text}\n`, "utf8");
    } catch (error) {
      console.log(chalk.red("❌ Failed to write note file"));
      console.log(chalk.yellow(error.message));
      process.exit(1);
    }

    if (showSuccess) console.log(chalk.green(`✅ Added to note: ${fullPath}`));
  }

  return { appendNoteText, getDesktopNotesPath };
}

module.exports = { createNotesService };
