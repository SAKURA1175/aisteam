"use client";

import type { TeacherSummary } from "@tutormarket/types";
import Link from "next/link";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { useEffect, useState, useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { LottieMascot } from "@/components/mascot/LottieMascot";
import { BallPit } from "@/components/ballpit/Ballpit3D";
import RotatingText from "@/components/rotating-text/RotatingText";
import { getTeachers } from "@/lib/api";
import { getCompanionIdentity } from "@/lib/companion-identity";
import { getTeacherBranding } from "@/lib/teacher-branding";

type CompanionCardViewModel = {
  id: string;
  teacherId: string;
  name: string;
  headline: string;
  badge: string;
  quote: string;
  hoverQuote: string;
  accent: string;
  surface: string;
  animationPath: string;
  ctaHref: string;
  glyph: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; fill?: string; className?: string }>;
};

function mapTeachersToCompanions(teachers: TeacherSummary[]): CompanionCardViewModel[] {
  return teachers.slice(0, 3).map((teacher, index) => {
    const branding = getTeacherBranding(teacher, index);
    const identity = getCompanionIdentity(teacher.slug);

    return {
      id: teacher.id,
      teacherId: teacher.id,
      name: identity.displayName,
      headline: identity.subtitle,
      badge: identity.badge,
      quote: identity.quote,
      hoverQuote: identity.hoverQuote,
      accent: branding.accent,
      surface: branding.surface,
      animationPath: identity.animationPath,
      glyph: identity.glyph,
      ctaHref: `/chat?teacherId=${teacher.id}`,
      icon: identity.icon
    };
  });
}

function LandingButton({
  href,
  children,
  variant = "primary",
  className = "",
  style
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Link className={`duo-btn duo-btn--${variant} ${className}`.trim()} href={href} style={style}>
      {children}
    </Link>
  );
}

function CompanionCard({
  companion,
  active,
  onEnter
}: {
  companion: CompanionCardViewModel;
  active: boolean;
  onEnter: () => void;
}) {
  return (
    <article
      className="duo-card"
      style={
        {
          borderColor: active ? "#1cb0f6" : "#e5e5e5",
          backgroundColor: active ? "#ddf4ff" : "#ffffff",
          transform: active ? "translateY(-4px)" : "none",
          boxShadow: active ? "0 6px 0 #1899d6" : "none"
        } as CSSProperties
      }
      onMouseEnter={onEnter}
    >
      <div className="duo-card__mascot">
        <LottieMascot className="companion-card__animation" fallback={companion.glyph} src={companion.animationPath} />
      </div>

      <div className="duo-card__name">
        {companion.name}
      </div>
      
      <div className="duo-card__desc">
        {companion.headline}
      </div>

      <LandingButton href={companion.ctaHref} variant="secondary">
        选择我进入陪伴舱
      </LandingButton>
    </article>
  );
}

