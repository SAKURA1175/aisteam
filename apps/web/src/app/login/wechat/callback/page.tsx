"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeWechatLogin } from "../../../../lib/api";
import { useAuth } from "../../../../lib/auth";

function WechatCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const code = useMemo(() => searchParams.get("code"), [searchParams]);
  const state = useMemo(() => searchParams.get("state"), [searchParams]);
  const deniedReason = useMemo(() => searchParams.get("errmsg"), [searchParams]);
  const initialError = useMemo(() => {
    if (deniedReason) {
      return `微信授权失败: ${deniedReason}`;
    }
    if (!code || !state) {
      return "缺少微信授权参数，请返回登录页重新扫码。";
    }
    return null;
  }, [code, deniedReason, state]);

  useEffect(() => {
    if (initialError) {
      return;
    }

    let active = true;

    void exchangeWechatLogin({ code: code!, state: state! })
      .then((response) => {
        if (!active) {
          return;
        }
        setSession({ accessToken: response.accessToken, user: response.user });
        router.replace(response.nextPath || "/chat");
      })
      .catch((exchangeError) => {
        if (!active) {
          return;
        }
        setError(exchangeError instanceof Error ? exchangeError.message : "微信登录失败");
      });

    return () => {
      active = false;
    };
  }, [code, initialError, router, setSession, state]);

  return (
    <main className="public-page">
      <div className="page-shell">
        <div className={`status-panel${error || initialError ? " status-panel--error" : ""}`}>
          <strong>{error || initialError ? "微信登录失败" : "正在完成微信授权..."}</strong>
          <p>{error ?? initialError ?? "已拿到微信回调参数，正在换取登录凭证并进入陪伴舱。"}</p>
        </div>
      </div>
    </main>
  );
}

export default function WechatCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="public-page">
          <div className="page-shell">
            <div className="status-panel">
              <strong>正在处理微信回调...</strong>
            </div>
          </div>
        </main>
      }
    >
      <WechatCallbackContent />
    </Suspense>
  );
}
