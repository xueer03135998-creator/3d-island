import type { BuildingId } from './buildings.ts';
import { ISLAND_NAME } from './site.ts';

export interface NpcTopic {
  id: string;
  label: string;
  lines: string[];
  next: string[];
  /** 若提供：介绍各个馆时渲染为可点击跳转的场馆卡片 */
  halls?: BuildingId[];
}

export const NPC_NAME = '乌空兔';

export const NPC_GREETING: string[] = [
  '你好呀，我是岛上的向导乌空兔！欢迎来到「' + ISLAND_NAME + '」。',
  '岛上有四座展馆，每座都藏着一份作品。建议先去「个人档案馆」了解一下岛主，再自由选择感兴趣的展馆，或在岛内先逛逛～',
];

const MENU = ['how', 'halls', 'bye'];

export const HALLS_IDS: BuildingId[] = ['divination', 'canteen', 'heritage', 'archive'];

export const NPC_TOPICS: NpcTopic[] = [
  {
    id: 'how',
    label: '怎么玩',
    lines: [
      '电脑：WASD 或方向键移动，Shift 奔跑，空格跳跃，拖拽转视角，滚轮或 + / - 缩放。',
      '手机：左下摇杆移动，按住奔跑，右下跳跃，双指拖动/缩放视野。',
      '走到展馆门前会自动开门进入；点击建筑、长椅、小船也都可以。',
    ],
    next: ['halls', 'bye'],
  },
  {
    id: 'halls',
    label: '介绍各个馆',
    lines: ['四座展馆，每座都藏着一份作品。'],
    halls: HALLS_IDS,
    next: ['how', 'bye'],
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
