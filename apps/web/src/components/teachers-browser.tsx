"use client";

import type { TeacherDetail } from "@tutormarket/types";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { getTeacher, getTeachers } from "../lib/api";
import { getTeacherBranding } from "../lib/teacher-branding";
import { SiteHeader } from "./site-header";
import { TeacherAvatar } from "./teacher-avatar";

export function TeachersBrowser() {
  const [teachers, setTeachers] = useState<TeacherDetail[]>([]);
  const [activeFilter, setActiveFilter] = useState("全部");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void getTeachers()
      .then(async (summaryResponse) => {
        const detailResponse = await Promise.all(summaryResponse.map((teacher) => getTeacher(teacher.id)));
        if (!active) {
          return;
        }

        setTeachers(detailResponse);
        setError(null);
      })
      .catch((fetchError: Error) => {
        if (!active) {
          return;
        }
        setError(fetchError.message);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const filters = useMemo(() => {
    const tags = teachers.flatMap((teacher) => teacher.tags);
    return ["全部", ...Array.from(new Set(tags)).slice(0, 8)];
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    if (activeFilter === "全部") {
      return teachers;
    }
    return teachers.filter((teacher) => teacher.tags.includes(activeFilter));
  }, [activeFilter, teachers]);

  const visibleTeachers = error ? [0, 1, 2] : loading ? [0, 1, 2] : filteredTeachers;

  return (
    <main className="public-page">
      <div className="page-shell">
        <SiteHeader />

        <section className="section-block">
          <div className="section-head">
            <div>
              <span className="eyebrow">Companion Selection</span>
              <h1>先选伙伴，再进入真实陪伴工作台。</h1>
            </div>
            <p>这里展示的是后端真实老师数据，只是视觉层切成了蛋壳伴学的角色化表达。</p>
          </div>

          <div className="filter-row">
            {filters.map((filter) => (
              <button
                key={filter}
                className={`filter-chip${activeFilter === filter ? " filter-chip--active" : ""}`}
                type="button"
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          {error ? (
            <div className="status-panel status-panel--error">
              <strong>伙伴列表暂时不可用</strong>
              <p>{error}</p>
            </div>
          ) : null}

          <div className="teacher-browser-grid">
            {visibleTeachers.map((teacher, index) =>
              typeof teacher === "number" ? (
                <article key={teacher} className="teacher-browser-card teacher-browser-card--placeholder">
                  <div className="placeholder-line placeholder-line--short" />
                  <div className="placeholder-line" />
                  <div className="placeholder-line" />
                  <div className="placeholder-line placeholder-line--tall" />
                </article>
              ) : (
                <article
                  key={teacher.id}
                  className="teacher-browser-card"
                  style={
                    {
                      "--card-accent": getTeacherBranding(teacher, index).accent,
                      "--card-surface": getTeacherBranding(teacher, index).surface
                    } as CSSProperties
                  }
                >
                  <TeacherAvatar name={teacher.name} slug={teacher.slug} size="lg" subtitle={teacher.headline} />
                  <div className="teacher-browser-card__body">
                    <div className="teacher-browser-card__heading">
                      <strong>{teacher.name}</strong>
                      <span>{teacher.headline}</span>
                    </div>
                    <p>{teacher.description}</p>
                    <div className="tag-list">
                      {teacher.tags.map((tag) => (
                        <span key={tag} className="tag-pill">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="teacher-browser-card__actions">
                    <Link className="button button--ghost" href={`/chat/memory?teacherId=${teacher.id}`}>
                      先看记忆
                    </Link>
                    <Link className="button button--primary" href={`/chat?teacherId=${teacher.id}`}>
                      开始陪伴
                    </Link>
                  </div>
                </article>
              )
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
