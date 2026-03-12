import type { CSSProperties } from "react";

import { LottieMascot } from "./mascot/LottieMascot";
import { getCompanionIdentity } from "../lib/companion-identity";
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
  const identity = getCompanionIdentity(slug, name, subtitle);

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
        <LottieMascot className="teacher-avatar__lottie" fallback={identity.glyph ?? branding.glyph} src={identity.animationPath} />
      </div>
      <div className="teacher-avatar__orbit" />
      <div className="teacher-avatar__label">
        <strong>{name}</strong>
        {subtitle ? <span>{subtitle}</span> : <span>{identity.subtitle ?? branding.constellation}</span>}
      </div>
    </div>
  );
}
