// 前端共享常量：21 席三舱、8 维度、阶段、角色
// 席位 id 与 src/lib/domain.ts 完全一致，确保前后端数据匹配
export interface SeatDef {
  id: string;
  name: string;
  cabin: "explore" | "build" | "govern";
  duty: string;
  dims: string[];
}

export const SEATS: SeatDef[] = [
  // 探索舱（7 席）
  { id: "star_chart_scholar", name: "星图学者", cabin: "explore", duty: "检索技术前沿、政策、竞品信息", dims: ["curiosity", "abstract"] },
  { id: "interstellar_scout", name: "星际侦察兵", cabin: "explore", duty: "下沉真实场景，访谈用户", dims: ["curiosity", "empathy"] },
  { id: "quantum_hypothesist", name: "量子假设师", cabin: "explore", duty: "拆解可验证假设并证伪", dims: ["abstract", "systematic"] },
  { id: "starlight_poet", name: "星光诗人", cabin: "explore", duty: "创造概念、愿景故事与品牌表达", dims: ["imagination", "abstract"] },
  { id: "future_oracle", name: "未来预言家", cabin: "explore", duty: "研判技术周期与长期趋势", dims: ["imagination", "ambiguity"] },
  { id: "wanderer_philosopher", name: "漂泊者哲人", cabin: "explore", duty: "追问第一性原理与长期意义", dims: ["curiosity", "abstract"] },
  { id: "star_chest_collector", name: "星匣收藏家", cabin: "explore", duty: "归档优质资料与可复用知识", dims: ["systematic", "abstract"] },
  // 建造舱（7 席）
  { id: "engine_chief", name: "引擎总师", cabin: "build", duty: "设计整体系统架构与技术底座", dims: ["abstract", "systematic"] },
  { id: "mechanical_designer", name: "机械造物师", cabin: "build", duty: "将需求转化为可落地产品结构", dims: ["systematic", "imagination"] },
  { id: "star_blacksmith", name: "星辰锻铁匠", cabin: "build", duty: "实现核心功能，锻造可运行系统", dims: ["executing", "systematic"] },
  { id: "circuit_runner", name: "星脉布线工", cabin: "build", duty: "搭建云基础设施、CI/CD 与安全", dims: ["executing", "systematic"] },
  { id: "wind_balance_officer", name: "星风平衡官", cabin: "build", duty: "定义验收标准、设计测试用例", dims: ["systematic", "executing"] },
  { id: "trajectory_pilot", name: "航道领航员", cabin: "build", duty: "拆解任务、设定里程碑、守节奏", dims: ["systematic", "executing"] },
  { id: "meteor_sharpshooter", name: "流星神射手", cabin: "build", duty: "设计营销实验、渠道投放与增长", dims: ["executing", "communication"] },
  // 治理舱（7 席）
  { id: "shuttle_herald", name: "飞梭传令官", cabin: "govern", duty: "渠道分发与运营落地承接", dims: ["communication", "executing"] },
  { id: "star_dock_keeper", name: "星坞守门人", cabin: "govern", duty: "严选准入、执行公约、守边界", dims: ["systematic", "empathy"] },
  { id: "fleet_commander", name: "舰队司令官", cabin: "govern", duty: "协调跨舱职能、配置资源", dims: ["communication", "systematic"] },
  { id: "star_covenant_observer", name: "星约监督者", cabin: "govern", duty: "设计协作规则与治理机制", dims: ["systematic", "communication"] },
  { id: "meteor_tactician", name: "陨星参谋师", cabin: "govern", duty: "识别风险、准备预案与危机应对", dims: ["ambiguity", "systematic"] },
  { id: "voyage_archivist", name: "远航编年史家", cabin: "govern", duty: "记录创新航迹、沉淀组织记忆", dims: ["systematic", "communication"] },
  { id: "star_bridge_engineer", name: "星桥工程师", cabin: "govern", duty: "建设信任、调解冲突、维系协作", dims: ["empathy", "communication"] },
];

export const CABIN_LABEL: Record<string, string> = {
  explore: "探索舱",
  build: "建造舱",
  govern: "治理舱",
};

export const CABIN_COLOR: Record<string, string> = {
  explore: "#38BDF8",
  build: "#5EEAD4",
  govern: "#A78BFA",
};

export interface DimDef {
  id: string;
  name: string;
  desc: string;
}

export const DIMENSIONS: DimDef[] = [
  { id: "curiosity", name: "好奇心", desc: "主动追问与发现新问题" },
  { id: "abstract", name: "抽象能力", desc: "从现象提炼结构与模型" },
  { id: "imagination", name: "想象力", desc: "构建不存在的可能性" },
  { id: "ambiguity", name: "模糊容忍", desc: "不确定中推进与保持开放" },
  { id: "systematic", name: "系统思维", desc: "结构化拆解与全局权衡" },
  { id: "executing", name: "执行力", desc: "计划稳定落地与闭环交付" },
  { id: "empathy", name: "共情力", desc: "理解他人处境与需求" },
  { id: "communication", name: "协作表达", desc: "清晰表达与推动共识" },
];

export const MISSION_PHASES = [
  { id: "intel_analysis", name: "靶源情报", short: "情报" },
  { id: "positioning", name: "项目定位", short: "定位" },
  { id: "prototype_build", name: "原型锻造", short: "原型" },
  { id: "trial_voyage", name: "实测试航", short: "试航" },
  { id: "maiden_voyage", name: "公测首航", short: "首航" },
  { id: "archive_retrospect", name: "归档复盘", short: "复盘" },
];

export const AGENTS = [
  { alias: "Navigator 01", name: "领航参谋", duty: "综合情报、定位与路线规划" },
  { alias: "Engineer AI 03", name: "船坞工匠", duty: "原型搭建与工程实现" },
  { alias: "Cargo Agent 02", name: "货运/组舰 Agent", duty: "自动组舰与资源调度" },
  { alias: "Shield 05", name: "风险护盾", duty: "风险扫描与应急预警" },
  { alias: "Logistics 04", name: "审核监察", duty: "核验产出与合规审查" },
];

export const ROLE_LABEL: Record<string, string> = {
  member: "舰员",
  fleet_commander: "舰长",
  builder: "建造者",
  researcher: "研究员",
  curator: "星坞守门人",
  platform_admin: "平台管理员",
  club_operator: "俱乐部运营",
  club_governor: "俱乐部治理者",
  governor: "治理者",
};
