"use client";

import type { TeacherSummary } from "@tutormarket/types";
import Link from "next/link";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { useEffect, useState, useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { LottieMascot } from "@/components/mascot/LottieMascot";
import { BallPit } from "@/components/ballpit/Ballpit3D";
import FallingText from "@/components/falling-text/FallingText";
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
  className = ""
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <Link className={`duo-btn duo-btn--${variant} ${className}`.trim()} href={href}>
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
      <header className="duo-header">
        <Link href="/" className="duo-brand">
          <div className="duo-brand__egg">蛋</div>
          <div className="duo-brand__text">蛋壳伴学</div>
        </Link>
        <LandingButton href="/chat" variant="primary">
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
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, pointerEvents: "none" }}>
          <FallingText
            text="童趣 与 陪伴 如此简单"
            highlightWords={["童趣", "陪伴"]}
            trigger="click"
            backgroundColor="transparent"
            wireframes={false}
            gravity={0.56}
            fontSize="4rem"
            mouseConstraintStiffness={0.9}
          />
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
