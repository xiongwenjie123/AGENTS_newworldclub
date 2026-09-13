import "server-only";
import { db } from "@/lib/db";
import { sysUser, expeditionPassportSnapshot, fleet, fleetSeatAssignment } from "@/storage/database/shared/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { SEATS, AGENT_NAMES, type Cabin } from "@/lib/domain";

export interface SeatAssign {
  seatId: string;
  seatName: string;
  cabin: Cabin;
  assignType: "human" | "agent" | "vacant";
  assignedUserId?: string | null;
  nickname?: string | null;
  civilizationNo?: string | null;
  agentAlias?: string | null;
  matchScore: number;
  assignComment: string;
}

export interface FleetPlan {
  fleetId?: string;
  fleetNo?: string;
  assignments: SeatAssign[];
  humanCount: number;
  agentCount: number;
  strategy: string;
  riskLevel: "low" | "mid" | "high";
  riskNote: string[];
}

/** 读取候选池成员及其最新航行档案 */
export async function getCandidates(): Promise<
  {
    userId: string;
    nickname: string;
    civilizationNo: string;
    avatarUrl: string | null;
    honorTitle: string;
    cognitiveStyleTags: string[];
    seatFullScore: Record<string, number>;
    eightDimScore: Record<string, number>;
    starCount: number;
    missionCount: number;
    apuCredit: number;
  }[]
> {
  const dbi = await db();
  const users = await dbi
    .select()
    .from(sysUser)
    .where(and(eq(sysUser.inCandidatePool, true), isNull(sysUser.deletedAt)));

  const result: Awaited<ReturnType<typeof getCandidates>> = [];
  for (const u of users) {
    const snap = await dbi
      .select()
      .from(expeditionPassportSnapshot)
      .where(eq(expeditionPassportSnapshot.userId, u.userId))
      .orderBy(desc(expeditionPassportSnapshot.passportVersionNo))
      .limit(1);
    const p = snap[0];
    if (!p) continue;
    result.push({
      userId: u.userId,
      nickname: u.nickname,
      civilizationNo: u.civilizationNo,
      avatarUrl: u.avatarUrl,
      honorTitle: p.honorTitle,
      cognitiveStyleTags: p.cognitiveStyleTags as string[],
      seatFullScore: p.seatFullScore as Record<string, number>,
      eightDimScore: p.eightDimScore as Record<string, number>,
      starCount: p.starCount ?? 0,
      missionCount: p.missionCount ?? 0,
      apuCredit: Number(p.apuCreditSim ?? 0),
    });
  }
  return result;
}

interface ComposeInput {
  mustHumanSeats: string[]; // seat_id 列表
  strategy: "balanced" | "explore_heavy" | "build_fast";
  excludeUserIds?: string[];
}

/**
 * 组舰算法：
 * 1. 从候选池取人；2. 强制人工席位优先真人；
 * 3. 每个席位按适配分贪心匹配（一人一席）；
 * 4. 低匹配席位回退 Agent 补位（琥珀橙待确认）；
 * 5. 输出风险评估与 Agent 补位清单。
 */
type Candidate = {
  userId: string;
  nickname: string;
  civilizationNo: string;
  avatarUrl: string | null;
  honorTitle: string;
  cognitiveStyleTags: string[];
  seatFullScore: Record<string, number>;
  eightDimScore: Record<string, number>;
  starCount: number;
  missionCount: number;
  apuCredit: number;
};

