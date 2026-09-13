/**
 * 新大陆俱乐部 · 领域常量
 * 三舱 21 席 / 8 维能力 / Mission 阶段 / Agent 名单 / 荣誉头衔
 */

export type Cabin = "explore" | "build" | "govern";

export interface SeatDef {
  id: string; // 席位英文标识
  name: string; // 席位中文名
  cabin: Cabin;
  cabinName: string;
  title: string; // 席位定位
  mission: string; // 席位使命
}

export const CABIN_META: Record<Cabin, { name: string; color: string; dims: string[]; styleTag: string }> = {
  explore: {
    name: "探索舱",
    color: "#38BDF8",
    dims: ["curiosity", "abstract", "imagination", "ambiguity"],
    styleTag: "淡蓝色星云",
  },
  build: {
    name: "建造舱",
    color: "#5EEAD4",
    dims: ["systematic", "executing"],
    styleTag: "金属银青色",
  },
  govern: {
    name: "治理舱",
    color: "#A78BFA",
    dims: ["empathy", "communication"],
    styleTag: "深紫色星光",
  },
};

export const SEATS: SeatDef[] = [
  // 探索舱（淡蓝色星云）
  { id: "star_chart_scholar", name: "星图学者", cabin: "explore", cabinName: "探索舱", title: "技术与政策信息侦察席", mission: "检索技术前沿、政策、竞品、市场公开信息" },
  { id: "interstellar_scout", name: "星际侦察兵", cabin: "explore", cabinName: "探索舱", title: "一线田野与用户洞察席", mission: "下沉真实场景，访谈用户，发现隐性痛点" },
  { id: "quantum_hypothesist", name: "量子假设师", cabin: "explore", cabinName: "探索舱", title: "假设拆解与证伪席", mission: "把模糊问题拆成可验证假设并设计证伪路径" },
  { id: "starlight_poet", name: "星光诗人", cabin: "explore", cabinName: "探索舱", title: "创意灵感与愿景叙事席", mission: "创造独特概念、愿景故事、记忆点品牌表达" },
  { id: "future_oracle", name: "未来预言家", cabin: "explore", cabinName: "探索舱", title: "行业趋势推演席", mission: "研判技术周期、宏观变量与长期趋势" },
  { id: "wanderer_philosopher", name: "漂泊者哲人", cabin: "explore", cabinName: "探索舱", title: "本质与哲学追问席", mission: "追问第一性原理与文明、人性层面的长期意义" },
  { id: "star_chest_collector", name: "星匣收藏家", cabin: "explore", cabinName: "探索舱", title: "知识库与案例沉淀席", mission: "归档优质资料、案例与可复用知识资产" },
  // 建造舱（金属银青色）
  { id: "engine_chief", name: "引擎总师", cabin: "build", cabinName: "建造舱", title: "复杂系统架构师", mission: "设计整体系统架构、技术底座与模块协同" },
  { id: "mechanical_designer", name: "机械造物师", cabin: "build", cabinName: "建造舱", title: "产品/方案结构设计席", mission: "将抽象需求转化为可落地的产品结构与流程" },
  { id: "star_blacksmith", name: "星辰锻铁匠", cabin: "build", cabinName: "建造舱", title: "核心开发工程师", mission: "实现核心功能，把方案锻造成可运行系统" },
  { id: "circuit_runner", name: "星脉布线工", cabin: "build", cabinName: "建造舱", title: "基础设施与 DevOps 席", mission: "搭建云基础设施、CI/CD、可观测性与安全" },
  { id: "wind_balance_officer", name: "星风平衡官", cabin: "build", cabinName: "建造舱", title: "测试验收与质量保障席", mission: "定义验收标准、设计测试用例、系统性找茬" },
  { id: "trajectory_pilot", name: "航道领航员", cabin: "build", cabinName: "建造舱", title: "项目经理/节奏主控席", mission: "拆解任务、设定里程碑、守住项目节奏" },
  { id: "meteor_sharpshooter", name: "流星神射手", cabin: "build", cabinName: "建造舱", title: "精准营销与增长实验席", mission: "设计低成本营销实验、渠道投放与增长闭环" },
  // 治理舱（深紫色星光）
  { id: "shuttle_herald", name: "飞梭传令官", cabin: "govern", cabinName: "治理舱", title: "渠道分发与运营落地席", mission: "把产品精准送达到目标用户并完成运营承接" },
  { id: "star_dock_keeper", name: "星坞守门人", cabin: "govern", cabinName: "治理舱", title: "社区入口筛选与规则守护席", mission: "严选成员准入、执行社区公约、守住群体边界" },
  { id: "fleet_commander", name: "舰队司令官", cabin: "govern", cabinName: "治理舱", title: "跨职能资源协同席", mission: "协调跨舱职能、配置资源、消解部门墙" },
  { id: "star_covenant_observer", name: "星约监督者", cabin: "govern", cabinName: "治理舱", title: "规则制定与治理结构席", mission: "设计协作规则、权责边界与分布式治理机制" },
  { id: "meteor_tactician", name: "陨星参谋师", cabin: "govern", cabinName: "治理舱", title: "风险控制与应急决策席", mission: "识别黑天鹅风险，准备预案与危机应对" },
  { id: "voyage_archivist", name: "远航编年史家", cabin: "govern", cabinName: "治理舱", title: "协作航迹记录与复盘席", mission: "记录创新航迹、沉淀失败经验与组织记忆" },
  { id: "star_bridge_engineer", name: "星桥工程师", cabin: "govern", cabinName: "治理舱", title: "人际信任与冲突调解席", mission: "建设跨个体信任、调解冲突、维系长期协作" },
];

