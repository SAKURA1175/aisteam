const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("eggshellDesktop", {
  auth: {
    getSession: () => ipcRenderer.invoke("auth:get-session"),
    setSession: (session) => ipcRenderer.invoke("auth:set-session", session),
    clearSession: () => ipcRenderer.invoke("auth:clear-session")
  },
  openExternalLogin: (nextPath) => ipcRenderer.invoke("auth:open-external-login", nextPath),
  onAuthCompleted: (handler) => {
    const listener = (_event, session) => handler(session);
    ipcRenderer.on("auth:completed", listener);
    return () => {
      ipcRenderer.removeListener("auth:completed", listener);
    };
  }
});
