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
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          color: "#5fd801",
          fontWeight: "900", 
          fontSize: "2.6rem",
          fontFamily: '"ZCOOL KuaiLe", sans-serif',
          textShadow: "0 2px 4px rgba(95, 216, 1, 0.2)",
          lineHeight: 1
        }}>
          蛋
        </div>
        <div style={{ 
          fontSize: "1.8rem", 
          fontWeight: "900", 
          color: "#5fd801",
          letterSpacing: "0.02em",
          fontFamily: '"ZCOOL KuaiLe", "Nunito", sans-serif',
          textShadow: "0 2px 4px rgba(95, 216, 1, 0.2)",
          lineHeight: 1,
          paddingTop: "0.2rem"
        }}>
          蛋壳伴学
        </div>
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
            <Link className="button button--primary" style={{ background: "linear-gradient(135deg, #74d61c 0%, #5bb800 100%)", border: "none", color: "white" }} href="/chat">
              进入陪伴舱
            </Link>
          </>
        ) : (
          <>
            <Link className="button button--ghost" href="/teachers">
              看看伙伴
            </Link>
            <Link className="button button--primary" style={{ background: "linear-gradient(135deg, #74d61c 0%, #5bb800 100%)", border: "none", color: "white" }} href="/login">
              家长登录
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
