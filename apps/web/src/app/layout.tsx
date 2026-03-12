import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "../lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://eggshell-companion.app"),
  title: "蛋壳伴学",
  description: "会记得孩子、能连接家庭资料、拥有真实多老师与记忆能力的 AI 陪伴学习平台。",
  openGraph: {
    title: "蛋壳伴学",
    description: "真实多老师接口、长期记忆和家庭资料库，统一接入儿童向陪伴体验。",
    type: "website"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
