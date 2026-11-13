import type { BuildingId } from '../three/buildings/index.ts';

export interface IntroFeature {
  title: string;
  desc: string;
}

export interface IntroStep {
  title: string;
  desc: string;
}

export interface ProjectIntroData {
  tagline: string;
  value: string[];
  features: IntroFeature[];
  flow: IntroStep[];
}

export type IntroBuildingId = Exclude<BuildingId, 'archive'>;

export const PROJECT_INTRO: Record<IntroBuildingId, ProjectIntroData> = {
  divination: {
    tagline: '把传统起卦做成人人看得懂的在线小产品',
    value: [
      '不用查表、不用懂术语：输入问题和数字就能排出卦象，并用白话讲清楚结论。',
      '每次占卜自动留存，可以回看、对比，也能生成卡片分享给朋友。',
      '默认数据只存在自己的设备上，需要时再手动备份或同步。',
    ],
    features: [
      { title: '梅花易数与小六壬', desc: '两种起卦方式，各自保存问题、数字和结果，并可互相跳转参考。' },
      { title: '自动排盘', desc: '内置 1900–2100 年农历与时辰换算，给出本卦、互卦、变卦、动爻与体用关系。' },
      { title: '白话解读报告', desc: '一句话结论加吉凶标签，再分段说明；涉及健康、法律、金钱时附上提示语。' },
      { title: '可选的 AI 解读', desc: '可接入自己的大模型服务，密钥只保存在本地，调用失败时自动回到模板解读。' },
      { title: '历史记录与分享卡', desc: '历史可查看、刷新、删除；一键生成分享卡片预览并下载；支持备份导入导出。' },
    ],
    flow: [
      { title: '选择玩法', desc: '梅花易数或小六壬' },
      { title: '写下问题', desc: '可选，并输入 1–3 个数字' },
      { title: '起卦排盘', desc: '自动生成卦象与爻线图' },
      { title: '查看解读', desc: '模板解读，可选开启 AI' },
      { title: '保存与分享', desc: '进入历史记录，生成分享卡' },
    ],
  },
  canteen: {
    tagline: '帮你决定中午吃什么的手绘风小工具',
    value: [
      '把“吃什么”这个每天重复的纠结，变成几秒钟就能得到答案的小互动。',
      '每道菜带真实感的食客评价，帮助判断，而不是盲选。',
      '手绘风格与会动的小吉祥物，让决策过程轻松有趣。',
    ],
    features: [
      { title: '菜品与商家清单', desc: '收录约 40 项午餐选择，另含饮品与甜点。' },
      { title: '评价片段', desc: '每个选项配有食客评价摘录，方便快速比较。' },
      { title: '随机与筛选', desc: '用滑块等控件缩小范围或随机一个，减少选择压力。' },
      { title: '手绘视觉与吉祥物', desc: '暖色手账质感，小吉祥物漂浮陪伴。' },
    ],
    flow: [
      { title: '打开页面', desc: '进入手绘风首页' },
      { title: '设定偏好', desc: '用控件缩小范围' },
      { title: '得到推荐', desc: '随机或筛选出午餐选项' },
      { title: '看评价', desc: '参考食客评价做最后决定' },
    ],
  },
  heritage: {
    tagline: '跟着一个小木偶，走完一段非遗传承的互动故事',
    value: [
      '用剧情带人了解布袋木偶戏，比图文介绍更容易被记住。',
      '在关键节点让用户亲自做选择，感受非遗传播的真实决策。',
      '最后用数据地图把更多非遗项目串起来，引出继续了解的兴趣。',
    ],
    features: [
      { title: '五幕剧情', desc: '家、陪伴、远行、转折、构想，一条主线讲完传承故事。' },
      { title: '角色扮演互动', desc: '以网络编辑的身份挑选短视频封面和标题，看到传播效果。' },
      { title: '非遗热榜', desc: '选择之后用热榜反馈展示结果。' },
      { title: '全国非遗数据地图', desc: '点亮布袋木偶戏、皮影、剪纸、蜀绣、京剧、龙泉青瓷等项目。' },
      { title: '戏曲配乐', desc: '内置锣鼓与五声音阶配乐，可随时暂停。' },
    ],
    flow: [
      { title: '开始故事', desc: '标题页点击进入' },
      { title: '前三幕', desc: '家、陪伴、远行，建立情感' },
      { title: '转折与选择', desc: '挑选封面和标题' },
      { title: '热榜反馈', desc: '看到选择带来的传播结果' },
      { title: '数据地图', desc: '点亮更多非遗项目，进入大讲堂' },
    ],
  },
};
