"use client";

import type { TeacherSummary } from "@tutormarket/types";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { HatchingChick } from "@/components/mascot/HatchingChick";
import { SiteHeader } from "@/components/site-header";
import { TeacherAvatar } from "@/components/teacher-avatar";
import { getTeachers } from "@/lib/api";
import { getTeacherBranding } from "@/lib/teacher-branding";

const featureCards = [
  {
    title: "记住每次学习的节奏",
    body: "同一个陪伴伙伴会延续孩子的进度、偏好和容易卡住的点，不必每次重新介绍。"
  },
  {
    title: "家庭资料可以随时补充",
    body: "家长上传绘本、词卡和课堂素材后，聊天回答会自动结合这些家庭资料。"
  },
  {
    title: "每个伙伴有自己的风格",
    body: "Luna 更适合认字，Benny 更适合英语开口，Mimi 更适合绘本共读。"
  }
];

export default function LandingPageClient() {
  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const heroTeachers = useMemo(() => teachers.slice(0, 3), [teachers]);

  return (
    <main className="public-page">
      <div className="page-shell">
        <SiteHeader />

        <section className="hero-card">
          <div className="hero-card__copy">
            <span className="eyebrow">Eggshell Companion</span>
            <h1>把会记得孩子的 AI 陪伴伙伴，放进每天的学习时光。</h1>
            <p>
              蛋壳伴学把真实多老师后端接到了儿童向前端体验里。每位伙伴都有自己的知识边界、对话风格、家庭资料库和长期记忆。
            </p>
            <div className="hero-card__actions">
              <Link className="button button--primary" href="/login">
                家长登录
              </Link>
              <Link className="button button--ghost" href="/teachers">
                选择陪伴伙伴
              </Link>
            </div>
            <div className="hero-card__facts">
              <div className="fact-pill">
                <strong>真实接口</strong>
                <span>老师、会话、资料、记忆都来自后端</span>
              </div>
              <div className="fact-pill">
                <strong>持续陪伴</strong>
                <span>同一老师下自动延续孩子的进度和偏好</span>
              </div>
            </div>
          </div>

          <div className="hero-card__visual">
            <div className="hero-card__mascot">
              <HatchingChick />
            </div>
            <div className="hero-card__bubble hero-card__bubble--top">会记得上次学到哪里</div>
            <div className="hero-card__bubble hero-card__bubble--bottom">会引用老师知识库和家庭资料</div>
          </div>
        </section>

        <section className="section-block">
          <div className="section-head">
            <div>
              <span className="eyebrow">Meet The Companions</span>
              <h2>真实老师接口，儿童陪伴式呈现</h2>
            </div>
            <p>老师卡来自 `GET /api/v1/teachers`。如果接口暂时不可用，这里只显示占位，不伪造运行时老师数据。</p>
          </div>

          {error ? (
            <div className="status-panel status-panel--error">
              <strong>老师列表暂时不可用</strong>
              <p>{error}</p>
            </div>
          ) : null}

          <div className="teacher-showcase-grid">
            {(loading ? [0, 1, 2] : heroTeachers).map((teacher, index) =>
              typeof teacher === "number" ? (
                <article key={teacher} className="showcase-card showcase-card--placeholder">
                  <div className="placeholder-line placeholder-line--short" />
                  <div className="placeholder-line" />
                  <div className="placeholder-line placeholder-line--tall" />
                </article>
              ) : (
                <article
                  key={teacher.id}
                  className="showcase-card"
                  style={
                    {
                      "--card-accent": getTeacherBranding(teacher, index).accent,
                      "--card-surface": getTeacherBranding(teacher, index).surface
                    } as CSSProperties
                  }
                >
                  <TeacherAvatar name={teacher.name} size="md" slug={teacher.slug} subtitle={teacher.headline} />
                  <div className="showcase-card__copy">
                    <strong>{teacher.name}</strong>
                    <span>{teacher.headline}</span>
                    <div className="tag-list">
                      {teacher.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="tag-pill">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link className="button button--ghost" href={`/chat?teacherId=${teacher.id}`}>
                    直接进入陪伴舱
                  </Link>
                </article>
              )
            )}
          </div>
        </section>

        <section className="section-block section-block--soft">
          <div className="section-head">
            <div>
              <span className="eyebrow">Why It Feels Different</span>
              <h2>不是换皮聊天框，而是可持续的伴学体验</h2>
            </div>
          </div>
          <div className="feature-grid">
            {featureCards.map((feature) => (
              <article key={feature.title} className="feature-card">
                <strong>{feature.title}</strong>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cta-banner">
          <div>
            <span className="eyebrow">Ready To Start</span>
            <h2>先选一个伙伴，再把真实接口跑起来。</h2>
            <p>登录后就能直接体验真实聊天、家庭资料上传和记忆管理，不再停留在静态页面。</p>
          </div>
          <div className="cta-banner__actions">
            <Link className="button button--primary" href="/login">
              马上开始
            </Link>
            <Link className="button button--ghost" href="/teachers">
              查看伙伴
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
