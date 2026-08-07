const fs = require("fs");
const path = require("path");

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function hasFile(baseDir, fileName) {
  try {
    const fullPath = path.join(baseDir, fileName);
    return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
  } catch {
    return false;
  }
}

function hasDirectory(baseDir, dirName) {
  try {
    const fullPath = path.join(baseDir, dirName);
    return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
  } catch {
    return false;
  }
}

function detectProjectProfile(baseDir) {
  const pkg = safeReadJson(path.join(baseDir, "package.json"));
  if (hasFile(baseDir, "artisan") && hasFile(baseDir, "composer.json")) return "laravel";
  if (hasFile(baseDir, "pubspec.yaml")) return "flutter";
  if (!pkg) return "unknown";

  if (
    pkg.dependencies?.["@nestjs/common"] ||
    pkg.dependencies?.["@nestjs/core"] ||
    pkg.devDependencies?.["@nestjs/common"] ||
    pkg.devDependencies?.["@nestjs/core"] ||
    pkg.devDependencies?.["@nestjs/cli"]
  )
    return "nestjs";
  if (
    hasFile(baseDir, "angular.json") ||
    pkg.dependencies?.["@angular/core"] ||
    pkg.devDependencies?.["@angular/core"]
  )
    return "angular";
  if (pkg.dependencies?.next || pkg.devDependencies?.next) return "next";
  if (pkg.dependencies?.react || pkg.devDependencies?.react) return "react";
  if (pkg.dependencies?.vite || pkg.devDependencies?.vite) return "vite";
  return "node";
}

function getProjectTypeLabel(profile) {
  const value = String(profile || "")
    .trim()
    .toLowerCase();
  return ["laravel", "flutter", "nestjs", "angular", "next", "react", "vite", "node"].includes(
    value,
  )
    ? value
    : "unknown";
}

function getLaravelVersion(baseDir) {
  const composer = safeReadJson(path.join(baseDir, "composer.json"));
  return String(composer?.require?.["laravel/framework"] || "").trim();
}

function getNodePackageManager(baseDir) {
  if (hasFile(baseDir, "pnpm-lock.yaml")) return "pnpm";
  if (hasFile(baseDir, "yarn.lock")) return "yarn";
  return "npm";
}

function parseEnvFile(filePath) {
  const result = {};
  try {
    if (!fs.existsSync(filePath)) return result;
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed
        .slice(index + 1)
        .trim()
        .replace(/^"+|"+$/g, "")
        .replace(/^'+|'+$/g, "");
      result[key] = value;
    }
  } catch {
    return result;
  }
  return result;
}

function inspectRunEnvironment(baseDir) {
  const profile = detectProjectProfile(baseDir);
  const pkg = safeReadJson(path.join(baseDir, "package.json"));
  const envValues = parseEnvFile(path.join(baseDir, ".env"));
  const checks = [];
  const hasEnv = hasFile(baseDir, ".env");
  const hasEnvExample = hasFile(baseDir, ".env.example");
  const nodeModules = hasDirectory(baseDir, "node_modules");

  if (profile === "laravel") {
    checks.push({
      ok: hasEnv,
      label: ".env",
      detail: hasEnv ? "found" : hasEnvExample ? "missing, .env.example exists" : "missing",
    });
    checks.push({
      ok: hasFile(baseDir, "artisan"),
      label: "artisan",
      detail: "Laravel entry point",
    });
  } else if (["node", "nestjs", "angular", "react", "vite", "next"].includes(profile)) {
    checks.push({
      ok: nodeModules,
      label: "node_modules",
      detail: nodeModules ? "installed" : "missing",
    });
    checks.push({
      ok: hasEnv || hasEnvExample,
      label: ".env",
      detail: hasEnv ? "found" : hasEnvExample ? "only .env.example found" : "missing",
    });
  } else if (profile === "flutter") {
    checks.push({
      ok: hasFile(baseDir, "pubspec.yaml"),
      label: "pubspec.yaml",
      detail: "Flutter project",
    });
  }

  const scripts = pkg?.scripts ? Object.keys(pkg.scripts) : [];
  const nextStep =
    profile === "laravel"
      ? "php artisan serve"
      : profile === "flutter"
        ? "flutter run"
        : scripts.includes("dev")
          ? "npm run dev"
          : scripts.includes("start")
            ? "npm start"
            : "";

  return { profile, pkg, checks, hasEnv, hasEnvExample, nodeModules, nextStep, envValues };
}

module.exports = {
  detectProjectProfile,
  getProjectTypeLabel,
  getLaravelVersion,
  getNodePackageManager,
  inspectRunEnvironment,
  parseEnvFile,
};
