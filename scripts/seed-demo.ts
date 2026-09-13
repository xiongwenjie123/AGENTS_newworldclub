/**
 * 演示数据种子：一键生成 New World Club MVP 演示数据
 * - 1 个舰长 + 1 个管理员 + 21 个候选池成员（真实登录账号）
 * - 每人一份初始航行档案快照（雷达画像，便于组舰演示）
 * - 1 个完整 Mission + 1 套舰队（18 真人 + 3 Agent 补位）
 * - Mission 前 3 阶段产出物 + Agent 调用日志
 */
import { db } from "@/lib/db";
import {
  sysUser,
  expeditionPassportSnapshot,
  mission,
  fleet,
  fleetSeatAssignment,
  missionPhaseOutput,
  shipIntelligenceAgentCallLog,
  expeditionQuestion,
  apuCreditRecord,
  demoPresetSnapshot,
} from "@/storage/database/shared/schema";
import { hashPassword } from "@/lib/auth";
import { SEATS, DIMENSIONS, MISSION_PHASES, AGENT_NAMES, CABIN_META } from "@/lib/domain";
import { eq } from "drizzle-orm";

const DEMO_PASSWORD = "demo123456";

interface DemoPersona {
  nickname: string;
  role: string;
  // 画像：偏向的舱与强弱项
  strong: string[]; // 维度高分
  weak?: string[];
  tags: string[];
}

const PERSONAS: DemoPersona[] = [
  { nickname: "林远征", role: "fleet_commander", strong: ["communication", "empathy", "systematic"], tags: ["舰队司令官", "跨舱协调者"] },
  { nickname: "沈星澜", role: "member", strong: ["curiosity", "imagination", "abstract"], weak: ["executing"], tags: ["愿景构想者", "混沌探索者"] },
  { nickname: "陆时衍", role: "member", strong: ["systematic", "executing", "abstract"], tags: ["结构主义拆解派", "闭环执行者"] },
  { nickname: "苏野", role: "member", strong: ["curiosity", "empathy"], weak: ["systematic"], tags: ["田野洞察者", "共情表达者"] },
  { nickname: "顾知行", role: "member", strong: ["abstract", "systematic"], weak: ["communication"], tags: ["第一性追问者", "独立思考者"] },
  { nickname: "江晚吟", role: "member", strong: ["imagination", "communication", "empathy"], tags: ["叙事创作者", "星光诗人"] },
  { nickname: "程立", role: "builder", strong: ["executing", "systematic"], weak: ["imagination"], tags: ["引擎架构师", "稳定交付者"] },
  { nickname: "魏来", role: "researcher", strong: ["curiosity", "abstract", "ambiguity"], tags: ["趋势推演者", "情报猎手"] },
  { nickname: "韩墨", role: "member", strong: ["imagination", "curiosity"], weak: ["executing", "systematic"], tags: ["灵感发散者", "概念设计师"] },
  { nickname: "秦朗", role: "builder", strong: ["executing", "systematic"], tags: ["全栈锻铁匠", "快速原型手"] },
  { nickname: "许潮生", role: "member", strong: ["empathy", "communication"], weak: ["abstract"], tags: ["信任建设者", "冲突调解者"] },
  { nickname: "白舟", role: "curator", strong: ["empathy", "systematic", "communication"], tags: ["星坞守门人", "规则守护者"] },
  { nickname: "方屿", role: "member", strong: ["systematic", "executing", "empathy"], tags: ["质量把关者", "试航员"] },
  { nickname: "闻人越", role: "member", strong: ["abstract", "imagination", "ambiguity"], weak: ["executing"], tags: ["量子假设师", "证伪高手"] },
  { nickname: "商陆", role: "member", strong: ["executing", "communication"], tags: ["增长实验师", "流星射手"] },
  { nickname: "岳鸣", role: "member", strong: ["systematic", "curiosity"], tags: ["知识库管家", "星匣收藏家"] },
  { nickname: "钟予安", role: "member", strong: ["empathy", "executing"], weak: ["abstract"], tags: ["运营落地者", "飞梭传令官"] },
  { nickname: "骆星河", role: "member", strong: ["imagination", "systematic"], tags: ["产品造物师", "体验设计者"] },
  { nickname: "高岚", role: "member", strong: ["executing", "systematic", "communication"], tags: ["航道领航员", "节奏主控"] },
  { nickname: "温故", role: "member", strong: ["abstract", "empathy", "communication"], tags: ["编年史家", "复盘提炼者"] },
  { nickname: "苏黎", role: "member", strong: ["curiosity", "imagination", "communication"], weak: ["executing"], tags: ["品牌叙事者", "灵感捕手"] },
  { nickname: "卫珩", role: "member", strong: ["systematic", "ambiguity", "executing"], tags: ["风险参谋师", "预案设计者"] },
  { nickname: "聂云", role: "member", strong: ["executing", "systematic"], weak: ["empathy"], tags: ["布线工程师", "基础设施守卫"] },
];

