import type { TeacherDetail, TeacherSummary } from "@tutormarket/types";
import { brandTokens } from "@tutormarket/ui-tokens";

export type TeacherBranding = {
  accent: string;
  accentSoft: string;
  surface: string;
  glow: string;
  glyph: string;
  constellation: string;
  welcomeTitle: string;
  promptHint: string;
};

const fallbackPalette = [
  {
    accent: brandTokens.colors.navy,
    accentSoft: "#ffe1d5",
    surface: "#fff5ef",
    glow: "rgba(232, 115, 74, 0.26)",
    glyph: "兔",
    constellation: "晨光字卡",
    welcomeTitle: "认字小冒险",
    promptHint: "适合儿歌、识字和表达鼓励"
  },
  {
    accent: "#ffb347",
    accentSoft: "#fff0d4",
    surface: "#fff8ea",
    glow: "rgba(255, 179, 71, 0.28)",
    glyph: "熊",
    constellation: "节奏单词",
    welcomeTitle: "英语开口热身",
    promptHint: "适合自然拼读、单词和开口练习"
  },
  {
    accent: brandTokens.colors.cyan,
    accentSoft: "#def7ea",
    surface: "#f4fff8",
    glow: "rgba(76, 175, 130, 0.24)",
    glyph: "猫",
    constellation: "故事岛",
    welcomeTitle: "绘本共读时光",
    promptHint: "适合故事阅读、复述和表达启发"
  }
] as const;

const brandingBySlug: Record<string, TeacherBranding> = {
  "luna-rabbit": fallbackPalette[0],
  "benny-bear": fallbackPalette[1],
  "mimi-cat": fallbackPalette[2]
};

export function getTeacherBranding(
  teacher: Pick<TeacherSummary, "slug"> | Pick<TeacherDetail, "slug"> | null | undefined,
  index = 0
): TeacherBranding {
  if (teacher?.slug && brandingBySlug[teacher.slug]) {
    return brandingBySlug[teacher.slug];
  }

  return fallbackPalette[index % fallbackPalette.length];
}
