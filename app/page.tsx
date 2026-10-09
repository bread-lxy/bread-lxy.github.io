import type { Metadata } from "next";
import { PersonalArchive } from "./PersonalArchive";

export const metadata: Metadata = {
  title: { absolute: "卢雪莹 Xueying Lu · Personal Space" },
  description: "卢雪莹的个人空间：金融工程背景、AI 实践、研究与视觉创作。",
};

export default function Home() {
  return <PersonalArchive />;
}
