"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { HatchingChick } from "./mascot/HatchingChick";
import { SiteHeader } from "./site-header";
import { login, register } from "../lib/api";
import { useAuth } from "../lib/auth";

type Mode = "login" | "register";

const benefitList = [
  "登录后即可进入真实陪伴工作台，直接调用后端认证接口。",
  "同一个伙伴下的会话、资料和长期记忆都会自动延续。",
  "仓库已经预置演示账号，也支持现场注册新的家庭账号。"
];

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
  const nextPath = useMemo(() => searchParams.get("next") || "/chat", [searchParams]);

  useEffect(() => {
    if (initialized && session) {
      router.replace(nextPath);
    }
  }, [initialized, nextPath, router, session]);

  if (initialized && session) {
    return (
      <main className="public-page">
        <div className="page-shell">
          <SiteHeader />
          <div className="status-panel">
            <strong>正在进入陪伴舱...</strong>
            <p>检测到当前浏览器已有有效会话，即将跳转到登录后的工作台。</p>
          </div>
        </div>
      </main>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    <main className="public-page">
      <div className="page-shell">
        <SiteHeader />

        <section className="auth-layout">
          <div className="auth-copy-card">
            <span className="eyebrow">Family Access</span>
            <h1>让家长先进入，再把孩子的学习上下文接起来。</h1>
            <p>
              这里仍然沿用当前邮箱登录与注册接口，但视觉和文案已经切到蛋壳伴学。登录后会进入新版陪伴工作台。
            </p>

            <div className="auth-copy-card__visual">
              <div className="auth-copy-card__mascot">
                <HatchingChick />
              </div>
              <div className="auth-copy-card__badge">真实后端认证 · 浏览器会话恢复</div>
            </div>

            <ul className="bullet-list">
              {benefitList.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>

            <div className="credential-card">
              <strong>演示账号</strong>
              <p>家庭账号：student@tutormarket.ai / Student123!</p>
              <p>运营账号：admin@tutormarket.ai / Admin123!</p>
            </div>
          </div>

          <div className="auth-form-card">
            <div className="segmented-control">
              <button
                className={`segmented-control__item${mode === "login" ? " segmented-control__item--active" : ""}`}
                type="button"
                onClick={() => setMode("login")}
              >
                家长登录
              </button>
              <button
                className={`segmented-control__item${mode === "register" ? " segmented-control__item--active" : ""}`}
                type="button"
                onClick={() => setMode("register")}
              >
                注册体验
              </button>
            </div>

            <div className="auth-form-card__heading">
              <strong>{mode === "login" ? "欢迎回来" : "创建新的家庭账号"}</strong>
              <p>{mode === "login" ? "登录后直接进入孩子当前的陪伴工作台。" : "注册完成后会自动创建账号并进入工作台。"}</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {mode === "register" ? (
                <label className="form-field">
                  <span>家长称呼</span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="例如：Lenovo 家长"
                    required
                  />
                </label>
              ) : null}

              <label className="form-field">
                <span>邮箱</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </label>

              <label className="form-field">
                <span>密码</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="请输入密码"
                  required
                />
              </label>

              {error ? (
                <div className="status-panel status-panel--error">
                  <strong>认证失败</strong>
                  <p>{error}</p>
                </div>
              ) : null}

              <button className="button button--primary button--full" disabled={submitting} type="submit">
                {submitting ? "提交中..." : mode === "login" ? "进入陪伴舱" : "注册并进入"}
              </button>
            </form>

            <div className="auth-form-card__footer">
              <span>会话凭证仍保存在当前浏览器，刷新后会自动恢复。</span>
              <Link href="/">返回首页</Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