export default function LandingPageClient() {
  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    void getTeachers()
      .then((response) => {
        setTeachers(response);
        setError(null);
      })
      .catch((fetchError: Error) => {
        setError(fetchError.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const companions = useMemo(() => mapTeachersToCompanions(teachers), [teachers]);
  const activeHoverId = hoveredId ?? companions[0]?.id ?? null;

  return (
    <div className="duo-landing">
      <header style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        padding: "1rem 2rem", 
        position: "absolute", 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 50,
        background: "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%)"
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            color: "#5fd801", // Match the vibrant green of the button
            fontWeight: "900", 
            fontSize: "2.6rem", // Make it slightly larger like an icon
            fontFamily: '"ZCOOL KuaiLe", sans-serif',
            textShadow: "0 2px 4px rgba(95, 216, 1, 0.2)",
            lineHeight: 1
          }}>
            蛋
          </div>
          <div style={{ 
            fontSize: "1.8rem", 
            fontWeight: "900", 
            color: "#5fd801", // Match the vibrant green
            letterSpacing: "0.02em",
            fontFamily: '"ZCOOL KuaiLe", "Nunito", sans-serif',
            textShadow: "0 2px 4px rgba(95, 216, 1, 0.2)",
            lineHeight: 1,
            paddingTop: "0.2rem" // Visual alignment
          }}>
            蛋壳伴学
          </div>
        </Link>
        <LandingButton href="/chat" variant="primary" className="!rounded-[1.2rem] !px-5 !py-1.5 !font-bold hover:!scale-105 transition-transform" style={{ background: "#5fd801", border: "none", color: "white", fontSize: "1.2rem", fontFamily: '"ZCOOL KuaiLe", "Nunito", sans-serif', boxShadow: "0 4px 12px rgba(95, 216, 1, 0.4)", textShadow: "0 1px 2px rgba(0,0,0,0.1)", letterSpacing: "0.05em" }}>
          进入陪伴舱
        </LandingButton>
      </header>

      <section style={{ position: "relative", height: "100vh", width: "100%", overflow: "hidden", margin: 0, padding: 0 }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
          <BallPit
            count={250}
            gravity={0.8}
            friction={0.9975}
            wallBounce={0.95}
            followCursor={true}
            colors={[0xff6b9d, 0xffa500, 0xffd93d, 0x6bcf7f, 0x4ecdc4, 0x45b7d1, 0xa78bfa, 0xf472b6, 0xfb923c, 0xfbbf24]}
          />
        </div>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "row", fontSize: "4rem", fontWeight: "900", color: "var(--ink-strong)", fontFamily: '"ZCOOL KuaiLe", "Comic Sans MS", "Nunito", "Quicksand", "PingFang SC", "HarmonyOS Sans SC", sans-serif', letterSpacing: "0.02em", gap: "1.2rem" }}>
            <span style={{ textShadow: "0 4px 16px rgba(255,255,255,0.9)" }}>这里有</span>
            <RotatingText
              texts={['童趣', '陪伴', '一切想要的东西']}
              mainClassName="px-10 bg-gradient-to-r from-[#ff8754] to-[#ffb347] text-white overflow-hidden py-3 justify-center rounded-[3rem] shadow-[0_16px_40px_rgba(232,115,74,0.4)] border-[6px] border-white/90"
              initial={{ y: "100%", opacity: 0, filter: "blur(4px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              exit={{ y: "-100%", opacity: 0, filter: "blur(4px)" }}
              splitBy="lines"
              staggerDuration={0}
              elementLevelClassName="whitespace-nowrap flex items-center h-full"
              transition={{ ease: [0.25, 1, 0.5, 1], duration: 0.8 }}
              rotationInterval={2800}
              animatePresenceMode="popLayout"
            />
          </div>
          
          <div style={{ textAlign: "center", maxWidth: "800px", padding: "0 20px" }}>
            <p style={{ 
              fontSize: "1.25rem", 
              color: "var(--ink-soft)", 
              lineHeight: 1.6, 
              margin: 0,
              textShadow: "0 2px 10px rgba(255,255,255,0.8)",
              fontWeight: 500
            }}>
              专为儿童打造的 AI 互动伴学平台。通过多角色智能体，提供全天候的语音聊天、知识答疑与情绪陪伴，让孩子在安全的环境中快乐探索世界。
            </p>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", pointerEvents: "auto" }}>
            <LandingButton href="/chat" variant="primary" className="!px-8 !py-4 !text-lg !rounded-full shadow-lg hover:scale-105 transition-transform">
              免费体验陪伴舱
            </LandingButton>
            <LandingButton href="#companions" variant="secondary" className="!px-8 !py-4 !text-lg !rounded-full bg-white/80 backdrop-blur-sm border-2 border-white hover:bg-white transition-colors text-[var(--ink-strong)]">
              浏览全部伙伴 ↓
            </LandingButton>
          </div>
        </div>
      </section>

      <section id="companions" className="duo-companions" onMouseLeave={() => setHoveredId(null)}>
        <div className="duo-container">
          <h2 className="duo-section-title">选一个喜欢的伙伴开启探索吧！</h2>
          
          {error ? (
            <div style={{ textAlign: "center", color: "red", marginBottom: "24px" }}>
              伙伴列表暂时不可用: {error}
            </div>
          ) : null}

          <div className="duo-grid">
            {(loading ? [0, 1, 2] : companions).map((item) =>
              typeof item === "number" ? (
                <div key={item} className="duo-card" style={{ opacity: 0.5 }}>
                  <div className="duo-card__mascot" style={{ background: "#f0f0f0", borderRadius: "50%" }}></div>
                  <div style={{ width: "60%", height: "24px", background: "#f0f0f0", marginBottom: "8px", borderRadius: "12px" }}></div>
                  <div style={{ width: "80%", height: "16px", background: "#f0f0f0", marginBottom: "16px", borderRadius: "8px" }}></div>
                  <div style={{ width: "100%", height: "40px", background: "#f0f0f0", borderRadius: "16px" }}></div>
                </div>
              ) : (
                <CompanionCard
                  key={item.id}
                  active={activeHoverId === item.id}
                  companion={item}
                  onEnter={() => setHoveredId(item.id)}
                />
              )
            )}
          </div>
        </div>
      </section>

      <section className="duo-safety">
        <div className="duo-container">
          <div className="duo-safety__inner">
            <div className="duo-safety__icon">
              <ShieldCheck size={80} strokeWidth={2} />
            </div>
            <div className="duo-safety__text">
              <h2>多重守护，家长无忧</h2>
              <p>我们采用专为儿童设计的 AI 过滤引擎，屏蔽所有不适内容。<br/>同时支持内容适龄化与屏幕时间管理，让每一次陪伴都充满正能量与好奇心。</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
