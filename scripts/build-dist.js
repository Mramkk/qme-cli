const fs = require("fs");
const path = require("path");
const { minify } = require("terser");
const JavaScriptObfuscator = require("javascript-obfuscator");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) copyDirectory(sourcePath, targetPath);
    else fs.copyFileSync(sourcePath, targetPath);
  }
}

async function minifyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      await minifyDirectory(sourcePath, targetPath);
      continue;
    }

    if (!entry.name.endsWith(".js")) {
      fs.copyFileSync(sourcePath, targetPath);
      continue;
    }

    await minifyFile(sourcePath, targetPath);
  }
}

async function minifyFile(sourcePath, targetPath) {
    const sourceCode = fs.readFileSync(sourcePath, "utf8");
    const shebang = sourceCode.startsWith("#!")
      ? `${sourceCode.split("\n", 1)[0]}\n`
      : "";
    const code = shebang ? sourceCode.slice(shebang.length) : sourceCode;
    const result = await minify(code, {
      compress: true,
      mangle: true,
      format: { comments: false },
    });
    const obfuscated = JavaScriptObfuscator.obfuscate(result.code, {
      compact: true,
      controlFlowFlattening: false,
      deadCodeInjection: false,
      debugProtection: false,
      disableConsoleOutput: false,
      identifierNamesGenerator: "hexadecimal",
      renameGlobals: false,
      selfDefending: false,
      stringArray: true,
      stringArrayRotate: true,
      stringArrayThreshold: 0.75,
    }).getObfuscatedCode();

    fs.writeFileSync(targetPath, `${shebang}${obfuscated}\n`);
    fs.chmodSync(targetPath, fs.statSync(sourcePath).mode);
}

async function main() {
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });

  // Runtime code reads package.json relative to index.js/src files.
  fs.copyFileSync(path.join(root, "package.json"), path.join(dist, "package.json"));
  copyDirectory(path.join(root, "completions"), path.join(dist, "completions"));
  await minifyFile(path.join(root, "index.js"), path.join(dist, "index.js"));
  await minifyDirectory(path.join(root, "src"), path.join(dist, "src"));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
