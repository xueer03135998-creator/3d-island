export type QaGroup = 'me' | 'work' | 'project';

export interface QaItem {
  id: string;
  group: QaGroup;
  question: string;
  keywords: string[];
  answer: string;
}

export const QA_GROUP_LABELS: Record<QaGroup, string> = {
  me: '关于我',
  work: '实习经历',
  project: '个人项目',
};
