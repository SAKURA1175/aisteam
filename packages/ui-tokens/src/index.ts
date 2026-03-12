export const brandTokens = {
  colors: {
    ink: "#3d2a1e",
    inkSoft: "#7a5c48",
    navy: "#e8734a",
    navyDeep: "#c45a30",
    cyan: "#4caf82",
    cyanGlow: "#a8dfc0",
    orange: "#ffb347",
    sand: "#fff8f0",
    mist: "#f0faf4",
    line: "#f5dfc8",
    white: "#ffffff"
  },
  radius: {
    lg: "28px",
    md: "20px",
    sm: "14px"
  },
  shadow: {
    panel: "0 28px 70px rgba(61, 42, 30, 0.10)",
    float: "0 18px 40px rgba(76, 175, 130, 0.18)"
  }
} as const;

export const brandMarkSpec = {
  ariaLabel: "蛋壳伴学",
  wordmark: "蛋壳伴学",
  caption: "AI 陪伴学习平台",
  viewBox: "0 0 188 132",
  paths: {
    shell:
      "M36 25C36 14.5066 44.5066 6 55 6H127C137.493 6 146 14.5066 146 25V70C146 80.4934 137.493 89 127 89H97L66 116V89H55C44.5066 89 36 80.4934 36 70V25Z",
    pageLeft: "M60 36C70 30.5 80.4 29 92 33V77C81.2 73.5 70.9 73.9 60 79V36Z",
    pageRight: "M122 36C112 30.5 101.6 29 90 33V77C100.8 73.5 111.1 73.9 122 79V36Z",
    spine: "M91 32V77",
    memoryArc: "M113 20C127 16 142 24 148 39",
    memoryTail: "M128 14C143 12 157 22 161 37"
  },
  circles: {
    core: { cx: 149, cy: 39, r: 5.5 },
    echo: { cx: 160, cy: 36, r: 3.5 }
  }
} as const;
