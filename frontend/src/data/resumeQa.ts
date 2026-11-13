import { QA_GROUP_LABELS, type QaGroup, type QaItem } from './qaTypes.ts';
import { QA_PROFILE } from './qaProfile.ts';
import { QA_WORK } from './qaWork.ts';
import { QA_PROJECTS } from './qaProjects.ts';

export type { QaGroup, QaItem };

export const QA_ITEMS: QaItem[] = [...QA_PROFILE, ...QA_WORK, ...QA_PROJECTS];

const PRESET_IDS: Record<QaGroup, string[]> = {
  me: ['intro', 'strength', 'fit', 'plan', 'first-job', 'contact'],
  work: ['internships', 'achievement', 'hardest', 'collab'],
  project: ['project', 'startup', 'webcoding'],
};

const GROUP_ORDER: QaGroup[] = ['me', 'work', 'project'];

export interface PresetGroup {
  group: QaGroup;
  label: string;
  questions: QaItem[];
}

export const PRESET_GROUPS: PresetGroup[] = GROUP_ORDER.map(group => ({
  group,
  label: QA_GROUP_LABELS[group],
  questions: PRESET_IDS[group]
    .map(id => QA_ITEMS.find(q => q.id === id))
    .filter((q): q is QaItem => Boolean(q)),
}));

export const PRESET_QUESTIONS: QaItem[] = PRESET_GROUPS.flatMap(g => g.questions);

export const FALLBACK_ANSWER = '这个问题我暂时无法回答，可以邀约面试现场提问哦';

// 资料里没有、也不适合在网页上回答的话题，直接走兜底回复。
const NO_DATA_WORDS = ['薪资', '薪水', '工资', '待遇', '到岗', '入职时间', '实习多久', '每周几天', '年龄', '多大', '结婚', '对象', '家庭', '户口', '身高', '体重'];

const MIN_SCORE = 2;

const normalize = (s: string): string => s.toLowerCase().replace(/[\s，。！？、；：,.!?;:'"“”‘’（）()「」\-]/g, '');

const NORMALIZED = QA_ITEMS.map(item => ({
  item,
  question: normalize(item.question),
  keywords: item.keywords.map(normalize).filter(Boolean),
}));

function overlap(a: string, b: string): number {
  let n = 0;
  for (const ch of new Set(a)) {
    if (b.includes(ch)) {
      n += 1;
    }
  }
  return n;
}

export function findAnswer(input: string): QaItem | null {
  const text = normalize(input);
  if (!text) {
    return null;
  }
  const exact = NORMALIZED.find(n => n.question === text);
  if (exact) {
    return exact.item;
  }
  if (NO_DATA_WORDS.some(w => text.includes(w))) {
    return null;
  }
  let best: QaItem | null = null;
  let bestScore = 0;
  let bestTie = 0;
  NORMALIZED.forEach(n => {
    const score = n.keywords.reduce((sum, k) => (text.includes(k) ? sum + k.length : sum), 0);
    if (score < MIN_SCORE) {
      return;
    }
    const tie = overlap(text, n.question);
    if (score > bestScore || (score === bestScore && tie > bestTie)) {
      best = n.item;
      bestScore = score;
      bestTie = tie;
    }
  });
  return best;
}
