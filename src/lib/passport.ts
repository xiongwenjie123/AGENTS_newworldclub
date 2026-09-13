import "server-only";
import { db } from "@/lib/db";
import { expeditionPassportSnapshot, expeditionTestSession, missionCollaborateFeedback } from "@/storage/database/shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { llmJson } from "@/lib/llm";
import { SEATS, DIMENSIONS, HONOR_TITLES, type Cabin } from "@/lib/domain";
import { loadTemplateFilled } from "@/lib/prompt-templates";

export interface SeatScore {
  seat: string;
  score: number;
  cabin: Cabin;
  basis: string;
}

export interface PassportData {
  eightDimScore: Record<string, number>;
  cognitiveStyleTags: string[];
  seatFullScore: Record<string, number>;
  seatExplainBasis: { target_item: string; score: number; basis_text: string }[];
  honorTitle: string;
}

/**
 * 调用舰载智能解析登舰测试答卷：
 * 输出 8 维能力分 + 认知风格标签，再由规则映射为 21 席适配分。
 */
export async function analyzeAnswers(
  answers: { questionTitle: string; answer: string }[],
  opts: { forwardHeaders?: Record<string, string> } = {}
): Promise<{ data: PassportData; raw: unknown; sessionStatus: string; errorMsg: string | null }> {
  const dimsText = [
    "curiosity 好奇心：主动追问与发现新问题",
    "abstract 抽象能力：从现象提炼结构与模型",
    "imagination 想象力：构建不存在的可能性",
    "ambiguity 模糊容忍：不确定中推进与保持开放",
    "systematic 系统思维：结构化拆解与全局权衡",
    "executing 执行力：计划稳定落地与闭环交付",
    "empathy 共情力：理解他人处境与需求",
    "communication 协作表达：清晰表达与推动共识",
  ].join("\n");

  const answerText = answers
    .map((a, i) => `第${i + 1}题：${a.questionTitle}\n回答：${a.answer}`)
    .join("\n\n");

  const sys = (await loadTemplateFilled("passport_analyze_answers", { dimsText })) ?? `你是新大陆俱乐部舰载智能「航行档案测绘官」。根据用户完成的登舰测试开放题答卷，分析其真实协作能力画像。
请严格输出 JSON，字段如下：
{
  "eight_dim_score": { 8 个维度，每个 0-100 整数 },
  "cognitive_style_tags": ["3-5 个中文认知风格标签，如 结构主义拆解派/共情表达者/混沌探索者/闭环执行者/愿景构想者"],
  "dim_basis": { "每个维度一句行为依据" }
}
维度清单（键名必须严格一致）：
${dimsText}
评分依据必须来自答卷中描述的具体行为，不能凭空编造。只输出 JSON。`;

  try {
    const parsed = await llmJson<{
      eight_dim_score?: Record<string, number>;
      cognitive_style_tags?: unknown[];
      dim_basis?: Record<string, string>;
    }>(
      [
        { role: "system", content: sys },
        { role: "user", content: answerText },
      ],
      { forwardHeaders: opts.forwardHeaders, temperature: 0.3 }
    );

    // 归一化维度分
    const eightDimScore: Record<string, number> = {};
    for (const d of DIMENSIONS) {
      const v = Number(parsed.eight_dim_score?.[d]);
      eightDimScore[d] = Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 50;
    }
    const tags = Array.isArray(parsed.cognitive_style_tags)
      ? parsed.cognitive_style_tags.map(String).slice(0, 5)
      : [];

    // 规则映射：席位适配分 = 其所属舱相关维度的加权 + 轻量 LLM 自由文本解释
    const seatFullScore: Record<string, number> = {};
    const seatExplainBasis: PassportData["seatExplainBasis"] = [];
    for (const seat of SEATS) {
      const dims =
        seat.cabin === "explore"
          ? ["curiosity", "abstract", "imagination", "ambiguity"]
          : seat.cabin === "build"
            ? ["systematic", "executing"]
            : ["empathy", "communication"];
      const avg = dims.reduce((sum, d) => sum + (eightDimScore[d] ?? 50), 0) / dims.length;
      // 席位级微调：根据席位特性偏向某个维度
      const bonus = seatBonus(seat.id, eightDimScore);
      const score = Math.max(0, Math.min(100, Math.round(avg + bonus)));
      seatFullScore[seat.id] = score;
      seatExplainBasis.push({
        target_item: seat.name,
        score,
        basis_text: buildBasis(seat, eightDimScore, parsed.dim_basis),
      });
    }

    const honorTitle = pickHonorTitle(seatFullScore);

    return {
      data: { eightDimScore, cognitiveStyleTags: tags, seatFullScore, seatExplainBasis, honorTitle },
      raw: parsed,
      sessionStatus: "parsed",
      errorMsg: null,
    };
  } catch (e) {
    // LLM 不可用（如资源点不足/超时）时，使用基于答卷关键词的规则引擎兜底，产出差异化画像
    const rule = ruleBasedAnalyze(answers);
    return {
      data: rule.data,
      raw: null,
      sessionStatus: "parsed",
      errorMsg: "舰载智能暂不可用，已使用本地规则引擎生成画像：" + (e instanceof Error ? e.message : String(e)),
    };
  }
}

