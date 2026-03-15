const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  safeStorage,
  shell
} = require("electron");

const DESKTOP_PROTOCOL = "eggshell";
const DESKTOP_CALLBACK_HOST = "auth";
const DESKTOP_CALLBACK_PATH = "/callback";
const DEFAULT_CHAT_PATH = "/chat";
const DEFAULT_LOCAL_API_ORIGIN = "http://127.0.0.1:8080";
const DEFAULT_LOCAL_WEB_ORIGIN = "http://127.0.0.1:3000";
const DESKTOP_WINDOW_URL = "/login";
const WEB_SERVER_PORT = Number(process.env.EGGSHELL_DESKTOP_PORT || 3210);

let mainWindow = null;
let webServerProcess = null;
let webServerStartedInProcess = false;
let appIsQuitting = false;

function isDevelopment() {
  return Boolean(process.env.ELECTRON_START_URL);
}

function normalizeOrigin(value, fallback) {
  const origin = value || fallback;
  return origin.endsWith("/") ? origin.slice(0, -1) : origin;
}

function resolveApiOrigin() {
  return normalizeOrigin(
    process.env.EGGSHELL_API_ORIGIN || process.env.TUTORMARKET_API_ORIGIN,
    DEFAULT_LOCAL_API_ORIGIN
  );
}

function resolveWebOrigin() {
  return normalizeOrigin(process.env.EGGSHELL_WEB_ORIGIN, DEFAULT_LOCAL_WEB_ORIGIN);
}

function normalizeNextPath(nextPath) {
  if (typeof nextPath !== "string" || !nextPath.startsWith("/") || nextPath.startsWith("//") || nextPath.includes("://")) {
    return DEFAULT_CHAT_PATH;
  }

  return nextPath;
}

function buildExternalLoginUrl(nextPath) {
  const normalizedNextPath = normalizeNextPath(nextPath);
  const completionPath = `/desktop/auth/complete?next=${encodeURIComponent(normalizedNextPath)}`;
  return `${resolveWebOrigin()}/login?next=${encodeURIComponent(completionPath)}`;
}

function getSessionFilePath() {
  return path.join(app.getPath("userData"), "desktop-session.json");
}

function encodeSessionPayload(serializedSession) {
  if (safeStorage.isEncryptionAvailable()) {
    return {
      encrypted: true,
      value: safeStorage.encryptString(serializedSession).toString("base64")
    };
  }

  return {
    encrypted: false,
    value: serializedSession
  };
}

function decodeSessionPayload(rawPayload) {
  if (!rawPayload || typeof rawPayload.value !== "string") {
    return null;
  }

  if (rawPayload.encrypted) {
    if (!safeStorage.isEncryptionAvailable()) {
      return null;
    }
    return safeStorage.decryptString(Buffer.from(rawPayload.value, "base64"));
  }

  return rawPayload.value;
}

function readStoredSession() {
  try {
    const sessionFile = getSessionFilePath();
    if (!fs.existsSync(sessionFile)) {
      return null;
    }

    const raw = JSON.parse(fs.readFileSync(sessionFile, "utf8"));
    const serializedSession = decodeSessionPayload(raw);
    return serializedSession ? JSON.parse(serializedSession) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session) {
  const sessionFile = getSessionFilePath();
  fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
  fs.writeFileSync(sessionFile, JSON.stringify(encodeSessionPayload(JSON.stringify(session))));
}

function clearStoredSession() {
  fs.rmSync(getSessionFilePath(), { force: true });
}

function resolveProtocolUrl(argv) {
  return argv.find((entry) => typeof entry === "string" && entry.startsWith(`${DESKTOP_PROTOCOL}://`)) || null;
}

async function waitForUrl(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok || response.status < 500) {
        return;
      }
    } catch {
      // Keep polling until the timeout expires.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function appendNodePath(nodePath) {
  const current = process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter).filter(Boolean) : [];
  if (!current.includes(nodePath)) {
    current.unshift(nodePath);
    process.env.NODE_PATH = current.join(path.delimiter);
    Module._initPaths();
  }
}

function getPackagedWebRoot() {
  return path.join(process.resourcesPath, "web");
}

