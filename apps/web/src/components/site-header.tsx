"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";

const links = [
  { href: "/", label: "首页" },
  { href: "/teachers", label: "伙伴选择" }
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { initialized, session, logout } = useAuth();

  return (
    <header className="site-header">
      <Link className="brand-lockup" href="/">
        <span className="brand-lockup__symbol">蛋</span>
        <span className="brand-lockup__copy">
          <strong>蛋壳伴学</strong>
          <span>温柔、会记得孩子的 AI 陪伴伙伴</span>
        </span>
      </Link>
      <nav className="site-nav" aria-label="Primary">
        {links.map((link) => (
          <Link key={link.href} data-active={pathname === link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="site-actions">
        {initialized && session ? (
          <>
            <div className="site-user">
              <strong>{session.user.displayName}</strong>
              <span>{session.user.role === "ADMIN" ? "运营工作台" : "家庭陪伴模式"}</span>
            </div>
            <button
              className="button button--ghost"
              type="button"
              onClick={() => {
                logout();
                router.push("/login");
              }}
            >
              退出
            </button>
            <Link className="button button--primary" href="/chat">
              进入陪伴舱
            </Link>
          </>
        ) : (
          <>
            <Link className="button button--ghost" href="/teachers">
              看看伙伴
            </Link>
            <Link className="button button--primary" href="/login">
              家长登录
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