/** 规则引擎：根据答卷关键词命中情况估算 8 维分（LLM 不可用时的差异化兜底） */
function ruleBasedAnalyze(answers: { questionTitle: string; answer: string }[]): { data: PassportData } {
  const text = answers.map((a) => a.answer).join(" ");
  const kw: Record<string, string[]> = {
    curiosity: ["好奇", "追问", "探索", "发现", "为什么", "研究", "新", "未知", "观察"],
    abstract: ["提炼", "模型", "抽象", "结构", "框架", "本质", "归纳", "系统", "规律", "逻辑"],
    imagination: ["想象", "设想", "创意", "可能", "未来", "天马", "灵感", "假设", "如果", "愿景"],
    ambiguity: ["不完整", "不确定", "模糊", "边做边", "试错", "开放", "动态", "没有答案", "推进", "未知"],
    systematic: ["拆解", "计划", "里程碑", "体系", "流程", "全局", "排期", "结构化", "复盘", "模块"],
    executing: ["落地", "交付", "闭环", "执行", "完成", "按期", "兜底", "排期", "推进", "上线", "做出来"],
    empathy: ["倾听", "理解", "共情", "用户", "对方", "感受", "需求", "站在", "换位思考", "帮助"],
    communication: ["共识", "沟通", "协调", "表达", "说服", "团队", "协作", "对齐", "主持", "推动"],
  };
  const eightDimScore: Record<string, number> = {};
  const dimBasis: Record<string, string> = {};
  for (const d of DIMENSIONS) {
    const hits = kw[d].filter((k) => text.includes(k));
    const base = 46;
    const lenBonus = Math.min(10, Math.floor(text.length / 120));
    const score = Math.max(38, Math.min(92, base + hits.length * 6 + lenBonus));
    eightDimScore[d] = score;
    dimBasis[d] = hits.length ? `答卷中出现「${hits.slice(0, 3).join("、")}」等行为信号（规则引擎）` : "答卷相关行为信号较弱（规则引擎）";
  }

  const seatFullScore: Record<string, number> = {};
  const seatExplainBasis: PassportData["seatExplainBasis"] = [];
  for (const seat of SEATS) {
    const dims =
      seat.cabin === "explore" ? ["curiosity", "abstract", "imagination", "ambiguity"]
      : seat.cabin === "build" ? ["systematic", "executing"]
      : ["empathy", "communication"];
    const avg = dims.reduce((s, d) => s + (eightDimScore[d] ?? 50), 0) / dims.length;
    const score = Math.max(0, Math.min(100, Math.round(avg + seatBonus(seat.id, eightDimScore))));
    seatFullScore[seat.id] = score;
    seatExplainBasis.push({ target_item: seat.name, score, basis_text: buildBasis(seat, eightDimScore, dimBasis) });
  }

  const stylePool: string[] = [];
  if (eightDimScore.systematic >= 62) stylePool.push("结构主义拆解派");
  if (eightDimScore.executing >= 62) stylePool.push("闭环执行者");
  if (eightDimScore.curiosity >= 62) stylePool.push("好奇探索者");
  if (eightDimScore.imagination >= 62) stylePool.push("愿景构想者");
  if (eightDimScore.empathy >= 62) stylePool.push("共情表达者");
  if (eightDimScore.ambiguity >= 62) stylePool.push("混沌破局者");
  if (eightDimScore.communication >= 62) stylePool.push("协作促成者");
  if (eightDimScore.abstract >= 62) stylePool.push("模型提炼者");
  const cognitiveStyleTags = (stylePool.length ? stylePool : ["待进一步测绘"]).slice(0, 5);

  return {
    data: { eightDimScore, cognitiveStyleTags, seatFullScore, seatExplainBasis, honorTitle: pickHonorTitle(seatFullScore) },
  };
}