function rand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function dimScores(persona: DemoPersona, seed: number): Record<string, number> {
  const r = rand(seed);
  const scores: Record<string, number> = {};
  for (const d of DIMENSIONS) {
    let base = 52 + Math.round(r() * 18);
    if (persona.strong.includes(d)) base = 78 + Math.round(r() * 16);
    if (persona.weak?.includes(d)) base = 32 + Math.round(r() * 16);
    scores[d] = Math.max(10, Math.min(98, base));
  }
  return scores;
}

function seatScores(dims: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const seat of SEATS) {
    const sd =
      seat.cabin === "explore"
        ? ["curiosity", "abstract", "imagination", "ambiguity"]
        : seat.cabin === "build"
          ? ["systematic", "executing"]
          : ["empathy", "communication"];
    const avg = sd.reduce((s, d) => s + (dims[d] ?? 50), 0) / sd.length;
    out[seat.id] = Math.max(5, Math.min(98, Math.round(avg + (r0() - 0.5) * 10)));
  }
  return out;
}
let _r = rand(7);
function r0() {
  return _r();
}

export async function seedDemoData(): Promise<{ users: number; missionId: string; fleetId: string }> {
  const dbi = await db();

  // 清理旧演示数据（幂等）
  const { sql } = await import("drizzle-orm");
  const cleanupStmts = [
    sql`DELETE FROM exam_answer_record`,
    sql`DELETE FROM exam_report`,
    sql`DELETE FROM exam_paper_assign`,
    sql`DELETE FROM exam_paper`,
    sql`DELETE FROM exam_official_question`,
    sql`DELETE FROM innovate_trace_export_log`,
    sql`DELETE FROM mission_collaborate_feedback`,
    sql`DELETE FROM ship_intelligence_agent_call_log`,
    sql`DELETE FROM mission_phase_output`,
    sql`DELETE FROM fleet_seat_assignment`,
    sql`DELETE FROM fleet`,
    sql`DELETE FROM mission`,
    sql`DELETE FROM expedition_test_session`,
    sql`DELETE FROM expedition_passport_snapshot`,
    sql`DELETE FROM apu_credit_record`,
    sql`DELETE FROM sys_user WHERE is_demo = true`,
  ];
  for (const stmt of cleanupStmts) {
    await dbi.execute(stmt);
  }

  const passwordHash = hashPassword(DEMO_PASSWORD);
  let civNum = 2024;
  const createdUsers: { userId: string; nickname: string; seatScores: Record<string, number>; dims: Record<string, number> }[] = [];

  for (let i = 0; i < PERSONAS.length; i++) {
    const p = PERSONAS[i];
    const civNo = `NW-${civNum++}`;
    const dims = dimScores(p, 100 + i * 13);
    const seats = seatScores(dims);
    const inserted = await dbi
      .insert(sysUser)
      .values({
        loginType: "email",
        email: `demo${i + 1}@newworld.club`,
        passwordHash: passwordHash,
        nickname: p.nickname,
        civilizationNo: civNo,
        role: p.role,
        inCandidatePool: true,
        isDemo: true,
        privacySetting: { show_full_seats: false, authorized_fleets: [], allow_ai_training: false },
      })
      .returning({ userId: sysUser.userId });

    const userId = inserted[0].userId;
    createdUsers.push({ userId, nickname: p.nickname, seatScores: seats, dims });

    await dbi.insert(expeditionPassportSnapshot).values({
      userId: userId,
      passportVersionNo: 1,
      snapshotSourceType: "test",
      eightDimScore: dims,
      cognitiveStyleTags: p.tags,
      seatFullScore: seats,
      seatExplainBasis: SEATS.slice(0, 6).map((s) => ({
        target_item: s.name,
        score: seats[s.id],
        basis_text: `演示画像：${p.tags.join("、")}，在「${s.name}」相关行为上表现稳定。`,
      })),
      honorTitle: Math.max(...Object.values(seats)) >= 85 ? "Captain" : Math.max(...Object.values(seats)) >= 72 ? "Navigator" : "Explorer",
      starCount: Math.floor(i / 3),
      apuCreditSim: String(120 + i * 17),
      missionCount: Math.floor(i / 4),
      collaboratorSeatEvalJson: {},
      snapshotComment: "演示数据：登舰测试测绘生成",
      isDemo: true,
    });

    await dbi.insert(apuCreditRecord).values({
      userId: userId,
      changeAmount: "120.00",
      balanceAfter: String(120 + i * 17),
      reason: "演示初始 APU 凭证",
      isDemo: true,
    });
  }

  // 平台管理员
  await dbi
    .insert(sysUser)
    .values({
      loginType: "email",
      email: "admin@newworld.club",
      passwordHash: passwordHash,
      nickname: "星坞管理员",
      civilizationNo: `NW-${civNum++}`,
      role: "platform_admin",
      inCandidatePool: false,
      isDemo: true,
    })
    .onConflictDoNothing();

  const commander = createdUsers[0]; // 林远征 舰长

  // 创建 Mission
  const missionInserted = await dbi
    .insert(mission)
    .values({
      missionNo: "MISSION-DEMO-001",
      missionName: "星际探索者协作平台 V1 公测首航",
      missionBackground:
        "新大陆俱乐部首个公测使命：验证「21 席·灵魂协作操作系统」能否把一群能力互补的陌生人，组建成一艘真正能远航的星舰。",
      missionGoal: "在一个公测周期内，完成从情报、定位、原型、试航到首航的完整闭环，并产出可归档的协作航迹。",
      missionTags: ["AI协作", "组织创新", "公测"],
      mustHumanSeats: ["fleet_commander", "star_dock_keeper", "engine_chief"],
      missionStatus: "in_progress",
      currentPhase: "prototype_build",
      creatorUserId: commander.userId,
      isDemo: true,
    })
    .returning({ missionId: mission.missionId });
  const missionId = missionInserted[0].missionId;

  // 组舰：前 18 人分配，后 3 席 Agent 补位
  const fleetInserted = await dbi
    .insert(fleet)
    .values({
      fleetNo: "FL-DEMO-001",
      missionId: missionId,
      fleetCommanderUserId: commander.userId,
      fleetStatus: "active",
      isPrimary: true,
      fleetGenerationLogJson: {
        strategy: "均衡稳健",
        humanCount: 18,
        agentCount: 3,
        riskLevel: "mid",
        riskNote: ["3 个低匹配席位由舰载 Agent 补位，等待公测中人工招募替换。"],
      },
      isDemo: true,
    })
    .returning({ fleetId: fleet.fleetId });
  const fleetId = fleetInserted[0].fleetId;

  // 为前 18 个席位匹配最合适的真人（贪心）
  const used = new Set<string>();
  type SeatInsert = typeof fleetSeatAssignment.$inferInsert;
  const seatValues: SeatInsert[] = [];
  const humanSeats = SEATS.slice(0, 18);
  for (const seat of humanSeats) {
    let best: (typeof createdUsers)[number] | null = null;
    let bestScore = -1;
    for (const u of createdUsers) {
      if (used.has(u.userId)) continue;
      const sc = u.seatScores[seat.id] ?? 0;
      if (sc > bestScore) {
        bestScore = sc;
        best = u;
      }
    }
    if (best) {
      used.add(best.userId);
      seatValues.push({
        fleetId: fleetId,
        seatName: seat.name,
        cabin: seat.cabin,
        assignType: "human",
        assignedUserId: best.userId,
        matchScore: bestScore,
        assignComment: `候选池最高适配分 ${bestScore}`,
      });
    }
  }
  // 后 3 席 Agent 补位
  for (let i = 18; i < SEATS.length; i++) {
    seatValues.push({
      fleetId: fleetId,
      seatName: SEATS[i].name,
      cabin: SEATS[i].cabin,
      assignType: "agent",
      agentAlias: AGENT_NAMES[i - 18] ?? `Agent ${i}`,
      matchScore: 0,
      assignComment: "低匹配席位回退，由舰载 Agent 自动补位（待人工确认）",
    });
  }
  await dbi.insert(fleetSeatAssignment).values(seatValues);

  // 前 3 阶段产出物
  const phaseOutputs = [
    {
      phase: "intel_analysis",
      title: "靶源情报：AI 原生组织赛道扫描",
      content:
        "完成 12 个竞品与 3 份政策报告的扫描。核心发现：现有协作工具都在优化「任务流」，无人沉淀「人的协作行为资产」——这正是新大陆的空白带。",
      status: "confirmed",
      agent: false,
    },
    {
      phase: "positioning",
      title: "项目定位：灵魂协作操作系统",
      content:
        "定位收敛：不做又一个项目管理工具，而做「以航行档案为私有资产、以 21 席互补组舰为核心」的协作操作系统。简历无关，行为即档案。",
      status: "confirmed",
      agent: true,
    },
    {
      phase: "prototype_build",
      title: "原型锻造：组舰工作台 MVP（Agent 补位待确认）",
      content:
        "已完成组舰工作台原型：三舱 21 席左侧排布、Mission-Graph 中央、Agent 补位琥珀橙标记。当前 3 个 Agent 补位席位等待人工确认替换。",
      status: "pending_confirm",
      agent: true,
    },
  ];

  for (let i = 0; i < phaseOutputs.length; i++) {
    const ph = phaseOutputs[i];
    await dbi.insert(missionPhaseOutput).values({
      missionId: missionId,
      fleetId: fleetId,
      phaseName: ph.phase,
      submitUserId: ph.agent ? null : createdUsers[i % createdUsers.length].userId,
      outputTitle: ph.title,
      outputContentText: ph.content,
      phaseStatus: ph.status,
      confirmUserId: ph.status === "confirmed" ? commander.userId : null,
    });

    if (ph.agent) {
      await dbi.insert(shipIntelligenceAgentCallLog).values({
        missionId: missionId,
        fleetId: fleetId,
        agentName: i === 1 ? "Navigator 01" : "Engineer AI 03",
        callTriggerUserId: commander.userId,
        userInstruction: ph.title,
        agentInputPrompt: `基于当前 Mission 上下文与候选池档案，生成「${ph.phase}」阶段产出草稿。`,
        llmModelName: "doubao-seed-2-0-lite",
        llmRawOutput: ph.content,
        humanOperationType: ph.status === "confirmed" ? "confirmed" : null,
        humanModifyContent: ph.status === "confirmed" ? "舰长补充了公测周期约束。" : null,
        tokenConsumedInput: 860 + i * 40,
        tokenConsumedOutput: 420 + i * 30,
        callCostTimeMs: 3200 + i * 500,
        isDemo: true,
      });
    }
  }

  return { users: createdUsers.length + 1, missionId, fleetId };
}

