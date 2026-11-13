import type { BuildingId } from '../three/buildings/index.ts';

export interface EmbedSource {
  url: string;
  external: boolean;
  phone?: boolean;
}

export interface BuildingInfo {
  id: BuildingId;
  name: string;
  subtitle: string;
  summary: string;
  tags: string[];
  embed?: EmbedSource;
}

export const BUILDING_INFO: Record<BuildingId, BuildingInfo> = {
  divination: {
    id: 'divination',
    name: '易经占卜馆',
    subtitle: '项目 · 传统文化数字化体验',
    summary: '独立完成产品设计与 Vibe coding：起卦后生成占卜报告与可分享的报告卡片，并支持历史记录回看。',
    tags: ['产品设计', 'Vibe coding', '文化产品'],
    embed: { url: 'https://xueer03135998-creator.github.io/yijing-divination/', external: true },
  },
  canteen: {
    id: 'canteen',
    name: '食堂小屋',
    subtitle: '项目 · 午餐小助手',
    summary: '帮你决定中午吃什么的小工具，在这里可以直接体验。',
    tags: ['产品设计', '效率工具', 'Vibe coding'],
    embed: { url: 'https://xueer03135998-creator.github.io/lunch-helper/', external: true },
  },
  archive: {
    id: 'archive',
    name: '个人档案馆',
    subtitle: '杨博驿 · 个人简历',
    summary: '基本信息、实习经历、技能与荣誉，分栏查看。',
    tags: ['个人档案', '实习经历', '技能荣誉'],
  },
  heritage: {
    id: 'heritage',
    name: '非遗体验馆',
    subtitle: '项目 · 木偶·归途',
    summary: '一个非遗传承者的互动故事，跟着剧情一步步走完，手机竖屏体验更佳。',
    tags: ['交互叙事', '文化产品', '非遗'],
    embed: { url: `${import.meta.env.BASE_URL}heritage/index.html`, external: false, phone: true },
  },
};
