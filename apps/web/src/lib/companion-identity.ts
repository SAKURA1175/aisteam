import { BookOpen, Heart, Smile, type LucideIcon } from "lucide-react";

type CompanionIdentity = {
  displayName: string;
  subtitle: string;
  badge: string;
  quote: string;
  hoverQuote: string;
  animationPath: string;
  glyph: string;
  icon: LucideIcon;
};

const companionIdentityBySlug: Record<string, CompanionIdentity> = {
  "luna-rabbit": {
    displayName: "跳跳",
    subtitle: "小兔认字陪伴师",
    badge: "中文启蒙",
    quote: "今天一起蹦蹦跳跳学新字吗？",
    hoverQuote: "我是跳跳，今天也要开心学认字呀！",
    animationPath: "/lottie/animal-rabbit.json",
    glyph: "兔",
    icon: Heart
  },
  "benny-bear": {
    displayName: "啾啾",
    subtitle: "小鸡探索陪伴师",
    badge: "百科探险",
    quote: "准备好和我一起啄开新世界了吗？",
    hoverQuote: "我是啾啾，今天带你去发现好多新东西。",
    animationPath: "/lottie/animal-chick.json",
    glyph: "鸡",
    icon: Smile
  },
  "mimi-cat": {
    displayName: "咪咪",
    subtitle: "小猫绘本陪伴师",
    badge: "绘本共读",
    quote: "咪呜，今天一起读个好听的故事吧。",
    hoverQuote: "我是咪咪，已经帮你把今天的绘本翻开啦。",
    animationPath: "/lottie/animal-cat.json",
    glyph: "猫",
    icon: BookOpen
  }
};

export function getCompanionIdentity(
  slug: string | null | undefined,
  fallbackName = "团团",
  fallbackSubtitle = "小动物陪伴师"
): CompanionIdentity {
  if (slug && companionIdentityBySlug[slug]) {
    return companionIdentityBySlug[slug];
  }

  return {
    displayName: fallbackName,
    subtitle: fallbackSubtitle,
    badge: "温柔陪伴",
    quote: "今天想聊点什么呀？",
    hoverQuote: "我已经准备好陪你开始今天的冒险了。",
    animationPath: "/lottie/animal-chick.json",
    glyph: "蛋",
    icon: Heart
  };
}
