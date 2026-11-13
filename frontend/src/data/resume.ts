export interface ResumeEntry {
  title: string;
  org: string;
  period: string;
  points: string[];
  domains: string[];
  roles: string[];
}

export interface ResumeSection {
  id: string;
  label: string;
  entries: ResumeEntry[];
}

export const RESUME_PROFILE = {
  name: '杨博驿',
  school: '上海财经大学（211）· 新闻与传播（数字文化产业）专业硕士，推免保送',
  phone: '17687975531',
  email: 'yangboyi202406@163.com',
};

export const RESUME_SECTIONS: ResumeSection[] = [
  {
    id: 'work',
    label: '实习经历',
    entries: [
      {
        title: '(商业化)数据产品经理',
        org: '哔哩哔哩 · 商业产品与运营策略中心',
        period: '2026.04 – 2026.08',
        points: [
          '从 0 到 1 搭建商业化 Agent 产品，覆盖 7 类业务需求，含会话、文件、知识库、记忆等模块，建设技能生态并接入企微机器人，业务效率提升 80%。',
          '搭建广告人群 DMP 平台，推进标签治理，落地「标签下线」与「小时级人群包」能力。',
          '负责标签分层与人群搭建：沉淀 20+ 热点场景人群、100+ 行业品类/卖点人群。',
        ],
        domains: ['商业化广告', 'AI Agent', '数据产品', '广告人群 DMP', '标签治理', '大促营销', '行业研究'],
        roles: ['数据产品经理', 'AI 产品经理', '平台功能产品', '数据治理', '人群策略'],
      },
      {
        title: '营收玩法产品策划',
        org: '哔哩哔哩 · 猫耳事业部',
        period: '2025.11 – 2026.03',
        points: [
          '负责直播营收玩法：押注、装扮、许愿池商城榜单，并参与 2 场平台活动。',
          '单次玩法 GMV 达 160w，毛利 ROI 大于 1.6。',
          '调研 6 个音频直播竞品；通过复盘迭代带动营收增量提升 20%。',
        ],
        domains: ['音频直播', '直播营收', '平台赛事活动', '礼物与定价', '数值模型', '竞品调研'],
        roles: ['营收玩法产品策划', '活动策划', 'PRD 与原型设计', '数值策划', '项目复盘'],
      },
      {
        title: '产品运营',
        org: '完美世界',
        period: '2023.06 – 2023.10',
        points: [
          '面向 3 类用户画像制定小红书内容策略：日更 20+ 篇笔记，平均阅读 3w+，累计拉新 1w+ 用户，曝光提升 20%，互动提升 60%。',
          '运营 4 个社群并提出 10+ 条建议，付费转化提升 9%。',
        ],
        domains: ['在线教育', '小红书内容增长', '社群运营', '用户反馈', '付费转化'],
        roles: ['产品运营', '内容运营', '用户运营', '数据复盘'],
      },
      {
        title: '商家 / 创办者',
        org: 'gz 幸运时光自习室',
        period: '2022.09 – 至今',
        points: [
          '从 0 到 1 搭建：6 个功能分区、3 类卡券、20+ 种定价组合。',
          '开业首月在美团同类本地商家中排名第 1，长期稳定前 3，用户留存 80%。',
          '运营小红书 / 公众号 / 抖音内容矩阵与用户社群。',
        ],
        domains: ['本地生活', '线下空间', '新媒体矩阵', '营销活动', '卡券与定价', '会员留存'],
        roles: ['创办者', '产品规划', '定价策略', '新媒体运营', '用户运营'],
      },
    ],
  },
];

export const RESUME_SKILLS: Array<{ group: string; items: string[] }> = [
  { group: '数据工具', items: ['SQL', 'Excel'] },
  { group: '产品工具', items: ['Axure', 'Figma', '墨刀', 'Xmind'] },
  { group: 'AI 工具', items: ['Dify', 'COZE 智能体 / 工作流', 'workbuddy', 'Claude Code'] },
  { group: '设计工具', items: ['PS', '秀米', 'Canva', '剪映'] },
  { group: '语言', items: ['英语 CET-6'] },
];

export const RESUME_HONORS: string[] = [
  '三创赛',
  '广告创意大赛 · 国家级优秀奖',
  '红色旅游策划案赛 · 华北二等奖',
  '计算机设计大赛 · 省三等奖',
  '网络编辑创新大赛 · 国家级二等奖',
];