function seatBonus(seatId: string, dims: Record<string, number>): number {
  const map: Record<string, string> = {
    star_chart_scholar: "curiosity",
    interstellar_scout: "curiosity",
    quantum_hypothesist: "abstract",
    starlight_poet: "imagination",
    future_oracle: "imagination",
    wanderer_philosopher: "abstract",
    star_chest_collector: "systematic",
    engine_chief: "systematic",
    mechanical_designer: "systematic",
    star_blacksmith: "executing",
    circuit_runner: "executing",
    wind_balance_officer: "systematic",
    trajectory_pilot: "executing",
    meteor_sharpshooter: "executing",
    shuttle_herald: "communication",
    star_dock_keeper: "empathy",
    fleet_commander: "communication",
    star_covenant_observer: "systematic",
    meteor_tactician: "systematic",
    voyage_archivist: "systematic",
    star_bridge_engineer: "empathy",
  };
  const dim = map[seatId];
  if (!dim) return 0;
  return ((dims[dim] ?? 50) - 50) * 0.15;
}

function buildBasis(
  seat: (typeof SEATS)[number],
  dims: Record<string, number>,
  dimBasis?: Record<string, string>
): string {
  const dimNames: Record<string, string> = {
    curiosity: "好奇心",
    abstract: "抽象能力",
    imagination: "想象力",
    ambiguity: "模糊容忍",
    systematic: "系统思维",
    executing: "执行力",
    empathy: "共情力",
    communication: "协作表达",
  };
  const keyDims =
    seat.cabin === "explore"
      ? ["imagination", "curiosity", "abstract"]
      : seat.cabin === "build"
        ? ["systematic", "executing"]
        : ["communication", "empathy"];
  const top = keyDims
    .map((d) => ({ name: dimNames[d], v: dims[d] ?? 50, basis: dimBasis?.[d] }))
    .sort((a, b) => b.v - a.v)[0];
  return top?.basis ? `${seat.mission}；行为依据：${top.basis}` : `${seat.mission}；相关维度表现稳定。`;
}

function pickHonorTitle(seatFullScore: Record<string, number>): string {
  const top = Math.max(...Object.values(seatFullScore));
  if (top >= 88) return HONOR_TITLES[0];
  if (top >= 78) return HONOR_TITLES[1];
  if (top >= 68) return HONOR_TITLES[2];
  if (top >= 55) return HONOR_TITLES[3];
  return HONOR_TITLES[4];
}

function fallbackPassport(): PassportData {
  const eightDimScore: Record<string, number> = {};
  for (const d of DIMENSIONS) eightDimScore[d] = 50;
  const seatFullScore: Record<string, number> = {};
  const seatExplainBasis: PassportData["seatExplainBasis"] = [];
  for (const s of SEATS) {
    seatFullScore[s.id] = 50;
    seatExplainBasis.push({ target_item: s.name, score: 50, basis_text: "解析失败，暂用中性分，待重新测绘。" });
  }
  return {
    eightDimScore,
    cognitiveStyleTags: ["待测绘"],
    seatFullScore,
    seatExplainBasis,
    honorTitle: "Sailor",
  };
}

/** 写入不可篡改快照（只 insert，版本号自增） */
export async function writeSnapshot(params: {
  userId: string;
  sourceType: string;
  sourceRelationId?: string | null;
  passport: PassportData;
  starCount?: number;
  apuCredit?: number;
  missionCount?: number;
  comment?: string | null;
  isDemo?: boolean;
}): Promise<string> {
  const dbi = await db();
  const existing = await dbi
    .select({ version: expeditionPassportSnapshot.passportVersionNo })
    .from(expeditionPassportSnapshot)
    .where(eq(expeditionPassportSnapshot.userId, params.userId))
    .orderBy(desc(expeditionPassportSnapshot.passportVersionNo))
    .limit(1);
  const nextVersion = (existing[0]?.version ?? 0) + 1;

  const inserted = await dbi
    .insert(expeditionPassportSnapshot)
    .values({
      userId: params.userId,
      passportVersionNo: nextVersion,
      snapshotSourceType: params.sourceType,
      sourceRelationId: params.sourceRelationId ?? null,
      eightDimScore: params.passport.eightDimScore,
      cognitiveStyleTags: params.passport.cognitiveStyleTags,
      seatFullScore: params.passport.seatFullScore,
      seatExplainBasis: params.passport.seatExplainBasis,
      honorTitle: params.passport.honorTitle,
      starCount: params.starCount ?? 0,
      apuCreditSim: String(params.apuCredit ?? 0),
      missionCount: params.missionCount ?? 0,
      collaboratorSeatEvalJson: {},
      snapshotComment: params.comment ?? null,
      isDemo: params.isDemo ?? false,
    })
    .returning({ id: expeditionPassportSnapshot.passportSnapshotId });

  return inserted[0].id;
}

