import type { AuthResponse } from "@tutormarket/types";

declare global {
  interface Window {
    eggshellDesktop?: {
      auth: {
        getSession: () => Promise<AuthResponse | null>;
        setSession: (session: AuthResponse) => Promise<void>;
        clearSession: () => Promise<void>;
      };
      openExternalLogin: (nextPath?: string) => Promise<void>;
      onAuthCompleted: (handler: (session: AuthResponse) => void) => (() => void) | void;
    };
  }
}

export {};
