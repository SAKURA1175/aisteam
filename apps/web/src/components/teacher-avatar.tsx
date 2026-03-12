import type { CSSProperties } from "react";

import { getTeacherBranding } from "../lib/teacher-branding";

type TeacherAvatarProps = {
  slug?: string;
  name: string;
  size?: "sm" | "md" | "lg";
  subtitle?: string;
};

const sizeClassMap = {
  sm: "teacher-avatar--sm",
  md: "teacher-avatar--md",
  lg: "teacher-avatar--lg"
} as const;

export function TeacherAvatar({ slug, name, size = "md", subtitle }: TeacherAvatarProps) {
  const branding = getTeacherBranding(slug ? { slug } : null);

  return (
    <div
      className={`teacher-avatar ${sizeClassMap[size]}`}
      style={
        {
          "--teacher-accent": branding.accent,
          "--teacher-accent-soft": branding.accentSoft,
          "--teacher-surface": branding.surface,
          "--teacher-glow": branding.glow
        } as CSSProperties
      }
    >
      <div className="teacher-avatar__bubble">
        <span className="teacher-avatar__glyph">{branding.glyph}</span>
      </div>
      <div className="teacher-avatar__orbit" />
      <div className="teacher-avatar__label">
        <strong>{name}</strong>
        {subtitle ? <span>{subtitle}</span> : <span>{branding.constellation}</span>}
      </div>
    </div>
  );
}
