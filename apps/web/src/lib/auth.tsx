"use client";

import type { AuthResponse } from "@tutormarket/types";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getMe } from "./api";

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

function readStoredSession() {
  if (typeof window === "undefined") {
    return {
      initialized: false,
      session: null as SessionState
    };
  }

  const stored = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!stored) {
    return {
      initialized: true,
      session: null as SessionState
    };
  }

  try {
    const parsed = JSON.parse(stored) as SessionState;
    if (!parsed?.accessToken) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      return {
        initialized: true,
        session: null as SessionState
      };
    }

    return {
      initialized: false,
      session: parsed
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    return {
      initialized: true,
      session: null as SessionState
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState(readStoredSession);
  const bootstrapSessionRef = useRef(authState.session);

  const { initialized, session } = authState;

  useEffect(() => {
    const bootstrapSession = bootstrapSessionRef.current;
    if (!bootstrapSession?.accessToken) {
      return;
    }

    let active = true;

    void getMe(bootstrapSession.accessToken)
      .then((user) => {
        if (!active) {
          return;
        }

        const next = { accessToken: bootstrapSession.accessToken, user };
        setAuthState({
          initialized: true,
          session: next
        });
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        setAuthState({
          initialized: true,
          session: null
        });
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      token: session?.accessToken ?? null,
      initialized,
      setSession: (next) => {
        setAuthState({
          initialized: true,
          session: next
        });
        if (next) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
          window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      },
      logout: () => {
        setAuthState({
          initialized: true,
          session: null
        });
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
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
