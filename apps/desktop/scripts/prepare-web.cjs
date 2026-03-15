const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..", "..", "..");
const webAppDir = path.join(rootDir, "apps", "web");
const standaloneDir = path.join(webAppDir, ".next", "standalone");
const staticDir = path.join(webAppDir, ".next", "static");
const publicDir = path.join(webAppDir, "public");
const outputDir = path.join(rootDir, "apps", "desktop", ".dist", "web");
const outputNodeModulesDir = path.join(outputDir, "node_modules");
const outputDepsDir = path.join(outputDir, "deps");

if (!fs.existsSync(standaloneDir)) {
  throw new Error("Missing Next standalone output. Run `npm run build:web` before packaging the desktop app.");
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.cpSync(standaloneDir, outputDir, { recursive: true });

if (fs.existsSync(outputNodeModulesDir)) {
  fs.cpSync(outputNodeModulesDir, outputDepsDir, { recursive: true });
  fs.rmSync(outputNodeModulesDir, { recursive: true, force: true });
}

const nestedWebDir = fs.existsSync(path.join(outputDir, "apps", "web"))
  ? path.join(outputDir, "apps", "web")
  : outputDir;

if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, path.join(nestedWebDir, "public"), { recursive: true });
}

if (fs.existsSync(staticDir)) {
  fs.mkdirSync(path.join(nestedWebDir, ".next"), { recursive: true });
  fs.cpSync(staticDir, path.join(nestedWebDir, ".next", "static"), { recursive: true });
}

console.log(`Prepared desktop web bundle at ${outputDir}`);