/** 登舰测试演示题目（幂等写入） */
export async function seedQuestions(): Promise<number> {
  const dbi = await db();
  const questions = [
    { title: "请讲一次你在信息极度不完整时，仍主动做出判断并推进的真实经历。你当时依据的是什么？", tag: "explore", order: 1 },
    { title: "当团队陷入方向分歧、久议不决时，你通常会怎么做？请描述一个你亲身经历的场景。", tag: "govern", order: 2 },
    { title: "描述一个你从零到一完成的复杂任务：你如何拆解、排期、兜底，并确保最终闭环交付？", tag: "build", order: 3 },
    { title: "你有没有过一个大多数人不理解、但你坚持探索的想法或爱好？它后来怎么样了？", tag: "explore", order: 4 },
    { title: "回忆一次你与他人发生激烈分歧或冲突的经历，你是如何处理的，结果如何？", tag: "govern", order: 5 },
  ];
  let count = 0;
  for (const q of questions) {
    await dbi
      .insert(expeditionQuestion)
      .values({
        questionTitle: q.title,
        questionTag: q.tag,
        sortOrder: q.order,
        isActive: true,
      })
      .onConflictDoNothing();
    count++;
  }
  void MISSION_PHASES;
  return count;
}
export async function seedDemoPresets(): Promise<number> {
  const dbi = await db();

  const alphaDims: Record<string, number> = {
    curiosity: 92, abstract: 85, imagination: 90, ambiguity: 88,
    systematic: 45, executing: 50, empathy: 65, communication: 60,
  };
  const betaDims: Record<string, number> = {
    curiosity: 50, abstract: 55, imagination: 45, ambiguity: 40,
    systematic: 92, executing: 90, empathy: 85, communication: 80,
  };

  function calcSeatScores(dims: Record<string, number>): Record<string, number> {
    const scores: Record<string, number> = {};
    for (const seat of SEATS) {
      const relevantDims: string[] = CABIN_META[seat.cabin].dims ?? [];
      if (relevantDims.length === 0) {
        scores[seat.id] = 50;
      } else {
        const sum = relevantDims.reduce((acc: number, d: string) => acc + (dims[d] ?? 50), 0);
        scores[seat.id] = Math.round(sum / relevantDims.length);
      }
    }
    return scores;
  }

  const presets = [
    {
      presetLabel: "alpha",
      presetName: "探索者 Alpha",
      eightDimScore: alphaDims,
      seatFullScore: calcSeatScores(alphaDims),
      cognitiveStyleTags: "发散思维,直觉驱动,模糊容忍",
      honorTitle: "星穹探索者",
      starCount: 3,
      missionCount: 2,
      description: "高好奇心/想象力/模糊容忍，低系统思维/执行力——典型探索舱人格",
    },
    {
      presetLabel: "beta",
      presetName: "建造者 Beta",
      eightDimScore: betaDims,
      seatFullScore: calcSeatScores(betaDims),
      cognitiveStyleTags: "收敛思维,系统规划,稳健执行",
      honorTitle: "深空建造者",
      starCount: 4,
      missionCount: 3,
      description: "高系统思维/执行力/共情，低好奇心/想象力——典型建造舱人格",
    },
  ];

  let count = 0;
  for (const p of presets) {
    const existing = await dbi
      .select()
      .from(demoPresetSnapshot)
      .where(eq(demoPresetSnapshot.presetLabel, p.presetLabel))
      .limit(1);
    if (existing.length === 0) {
      await dbi.insert(demoPresetSnapshot).values(p);
      count++;
    }
  }
  return count;
}