export function composeFleet(candidates: Candidate[], input: ComposeInput): FleetPlan {
  const pool = candidates.filter((c) => !input.excludeUserIds?.includes(c.userId));
  const usedUser = new Set<string>();
  const assignments: SeatAssign[] = [];
  let agentIdx = 0;
  const riskNote: string[] = [];

  // 策略权重：探索重型/建造加速 调整匹配阈值
  const threshold = input.strategy === "build_fast" ? 60 : input.strategy === "explore_heavy" ? 58 : 65;

  // 先排强制人工席位
  const orderedSeats = [...SEATS].sort((a, b) => {
    const am = input.mustHumanSeats.includes(a.id) ? 1 : 0;
    const bm = input.mustHumanSeats.includes(b.id) ? 1 : 0;
    return bm - am;
  });

  for (const seat of orderedSeats) {
    // 为该席位找最高分且未被占用的候选人
    let best: (typeof pool)[number] | null = null;
    let bestScore = -1;
    for (const c of pool) {
      if (usedUser.has(c.userId)) continue;
      let score = c.seatFullScore?.[seat.id] ?? 0;
      // 策略加成
      if (input.strategy === "explore_heavy" && seat.cabin === "explore") score += 5;
      if (input.strategy === "build_fast" && seat.cabin === "build") score += 5;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }

    const mustHuman = input.mustHumanSeats.includes(seat.id);

    if (best && bestScore >= threshold) {
      usedUser.add(best.userId);
      assignments.push({
        seatId: seat.id,
        seatName: seat.name,
        cabin: seat.cabin,
        assignType: "human",
        assignedUserId: best.userId,
        nickname: best.nickname,
        civilizationNo: best.civilizationNo,
        matchScore: bestScore,
        assignComment: mustHuman
          ? `强制人工席位，适配分 ${bestScore}`
          : `候选池最高适配分 ${bestScore}`,
      });
    } else if (best && mustHuman) {
      // 强制人工但分数偏低：仍分配真人并标风险
      usedUser.add(best.userId);
      assignments.push({
        seatId: seat.id,
        seatName: seat.name,
        cabin: seat.cabin,
        assignType: "human",
        assignedUserId: best.userId,
        nickname: best.nickname,
        civilizationNo: best.civilizationNo,
        matchScore: bestScore,
        assignComment: `强制人工席位，适配分偏低 ${bestScore}，建议人工复核`,
      });
      riskNote.push(`强制人工席位「${seat.name}」候选适配分仅 ${bestScore}，人才缺口。`);
    } else {
      // Agent 补位
      const alias = AGENT_NAMES[agentIdx % AGENT_NAMES.length];
      agentIdx++;
      assignments.push({
        seatId: seat.id,
        seatName: seat.name,
        cabin: seat.cabin,
        assignType: "agent",
        agentAlias: alias,
        matchScore: 0,
        assignComment: mustHuman
          ? "候选池无合格人选，暂由 Agent 补位，等待人工确认/替换"
          : "低匹配席位回退，由舰载 Agent 自动补位",
      });
      if (mustHuman) {
        riskNote.push(`强制人工席位「${seat.name}」无真人候选，当前为 Agent 临时补位，须人工招募确认。`);
      }
    }
  }

  const humanCount = assignments.filter((a) => a.assignType === "human").length;
  const agentCount = assignments.filter((a) => a.assignType === "agent").length;

  let riskLevel: FleetPlan["riskLevel"] = "low";
  if (agentCount >= 8) riskLevel = "high";
  else if (agentCount >= 4) riskLevel = "mid";
  if (riskNote.some((n) => n.includes("强制人工"))) riskLevel = riskLevel === "low" ? "mid" : riskLevel;

  const strategyName =
    input.strategy === "explore_heavy" ? "探索优先（重创新）" : input.strategy === "build_fast" ? "建造加速（重交付）" : "均衡稳健";

  return {
    assignments,
    humanCount,
    agentCount,
    strategy: strategyName,
    riskLevel,
    riskNote,
  };
}

/** 生成 3 套候选舰队方案 */
export async function generateFleetPlans(input: ComposeInput): Promise<FleetPlan[]> {
  const candidates = await getCandidates();
  const strategies: ComposeInput["strategy"][] = ["balanced", "explore_heavy", "build_fast"];
  // 三套方案通过策略差异 + 排除已用首选，形成差异化
  const plans: FleetPlan[] = [];
  const exclude: string[] = [...(input.excludeUserIds ?? [])];
  for (const s of strategies) {
    const plan = composeFleet(candidates, { ...input, strategy: s, excludeUserIds: exclude });
    plans.push(plan);
    // 下一方案排除本方案高分真人，制造方案差异
    plan.assignments
      .filter((a) => a.assignType === "human" && a.assignedUserId)
      .slice(0, 6)
      .forEach((a) => a.assignedUserId && exclude.push(a.assignedUserId));
  }
  return plans;
}

/** 持久化选定的舰队方案 */
export async function persistFleet(params: {
  missionId: string;
  commanderUserId: string;
  plan: FleetPlan;
  isPrimary?: boolean;
  isDemo?: boolean;
}): Promise<string> {
  const dbi = await db();
  const fleetNo = `FL-${Date.now().toString(36).toUpperCase()}`;
  const inserted = await dbi
    .insert(fleet)
    .values({
      fleetNo: fleetNo,
      missionId: params.missionId,
      fleetCommanderUserId: params.commanderUserId,
      fleetStatus: "pending",
      isPrimary: params.isPrimary ?? true,
      fleetGenerationLogJson: {
        strategy: params.plan.strategy,
        humanCount: params.plan.humanCount,
        agentCount: params.plan.agentCount,
        riskLevel: params.plan.riskLevel,
        riskNote: params.plan.riskNote,
      },
      isDemo: params.isDemo ?? false,
    })
    .returning({ fleetId: fleet.fleetId });

  const fleetId = inserted[0].fleetId;
  const values = params.plan.assignments.map((a) => ({
    fleetId: fleetId,
    seatName: a.seatName,
    cabin: a.cabin,
    assignType: a.assignType,
    assignedUserId: a.assignedUserId ?? null,
    agentAlias: a.agentAlias ?? null,
    matchScore: a.matchScore,
    assignComment: a.assignComment,
  }));
  if (values.length > 0) {
    await dbi.insert(fleetSeatAssignment).values(values);
  }
  return fleetId;
}
