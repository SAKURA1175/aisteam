"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BallPit } from "./ballpit/Ballpit3D";
import { LottieMascot } from "./mascot/LottieMascot";
import { getWechatQrConfig, login, register } from "../lib/api";
import { useAuth } from "../lib/auth";

type Mode = "login" | "register" | "wechat";

type WeChatLoginWindow = Window & {
  WxLogin?: new (options: {
    self_redirect?: boolean;
    id: string;
    appid: string;
    scope: string;
    redirect_uri: string;
    state: string;
    style?: string;
    href?: string;
  }) => unknown;
};

const WECHAT_QR_CONTAINER_ID = "wechat-login-qrcode";

export function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { initialized, session, setSession } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("student@tutormarket.ai");
  const [password, setPassword] = useState("Student123!");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [wechatLoading, setWechatLoading] = useState(false);
  const [wechatError, setWechatError] = useState<string | null>(null);
  const [wechatConfig, setWechatConfig] = useState<Awaited<ReturnType<typeof getWechatQrConfig>> | null>(null);
  const [wechatScriptReady, setWechatScriptReady] = useState(false);
  const nextPath = useMemo(() => searchParams.get("next") || "/chat", [searchParams]);

  useEffect(() => {
    if (initialized && session) {
      router.replace(nextPath);
    }
  }, [initialized, nextPath, router, session]);

  useEffect(() => {
    if (mode !== "wechat") {
      return;
    }

    let active = true;
    setWechatLoading(true);
    setWechatError(null);

    void getWechatQrConfig(nextPath)
      .then((response) => {
        if (!active) {
          return;
        }
        setWechatConfig(response);
        setWechatError(null);
      })
      .catch((fetchError) => {
        if (!active) {
          return;
        }
        setWechatConfig(null);
        setWechatError(fetchError instanceof Error ? fetchError.message : "微信二维码加载失败");
      })
      .finally(() => {
        if (active) {
          setWechatLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [mode, nextPath]);

  useEffect(() => {
    if (mode !== "wechat" || !wechatConfig || !wechatScriptReady || typeof window === "undefined") {
      return;
    }

    const win = window as WeChatLoginWindow;
    if (typeof win.WxLogin !== "function") {
      setWechatError("微信扫码脚本加载失败，请刷新后重试");
      return;
    }

    const container = document.getElementById(WECHAT_QR_CONTAINER_ID);
    if (!container) {
      return;
    }

    container.innerHTML = "";
    try {
      new win.WxLogin({
        self_redirect: false,
        id: WECHAT_QR_CONTAINER_ID,
        appid: wechatConfig.appId,
        scope: wechatConfig.scope,
        redirect_uri: encodeURIComponent(wechatConfig.redirectUri),
        state: wechatConfig.state,
        style: "black"
      });
    } catch (scriptError) {
      setWechatError(scriptError instanceof Error ? scriptError.message : "微信二维码初始化失败");
    }
  }, [mode, wechatConfig, wechatScriptReady]);

  if (initialized && session) {
    return (
      <main className="duo-landing relative min-h-screen w-full overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <BallPit
            count={150}
            gravity={0.8}
            friction={0.9975}
            wallBounce={0.95}
            followCursor={true}
            colors={[0xff6b9d, 0xffa500, 0xffd93d, 0x6bcf7f, 0x4ecdc4, 0x45b7d1, 0xa78bfa, 0xf472b6, 0xfb923c, 0xfbbf24]}
          />
        </div>
        <div className="z-10 bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-xl border-4 border-white text-center max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold text-[#58cc02] mb-4">正在进入陪伴舱...</h2>
          <p className="text-gray-600">检测到当前浏览器已有有效会话，即将跳转到工作台。</p>
        </div>
      </main>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "wechat") {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const authResponse =
        mode === "login"
          ? await login(email.trim(), password)
          : await register(email.trim(), password, displayName.trim());

      setSession(authResponse);
      router.push(nextPath);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "认证失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="duo-landing relative min-h-screen w-full overflow-hidden flex items-center justify-center m-0 p-0">
      {mode === "wechat" ? (
        <Script
          src="https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js"
          strategy="afterInteractive"
          onLoad={() => setWechatScriptReady(true)}
          onError={() => setWechatError("微信扫码脚本加载失败，请检查网络后重试")}
        />
      ) : null}

      <div className="absolute inset-0 z-0">
        <BallPit
          count={200}
          gravity={0.5}
          friction={0.99}
          wallBounce={0.8}
          followCursor={true}
          colors={[0xff6b9d, 0xffa500, 0xffd93d, 0x6bcf7f, 0x4ecdc4, 0x45b7d1, 0xa78bfa, 0xf472b6, 0xfb923c, 0xfbbf24]}
        />
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" />
      </div>

      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 md:px-8 bg-gradient-to-b from-white/80 to-transparent">
        <Link href="/" className="flex items-center gap-2 no-underline hover:scale-105 transition-transform">
          <div
            className="text-[#5fd801] font-black text-4xl"
            style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif', textShadow: "0 2px 4px rgba(95, 216, 1, 0.2)", lineHeight: 1 }}
          >
            蛋
          </div>
          <div
            className="text-[#5fd801] font-black text-2xl tracking-wide pt-1"
            style={{ fontFamily: '"ZCOOL KuaiLe", "Nunito", sans-serif', textShadow: "0 2px 4px rgba(95, 216, 1, 0.2)", lineHeight: 1 }}
          >
            蛋壳伴学
          </div>
        </Link>
      </header>

      <div className="z-10 w-full max-w-md px-4 mt-12 relative">
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 pointer-events-none transition-transform duration-300 ease-out z-20"
          style={{
            transform: isPasswordFocused ? "translate(-50%, 10px) scale(0.95)" : "translate(-50%, 0) scale(1)",
            filter: isPasswordFocused ? "brightness(0.9) saturate(1.2)" : "none"
          }}
        >
          <LottieMascot src="/lottie/chick-hatching.json" fallback="🐣" className="w-full h-full drop-shadow-xl" />
        </div>

        <div
          className="bg-white/95 backdrop-blur-xl rounded-[2rem] p-8 pt-16 shadow-[0_20px_60px_rgba(0,0,0,0.1),0_0_0_6px_rgba(255,255,255,0.6)] border-2 border-[#e5e5e5] relative overflow-hidden transition-all duration-500"
          style={{
            boxShadow: isPasswordFocused
              ? "0 20px 60px rgba(95, 216, 1, 0.2), 0 0 0 6px rgba(255,255,255,0.8)"
              : "0 20px 60px rgba(0,0,0,0.1), 0 0 0 6px rgba(255,255,255,0.6)",
            borderColor: isPasswordFocused ? "#5fd801" : "#e5e5e5"
          }}
        >
          <div className="flex bg-[#f7f7f7] rounded-full p-1.5 mb-8 border border-[#e5e5e5]">
            <button
              className={`flex-1 py-2.5 px-4 rounded-full font-bold text-sm transition-all ${mode === "login" ? "bg-white text-[#58cc02] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              type="button"
              onClick={() => setMode("login")}
            >
              家长登录
            </button>
            <button
              className={`flex-1 py-2.5 px-4 rounded-full font-bold text-sm transition-all ${mode === "register" ? "bg-white text-[#58cc02] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              type="button"
              onClick={() => setMode("register")}
            >
              注册体验
            </button>
            <button
              className={`flex-1 py-2.5 px-4 rounded-full font-bold text-sm transition-all ${mode === "wechat" ? "bg-white text-[#58cc02] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              type="button"
              onClick={() => setMode("wechat")}
            >
              微信登录
            </button>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-gray-800 mb-2 font-['Nunito',sans-serif]">
              {mode === "login" ? "欢迎回来！" : mode === "wechat" ? "微信扫码登录" : "创建家庭账号"}
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              {mode === "login"
                ? "准备好开启今天的奇妙探索了吗？"
                : mode === "wechat"
                  ? "使用微信 App 扫码确认后，浏览器会自动回到陪伴舱。"
                  : "注册后即可拥有专属的 AI 学习伙伴。"}
            </p>
          </div>

          {mode === "wechat" ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5 items-center justify-center py-2">
                <div className="w-full rounded-[1.75rem] border-2 border-[#e5e5e5] bg-[#f7f7f7] px-5 py-6 flex flex-col items-center gap-4">
                  <div className="text-center">
                    <div className="text-sm font-bold text-[#07c160]">微信官方二维码</div>
                    <p className="text-xs text-gray-500 mt-1">扫码后会跳转到微信确认，再回到当前站点完成登录。</p>
                  </div>

                  <div
                    id={WECHAT_QR_CONTAINER_ID}
                    className="min-h-[280px] w-full flex items-center justify-center rounded-[1.5rem] bg-white border border-dashed border-[#d6d6d6] overflow-hidden"
                  >
                    {wechatLoading ? <span className="text-sm font-bold text-gray-500">正在生成二维码...</span> : null}
                    {!wechatLoading && !wechatError && !wechatScriptReady ? (
                      <span className="text-sm font-bold text-gray-500">正在加载微信扫码组件...</span>
                    ) : null}
                  </div>

                  <div className="w-full rounded-2xl bg-white/80 border border-[#ececec] px-4 py-3 text-xs text-gray-500 leading-6">
                    <div>1. 打开微信扫一扫</div>
                    <div>2. 在微信里确认授权</div>
                    <div>3. 浏览器会自动回到 {nextPath}</div>
                  </div>
                </div>
              </div>

              {wechatError ? (
                <div className="bg-[#ffdfe0] border-2 border-[#ff4b4b] text-[#ea2b2b] p-3 rounded-xl text-sm font-bold flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <span>{wechatError}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              {mode === "register" ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700 ml-1">怎么称呼你？</label>
                  <input
                    className="w-full bg-[#f7f7f7] border-2 border-[#e5e5e5] rounded-2xl px-4 py-3.5 text-base font-semibold text-gray-800 outline-none transition-all focus:bg-white focus:border-[#1cb0f6] focus:shadow-[0_4px_0_#1899d6] hover:bg-[#f0f0f0]"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="例如：小明妈妈"
                    required
                  />
                </div>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-700 ml-1">邮箱账号</label>
                <input
                  className="w-full bg-[#f7f7f7] border-2 border-[#e5e5e5] rounded-2xl px-4 py-3.5 text-base font-semibold text-gray-800 outline-none transition-all focus:bg-white focus:border-[#1cb0f6] focus:shadow-[0_4px_0_#1899d6] hover:bg-[#f0f0f0]"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-700 ml-1">魔法暗号</label>
                <input
                  className="w-full bg-[#f7f7f7] border-2 border-[#e5e5e5] rounded-2xl px-4 py-3.5 text-base font-semibold text-gray-800 outline-none transition-all focus:bg-white focus:border-[#58cc02] focus:shadow-[0_4px_0_#58a700] hover:bg-[#f0f0f0]"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  placeholder="输入你的密码..."
                  required
                />
              </div>

              {error ? (
                <div className="bg-[#ffdfe0] border-2 border-[#ff4b4b] text-[#ea2b2b] p-3 rounded-xl text-sm font-bold flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <span>{error}</span>
                </div>
              ) : null}

              <button className="duo-btn duo-btn--primary w-full py-4 text-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed" disabled={submitting} type="submit">
                {submitting ? "魔法加载中..." : mode === "login" ? "进入陪伴舱" : "注册并开启探索"}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-100 flex justify-between items-center text-sm font-bold text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              连接安全加密
            </div>
            <Link href="/" className="hover:text-[#1cb0f6] transition-colors">
              返回首页
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
