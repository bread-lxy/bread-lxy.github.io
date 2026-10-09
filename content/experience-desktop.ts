/** Cover-only labels; the canonical résumé and publication remain unchanged. */
export type ExperienceCategory = 'education' | 'internship';
export type ExperiencePreview = { id: string; label: string };
export const experienceCategories = [
  { id: 'education', label: '教育' },
  { id: 'internship', label: '实习' },
] as const;
export const experienceDesktop = {
  title: '我的经历 — 记事本',
  photo: { src: '/experience/profile-portrait.png', alt: '雪莹在雪地上的个人照片' } as { src: string; alt: string } | undefined,
  records: {
    education: [
      { id: 'ruc', label: '中国人民大学 · 金融工程 · 本科' },
      { id: 'cbs', label: '哥本哈根商学院 · 交换生' },
      { id: 'ruc-master', label: '中国人民大学 · 金融 · 硕士' },
    ],
    internship: [
      { id: 'sand-ai', label: 'Sand AI / VidMuse · AI Agent调优' },
      { id: 'huatai', label: '华泰证券 · 金融工程组' },
      { id: 'huatai-media', label: '华泰证券 · 传媒组' },
      { id: 'baidu', label: '百度智能云 · 智能云AI应用战略研究' },
      { id: 'guotai', label: '国泰君安证券 · 家电组' },
      { id: 'esg', label: '北京 ESG 研究院 · 数据分析' },
    ],
  } satisfies Record<ExperienceCategory, ExperiencePreview[]>,
};
