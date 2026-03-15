const path = require("node:path");
const { spawn } = require("node:child_process");
const electronBinary = require("electron");

const rootDir = path.resolve(__dirname, "..", "..", "..");
const desktopDir = path.resolve(__dirname, "..");
const startUrl = process.env.ELECTRON_START_URL || "http://127.0.0.1:3000/login";

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function spawnProcess(command, args, options = {}) {
  return spawn(command, args, {
    stdio: "inherit",
    ...options
  });
}

async function waitForUrl(url, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok || response.status < 500) {
        return;
      }
    } catch {
      // Ignore and keep retrying.
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

let electronProcess = null;
const webProcess = spawnProcess(getNpmCommand(), ["run", "dev", "-w", "apps/web"], {
  cwd: rootDir,
  env: {
    ...process.env
  }
});

function shutdown(exitCode = 0) {
  if (electronProcess && !electronProcess.killed) {
    electronProcess.kill();
  }
  if (!webProcess.killed) {
    webProcess.kill();
  }
  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

webProcess.on("exit", (code) => {
  if (electronProcess && !electronProcess.killed) {
    electronProcess.kill();
  }
  process.exit(code ?? 1);
});

void waitForUrl(startUrl)
  .then(() => {
    electronProcess = spawnProcess(electronBinary, ["."], {
      cwd: desktopDir,
      env: {
        ...process.env,
        ELECTRON_START_URL: startUrl
      }
    });

    electronProcess.on("exit", (code) => {
      if (!webProcess.killed) {
        webProcess.kill();
      }
      process.exit(code ?? 0);
    });
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    shutdown(1);
  });
