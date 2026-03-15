"use client";

import type { AuthResponse } from "@tutormarket/types";

type DesktopAuthBridge = {
  getSession: () => Promise<AuthResponse | null>;
  setSession: (session: AuthResponse) => Promise<void>;
  clearSession: () => Promise<void>;
};

type DesktopBridge = {
  auth: DesktopAuthBridge;
  openExternalLogin: (nextPath?: string) => Promise<void>;
  onAuthCompleted: (handler: (session: AuthResponse) => void) => (() => void) | void;
};

export function getDesktopBridge(): DesktopBridge | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.eggshellDesktop ?? null;
}

export function isDesktopApp() {
  return Boolean(getDesktopBridge());
}