/** 读取用户最新航行档案快照 */
export async function getLatestPassport(userId: string) {
  const dbi = await db();
  const rows = await dbi
    .select()
    .from(expeditionPassportSnapshot)
    .where(eq(expeditionPassportSnapshot.userId, userId))
    .orderBy(desc(expeditionPassportSnapshot.passportVersionNo))
    .limit(1);
  return rows[0] ?? null;
}

/** Mission 归档时：融合协作反馈，生成新版本航行档案 */
export async function archiveMissionPassport(params: {
  userId: string;
  missionId: string;
  isDemo?: boolean;
}): Promise<{ newVersion: number; dimDeltas: Record<string, number> } | null> {
  const dbi = await db();
  const latest = await getLatestPassport(params.userId);
  if (!latest) return null;

  // 汇总该 Mission 中目标为此用户的所有反馈
  const feedbacks = await dbi
    .select()
    .from(missionCollaborateFeedback)
    .where(eq(missionCollaborateFeedback.missionId, params.missionId));
  const targetFeedbacks = feedbacks.filter((f) => f.feedbackTargetUserId === params.userId);

  const eightDimScore: Record<string, number> = { ...(latest.eightDimScore as Record<string, number>) };
  const dimDeltas: Record<string, number> = {};
  if (targetFeedbacks.length > 0) {
    // 反馈席位 -> 维度的简单映射（按席位名归属舱维度做微调）
    for (const f of targetFeedbacks) {
      const seatFeedback = f.seatFeedbackJson as Record<string, { score: number; problem_note?: string }>;
      for (const [seatName, v] of Object.entries(seatFeedback)) {
        const seat = SEATS.find((s) => s.name === seatName);
        if (!seat) continue;
        const dims =
          seat.cabin === "explore"
            ? ["curiosity", "abstract", "imagination", "ambiguity"]
            : seat.cabin === "build"
              ? ["systematic", "executing"]
              : ["empathy", "communication"];
        // 反馈分 1-5：>3 加分，<3 扣分，映射 ±4
        const delta = Math.round(((v.score - 3) / 2) * 4);
        for (const d of dims) {
          dimDeltas[d] = (dimDeltas[d] ?? 0) + delta;
        }
      }
    }
    for (const [d, delta] of Object.entries(dimDeltas)) {
      const avgDelta = Math.round(delta / Math.max(1, targetFeedbacks.length));
      eightDimScore[d] = Math.max(0, Math.min(100, (eightDimScore[d] ?? 50) + avgDelta));
    }
  }

  // 重新计算席位分
  const seatFullScore: Record<string, number> = {};
  const seatExplainBasis: PassportData["seatExplainBasis"] = [];
  for (const seat of SEATS) {
    const dims =
      seat.cabin === "explore"
        ? ["curiosity", "abstract", "imagination", "ambiguity"]
        : seat.cabin === "build"
          ? ["systematic", "executing"]
          : ["empathy", "communication"];
    const avg = dims.reduce((s, d) => s + (eightDimScore[d] ?? 50), 0) / dims.length;
    const score = Math.max(0, Math.min(100, Math.round(avg)));
    seatFullScore[seat.id] = score;
    seatExplainBasis.push({ target_item: seat.name, score, basis_text: `Mission 归档更新：基于协作反馈修订。` });
  }

  const passport: PassportData = {
    eightDimScore,
    cognitiveStyleTags: latest.cognitiveStyleTags as string[],
    seatFullScore,
    seatExplainBasis,
    honorTitle: pickHonorTitle(seatFullScore),
  };

  await writeSnapshot({
    userId: params.userId,
    sourceType: "mission_archive",
    sourceRelationId: params.missionId,
    passport,
    starCount: (latest.starCount ?? 0) + (targetFeedbacks.length > 0 ? 1 : 0),
    apuCredit: Number(latest.apuCreditSim ?? 0) + 10,
    missionCount: (latest.missionCount ?? 0) + 1,
    comment: "Mission 归档由协作航迹自动修订",
    isDemo: params.isDemo,
  });

  const nextVersion = (latest.passportVersionNo ?? 1) + 1;
  return { newVersion: nextVersion, dimDeltas };
}

/** 标记测试会话已解析 */
export async function markSessionParsed(
  sessionId: string,
  raw: unknown,
  status: string,
  errorMsg: string | null
): Promise<void> {
  const dbi = await db();
  await dbi
    .update(expeditionTestSession)
    .set({
      sessionStatus: status,
      llmRawResponse: raw as Record<string, unknown> | null,
      parseErrorMsg: errorMsg,
      updatedAt: sql`now()`,
    })
    .where(eq(expeditionTestSession.testSessionId, sessionId));
}
