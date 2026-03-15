"use client";

import type { AuthResponse } from "@tutormarket/types";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getMe } from "./api";
import { getDesktopBridge } from "./desktop";

const STORAGE_KEY = "eggshell.session";
const LEGACY_STORAGE_KEY = "tutormarket.session";

type SessionState = AuthResponse | null;

type AuthContextValue = {
  session: SessionState;
  token: string | null;
  initialized: boolean;
  setSession: (session: SessionState) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readBrowserStoredSession() {
  if (typeof window === "undefined") {
    return null as SessionState;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!stored) {
    return null as SessionState;
  }

  try {
    const parsed = JSON.parse(stored) as SessionState;
    if (!parsed?.accessToken) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      return null as SessionState;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    return null as SessionState;
  }
}

async function readStoredSession() {
  const desktopBridge = getDesktopBridge();
  if (desktopBridge) {
    try {
      return await desktopBridge.auth.getSession();
    } catch {
      return null as SessionState;
    }
  }

  return readBrowserStoredSession();
}

async function persistStoredSession(session: SessionState) {
  const desktopBridge = getDesktopBridge();
  if (desktopBridge) {
    if (session) {
      await desktopBridge.auth.setSession(session);
    } else {
      await desktopBridge.auth.clearSession();
    }
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  if (session) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState({
    initialized: false,
    session: null as SessionState
  });
  const authEventVersionRef = useRef(0);

  const { initialized, session } = authState;

  useEffect(() => {
    let active = true;
    const desktopBridge = getDesktopBridge();
    const unsubscribe = desktopBridge?.onAuthCompleted((nextSession) => {
      authEventVersionRef.current += 1;
      if (!active) {
        return;
      }

      setAuthState({
        initialized: true,
        session: nextSession
      });
      void persistStoredSession(nextSession);
    });

    const bootstrapVersion = authEventVersionRef.current;

    void readStoredSession()
      .then((bootstrapSession) => {
        if (!active || authEventVersionRef.current !== bootstrapVersion) {
          return null;
        }

        if (!bootstrapSession?.accessToken) {
          setAuthState({
            initialized: true,
            session: null
          });
          return null;
        }

        return getMe(bootstrapSession.accessToken)
          .then((user) => {
            if (!active || authEventVersionRef.current !== bootstrapVersion) {
              return;
            }

            const next = { accessToken: bootstrapSession.accessToken, user };
            setAuthState({
              initialized: true,
              session: next
            });
            void persistStoredSession(next);
          })
          .catch(() => {
            if (!active || authEventVersionRef.current !== bootstrapVersion) {
              return;
            }

            setAuthState({
              initialized: true,
              session: null
            });
            void persistStoredSession(null);
          });
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setAuthState({
          initialized: true,
          session: null
        });
      });

    return () => {
      active = false;
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      token: session?.accessToken ?? null,
      initialized,
      setSession: (next) => {
        authEventVersionRef.current += 1;
        setAuthState({
          initialized: true,
          session: next
        });
        void persistStoredSession(next);
      },
      logout: () => {
        authEventVersionRef.current += 1;
        setAuthState({
          initialized: true,
          session: null
        });
        void persistStoredSession(null);
      }
    }),
    [initialized, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