function resolvePackagedDependencyRoot() {
  const packagedWebRoot = getPackagedWebRoot();
  const candidates = [
    path.join(packagedWebRoot, "deps"),
    path.join(packagedWebRoot, "node_modules")
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

function resolvePackagedServerScript() {
  const packagedWebRoot = getPackagedWebRoot();
  const candidates = [
    path.join(packagedWebRoot, "server.js"),
    path.join(packagedWebRoot, "apps", "web", "server.js")
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

async function ensureWebServerStarted() {
  if (webServerProcess || webServerStartedInProcess) {
    return;
  }

  const serverScript = resolvePackagedServerScript();
  if (!fs.existsSync(serverScript)) {
    throw new Error(`Packaged web server not found at ${serverScript}`);
  }

  appendNodePath(resolvePackagedDependencyRoot());
  process.env.HOSTNAME = "127.0.0.1";
  process.env.NODE_ENV = "production";
  process.env.PORT = String(WEB_SERVER_PORT);
  process.env.EGGSHELL_API_ORIGIN = resolveApiOrigin();
  process.env.TUTORMARKET_API_ORIGIN = resolveApiOrigin();

  require(serverScript);
  webServerStartedInProcess = true;

  await waitForUrl(`http://127.0.0.1:${WEB_SERVER_PORT}${DESKTOP_WINDOW_URL}`);
}

async function resolveAppUrl() {
  if (isDevelopment()) {
    return process.env.ELECTRON_START_URL;
  }

  await ensureWebServerStarted();
  return `http://127.0.0.1:${WEB_SERVER_PORT}${DESKTOP_WINDOW_URL}`;
}

async function exchangeDesktopCode(code) {
  const response = await fetch(`${resolveApiOrigin()}/api/v1/auth/desktop/exchange`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      code,
      platform: "desktop_win"
    })
  });

  if (!response.ok) {
    let message = `桌面登录兑换失败（${response.status}）`;
    try {
      const payload = await response.json();
      if (payload?.message) {
        message = payload.message;
      } else if (payload?.error) {
        message = payload.error;
      }
    } catch {
      const fallbackMessage = await response.text();
      if (fallbackMessage) {
        message = fallbackMessage;
      }
    }

    throw new Error(message);
  }

  return response.json();
}

async function focusMainWindow() {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  mainWindow.focus();
}

async function handleProtocolUrl(protocolUrl) {
  if (!protocolUrl) {
    return;
  }

  try {
    const parsedUrl = new URL(protocolUrl);
    if (
      parsedUrl.protocol !== `${DESKTOP_PROTOCOL}:` ||
      parsedUrl.hostname !== DESKTOP_CALLBACK_HOST ||
      parsedUrl.pathname !== DESKTOP_CALLBACK_PATH
    ) {
      return;
    }

    const code = parsedUrl.searchParams.get("code");
    if (!code) {
      throw new Error("桌面授权回调缺少 code");
    }

    const session = await exchangeDesktopCode(code);
    writeStoredSession(session);

    if (mainWindow) {
      mainWindow.webContents.send("auth:completed", session);
    }
    await focusMainWindow();
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    dialog.showErrorBox("桌面登录失败", message);
    await focusMainWindow();
  }
}

function registerProtocolClient() {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(DESKTOP_PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
    return;
  }

  app.setAsDefaultProtocolClient(DESKTOP_PROTOCOL);
}

async function createMainWindow() {
  const startUrl = await resolveAppUrl();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 760,
    show: false,
    autoHideMenuBar: true,
    title: "蛋壳伴学",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("http://127.0.0.1") || url.startsWith("https://127.0.0.1")) {
      return;
    }
    if (url.startsWith(resolveWebOrigin())) {
      return;
    }

    event.preventDefault();
    shell.openExternal(url);
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(startUrl);
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    void focusMainWindow();
    void handleProtocolUrl(resolveProtocolUrl(argv));
  });

  app.on("before-quit", () => {
    appIsQuitting = true;
    if (webServerProcess) {
      webServerProcess.kill();
    }
  });

  ipcMain.handle("auth:get-session", () => readStoredSession());
  ipcMain.handle("auth:set-session", (_event, session) => {
    writeStoredSession(session);
  });
  ipcMain.handle("auth:clear-session", () => {
    clearStoredSession();
  });
  ipcMain.handle("auth:open-external-login", (_event, nextPath) => shell.openExternal(buildExternalLoginUrl(nextPath)));

  app.whenReady().then(async () => {
    registerProtocolClient();
    await createMainWindow();
    await handleProtocolUrl(resolveProtocolUrl(process.argv));

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createMainWindow();
      }
    });
  }).catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown startup error";
    dialog.showErrorBox("桌面应用启动失败", message);
    app.quit();
  });
}
