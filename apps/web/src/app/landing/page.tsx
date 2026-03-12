import { Metadata } from 'next';
import LandingPageClient from './client';

export const metadata: Metadata = {
  title: '蛋壳伴学',
  description: '会记得孩子、能连接家庭资料、拥有真实多老师接口的 AI 陪伴学习体验。',
};

export default function LandingPage() {
  return <LandingPageClient />;
}
