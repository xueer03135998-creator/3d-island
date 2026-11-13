import { BUILDING_INFO } from './buildings.ts';
import { ISLAND_NAME } from './site.ts';

export interface NpcTopic {
  id: string;
  label: string;
  lines: string[];
  next: string[];
}

export const NPC_NAME = '乌空兔';

export const NPC_GREETING: string[] = [
  '你好呀，我是岛上的向导乌空兔！欢迎来到「' + ISLAND_NAME + '」。',
  '岛上有四座展馆，每座都藏着一份作品。建议先去「个人档案馆」了解一下岛主，再自由选择感兴趣的展馆，或在岛内先逛逛～',
];

const MENU = ['island', 'how', 'halls', 'bye'];

const HALLS = (['divination', 'canteen', 'heritage', 'archive'] as const).map(id => BUILDING_INFO[id]);

export const NPC_TOPICS: NpcTopic[] = [
  {
    id: 'island',
    label: '岛上有什么',
    lines: [
      '「请雇我工作岛」中间是圆形广场，四条石板路通向四座展馆，岛边有码头和一条小木船。',
      '岛上还有小猫小狗在玩耍，小狗最喜欢追着球跑，你也可以陪它们玩。',
    ],
    next: ['halls', 'how', 'bye'],
  },
  {
    id: 'how',
    label: '怎么玩',
    lines: [
      '电脑：WASD 或方向键移动，Shift 奔跑，拖拽转视角，滚轮或 + / - 缩放。',
      '手机：左下摇杆移动，单指拖动转视角，双指或右侧按钮缩放。',
      '走到展馆门前会自动开门进入；点击建筑、长椅、小船也都可以。',
    ],
    next: ['halls', 'island', 'bye'],
  },
  {
    id: 'halls',
    label: '介绍各个馆',
    lines: HALLS.map(h => `「${h.name}」${h.subtitle}：${h.summary}`),
    next: ['how', 'island', 'bye'],
  },
  {
    id: 'bye',
    label: '再见',
    lines: ['玩得开心！想听介绍的话，随时回来找我。'],
    next: [],
  },
];

export const NPC_MENU = MENU;

export function findTopic(id: string): NpcTopic | undefined {
  return NPC_TOPICS.find(t => t.id === id);
}