export const DIMENSION_META: { id: string; name: string; field: string; desc: string }[] = [
  { id: "curiosity", name: "好奇心", field: "探索舱", desc: "主动追问与发现新问题的意愿" },
  { id: "abstract", name: "抽象能力", field: "探索舱", desc: "从现象提炼结构与模型的能力" },
  { id: "imagination", name: "想象力", field: "探索舱", desc: "构建不存在的可能性与愿景" },
  { id: "ambiguity", name: "模糊容忍", field: "探索舱", desc: "在不确定中推进与保持开放" },
  { id: "systematic", name: "系统思维", field: "建造舱", desc: "结构化拆解与全局权衡" },
  { id: "executing", name: "执行力", field: "建造舱", desc: "把计划稳定落地与闭环交付" },
  { id: "empathy", name: "共情力", field: "治理舱", desc: "理解他人处境与真实需求" },
  { id: "communication", name: "协作表达", field: "治理舱", desc: "清晰表达、对齐与推动共识" },
];

export const DIMENSIONS = DIMENSION_META.map((d) => d.id);

export interface PhaseDef {
  id: string;
  name: string;
  category: "explore" | "build" | "govern";
  nameEn: string;
}

export const MISSION_PHASES: PhaseDef[] = [
  { id: "intel_analysis", name: "靶源情报", category: "explore", nameEn: "Target Intel" },
  { id: "positioning", name: "项目定位", category: "explore", nameEn: "Positioning" },
  { id: "prototype_build", name: "原型锻造", category: "build", nameEn: "Prototype" },
  { id: "trial_voyage", name: "实测试航", category: "build", nameEn: "Sea Trial" },
  { id: "maiden_voyage", name: "公测首航", category: "build", nameEn: "Maiden Voyage" },
  { id: "archive_retrospect", name: "归档复盘", category: "govern", nameEn: "Retrospect" },
];

export const AGENT_NAMES = [
  "Navigator 01",
  "Cargo Agent 02",
  "Engineer AI 03",
  "Logistics 04",
  "Shield 05",
];

export const HONOR_TITLES = ["Captain", "Pioneer", "Navigator", "Explorer", "Sailor"];

export const ROLE_NAMES: Record<string, string> = {
  member: "会员",
  fleet_commander: "舰队司令官",
  builder: "建造者",
  researcher: "研究员",
  curator: "星坞守门人",
  platform_admin: "平台管理员",
};

export type UserRole =
  | "member"
  | "fleet_commander"
  | "builder"
  | "researcher"
  | "curator"
  | "platform_admin"
  | "club_operator"
  | "club_governor"
  | "governor";

export const ROLE_SEAT_HINT: Record<string, string[]> = {
  fleet_commander: ["fleet_commander"],
  builder: ["engine_chief", "mechanical_designer", "star_blacksmith", "circuit_runner"],
  researcher: ["star_chart_scholar", "interstellar_scout", "quantum_hypothesist"],
  curator: ["star_dock_keeper"],
};

export function seatById(id: string): SeatDef | undefined {
  return SEATS.find((s) => s.id === id);
}

export function cabinSeats(cabin: Cabin): SeatDef[] {
  return SEATS.filter((s) => s.cabin === cabin);
}
