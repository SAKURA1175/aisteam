"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { mintDesktopAuthCode } from "../../../../lib/api";
import { useAuth } from "../../../../lib/auth";

const DESKTOP_CALLBACK_SCHEME = "eggshell://auth/callback";

function buildRetryPath(nextPath: string) {
  return `/login?next=${encodeURIComponent(`/desktop/auth/complete?next=${encodeURIComponent(nextPath)}`)}`;
}

function DesktopAuthCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { initialized, session, token } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [manualLink, setManualLink] = useState<string | null>(null);
  const nextPath = useMemo(() => searchParams.get("next") || "/chat", [searchParams]);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    if (!session || !token) {
      router.replace(buildRetryPath(nextPath));
      return;
    }

    let active = true;

    void mintDesktopAuthCode(token)
      .then((response) => {
        if (!active) {
          return;
        }

        const deepLink = `${DESKTOP_CALLBACK_SCHEME}?code=${encodeURIComponent(response.code)}`;
        setManualLink(deepLink);
        window.location.replace(deepLink);
      })
      .catch((mintError) => {
        if (!active) {
          return;
        }

        setError(mintError instanceof Error ? mintError.message : "桌面登录授权码生成失败");
      });

    return () => {
      active = false;
    };
  }, [initialized, nextPath, router, session, token]);

  return (
    <main className="public-page">
      <div className="page-shell">
        <div className={`status-panel${error ? " status-panel--error" : ""}`}>
          <strong>{error ? "返回桌面失败" : "正在返回桌面应用..."}</strong>
          <p>
            {error
              ? error
              : "浏览器已完成登录，正在生成一次性桌面授权码，并尝试自动唤起 Windows 应用。"}
          </p>
          {manualLink ? (
            <p>
              如果桌面应用没有自动拉起，可以直接
              {" "}
              <a href={manualLink}>点击这里返回桌面端</a>
              。
            </p>
          ) : null}
          {error ? (
            <p>
              <Link href={buildRetryPath(nextPath)}>重新登录并再次尝试</Link>
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export default function DesktopAuthCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="public-page">
          <div className="page-shell">
            <div className="status-panel">
              <strong>正在准备返回桌面应用...</strong>
            </div>
          </div>
        </main>
      }
    >
      <DesktopAuthCompleteContent />
    </Suspense>
  );
}
