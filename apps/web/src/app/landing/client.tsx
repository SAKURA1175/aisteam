"use client";

import type { TeacherSummary } from "@tutormarket/types";
import Link from "next/link";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Heart, ShieldCheck, Sparkles, Sun } from "lucide-react";
import { LottieMascot } from "@/components/mascot/LottieMascot";
import { useAuth } from "@/lib/auth";
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
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  return (
    <Link className={`landing-button landing-button--${variant} ${className}`.trim()} href={href}>
      {children}
    </Link>
  );
}

function CompanionCard({
  companion,
  dimmed,
  active,
  onEnter
}: {
  companion: CompanionCardViewModel;
  dimmed: boolean;
  active: boolean;
  onEnter: () => void;
}) {
  const Icon = companion.icon;

  return (
    <article
      className={`companion-card${active ? " companion-card--active" : ""}${dimmed ? " companion-card--dimmed" : ""}`}
      style={
        {
          "--companion-accent": companion.accent,
          "--companion-surface": companion.surface
        } as CSSProperties
      }
      onMouseEnter={onEnter}
    >
      <div className={`companion-card__bubble${active ? " companion-card__bubble--visible" : ""}`}>
        <span>{active ? companion.hoverQuote : companion.quote}</span>
      </div>

      <div className="companion-card__shell">
        <div className="companion-card__mascot">
          <LottieMascot className="companion-card__animation" fallback={companion.glyph} src={companion.animationPath} />
        </div>

        <div className="companion-card__copy">
          <strong>{companion.name}</strong>
          <p>{companion.headline}</p>
          <div className="companion-card__badge">
            <Icon size={18} strokeWidth={2.4} />
            <span>{companion.badge}</span>
          </div>
        </div>

        <LandingButton className="companion-card__cta" href={companion.ctaHref} variant="ghost">
          选择我进入陪伴舱
        </LandingButton>
      </div>
    </article>
  );
}

export default function LandingPageClient() {
  const { initialized, session } = useAuth();
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
    <main className="landing-carnival">
      <div className="landing-carnival__shell">
        <header className="landing-topbar">
          <Link className="landing-brand" href="/">
            <div className="landing-brand__symbol">蛋</div>
            <div className="landing-brand__copy">
              <strong>蛋壳伴学</strong>
              <span>温柔、会记得孩子的 AI 陪伴伙伴</span>
            </div>
          </Link>

          <div className="landing-topbar__actions">
            <div className="landing-topbar__streak">
              <Sun size={22} strokeWidth={2.6} />
              <span>陪伴第 12 天</span>
            </div>
            {initialized && session ? (
              <>
                <div className="landing-topbar__account">
                  <strong>{session.user.displayName}</strong>
                  <span>{session.user.role === "ADMIN" ? "运营工作台" : "家庭陪伴模式"}</span>
                </div>
                <LandingButton href="/chat" variant="primary">
                  进入陪伴舱
                </LandingButton>
              </>
            ) : (
              <>
                <LandingButton href="/login" variant="ghost">
                  家长端
                </LandingButton>
                <LandingButton href="/chat" variant="primary">
                  进入陪伴舱
                </LandingButton>
              </>
            )}
          </div>
        </header>

        <section className="landing-hero">
          <div className="landing-hero__badge">
            <Sparkles size={20} strokeWidth={2.7} />
            <span>AI 驱动 · 治愈系幼教伴学</span>
          </div>

          <div className="landing-hero__content">
            <h1>
              学习，不该是
              <br />
              <span>孤独的旅程。</span>
            </h1>
            <p>
              小伙伴们都在蛋壳里等你哦！选一个你最喜欢的小动物，
              <br />
              开启今天的探索吧。
            </p>
          </div>

          <div className="landing-hero__actions">
            <LandingButton className="landing-hero__primary" href="/chat" variant="primary">
              开始冒险
              <ChevronRight size={28} strokeWidth={3} />
            </LandingButton>
          </div>

          <div className="landing-hero__notes">
            <div className="landing-hero__note landing-hero__note--top">会记得上次学到哪里</div>
            <div className="landing-hero__note landing-hero__note--bottom">会引用老师知识库和家庭资料</div>
          </div>
        </section>

        <section className="landing-companions" onMouseLeave={() => setHoveredId(null)}>
          <div className="landing-companions__head">
            <span className="eyebrow">Meet The Companions</span>
            <h2>选一个孩子最喜欢的小动物伙伴，开启今天的探索吧。</h2>
            <p>首页继续接真实老师接口，但展示昵称和形象已经改成更有陪伴感的小动物伙伴表达。</p>
          </div>

          {error ? (
            <div className="status-panel status-panel--error">
              <strong>伙伴列表暂时不可用</strong>
              <p>{error}</p>
            </div>
          ) : null}

          <div className="landing-companions__grid">
            {(loading ? [0, 1, 2] : companions).map((item, index) =>
              typeof item === "number" ? (
                <article key={item} className={`companion-card companion-card--placeholder${index === 0 ? " companion-card--active" : ""}`}>
                  <div className="companion-card__bubble companion-card__bubble--visible">
                    <span>{index === 0 ? "抱抱！今天也要开心呀！" : "今天想一起探索什么呢？"}</span>
                  </div>
                  <div className="companion-card__shell">
                    <div className="placeholder-line placeholder-line--short" />
                    <div className="placeholder-line placeholder-line--tall" />
                    <div className="placeholder-line" />
                  </div>
                </article>
              ) : (
                <CompanionCard
                  key={item.id}
                  active={activeHoverId === item.id}
                  companion={item}
                  dimmed={Boolean(activeHoverId) && activeHoverId !== item.id}
                  onEnter={() => setHoveredId(item.id)}
                />
              )
            )}
          </div>
        </section>

        <section className="landing-safety">
          <div className="landing-safety__copy">
            <div className="landing-safety__icon">
              <ShieldCheck size={34} strokeWidth={2.4} />
            </div>
            <div>
              <h2>多重守护，家长无忧</h2>
              <p>
                我们采用专为儿童设计的 AI 过滤引擎，屏蔽所有不适内容。
                <br />
                让每一次陪伴都充满正能量与好奇心。
              </p>
            </div>
            <div className="landing-safety__chips">
              <div className="landing-safety__chip">
                <Heart size={20} fill="currentColor" strokeWidth={2.4} />
                <span>内容适龄化</span>
              </div>
              <div className="landing-safety__chip">
                <ShieldCheck size={20} strokeWidth={2.4} />
                <span>屏幕时间管理</span>
              </div>
            </div>
          </div>

          <div className="landing-safety__mark">
            <ShieldCheck size={280} strokeWidth={1.4} />
          </div>
        </section>
      </div>
    </main>
  );
}
