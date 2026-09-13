import "server-only";
import { db } from "@/lib/db";
import {
  examOfficialQuestion,
  examPaper,
  examPaperAssign,
  examAnswerRecord,
  examReport,
} from "@/storage/database/shared/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { SEATS, DIMENSIONS } from "@/lib/domain";

// ===================== 配置 =====================

export const EIGHT_DIM_NAMES: Record<string, string> = {
  curiosity: "探索力",
  imagination: "想象力",
  abstract: "理解力",
  systematic: "拆解力",
  executing: "执行力",
  communication: "协作力",
  ambiguity: "决策力",
  empathy: "守护力",
};

export const EIGHT_DIM_KEYS = ["curiosity", "imagination", "abstract", "systematic", "executing", "communication", "ambiguity", "empathy"];

// 21 席标准能力向量（与 PRD2 config 对齐，顺序对应 EIGHT_DIM_KEYS）
export const CAREER21_VECTORS: Record<string, number[]> = {
  star_chart_scholar: [85, 78, 60, 40, 30, 50, 40, 35],
  interstellar_scout: [82, 80, 65, 42, 33, 48, 42, 38],
  star_chest_collector: [75, 60, 72, 50, 40, 60, 45, 55],
  wanderer_philosopher: [80, 65, 75, 62, 45, 42, 50, 60],
  starlight_poet: [65, 90, 60, 40, 35, 45, 35, 30],
  quantum_hypothesist: [78, 72, 68, 55, 48, 70, 62, 45],
  future_oracle: [70, 68, 75, 45, 50, 85, 60, 48],
  engine_chief: [60, 62, 78, 70, 65, 72, 78, 65],
  mechanical_designer: [58, 75, 70, 78, 60, 65, 82, 70],
  star_blacksmith: [55, 60, 80, 85, 70, 60, 72, 75],
  trajectory_pilot: [52, 55, 82, 90, 75, 62, 68, 70],
  circuit_runner: [72, 85, 70, 68, 62, 65, 55, 50],
  wind_balance_officer: [48, 50, 75, 82, 85, 60, 65, 78],
  meteor_sharpshooter: [45, 40, 65, 70, 90, 75, 55, 72],
  shuttle_herald: [55, 60, 72, 68, 65, 70, 85, 80],
  fleet_commander: [50, 65, 70, 72, 70, 68, 90, 75],
  star_dock_keeper: [42, 45, 75, 65, 78, 62, 72, 88],
  star_covenant_observer: [40, 42, 70, 72, 68, 60, 82, 90],
  meteor_tactician: [45, 40, 78, 70, 72, 65, 75, 85],
  voyage_archivist: [52, 58, 80, 65, 68, 78, 85, 82],
  star_bridge_engineer: [40, 38, 72, 60, 75, 68, 70, 92],
};

const ALG_CONFIG = {
  weight_eight: 1.2,
  weight_career21: 1.0,
  weight_base: 0.8,
  type_ratio: { single: 0.4, multiple: 0.35, essay: 0.25 },
};

// ===================== 模块1：出题组卷算法 =====================

export interface QuestionRow {
  questionId: string;
  title: string;
  questionType: string;
  options: unknown;
  judgeRule: string | null;
  eightDimTags: string;
  career21Tags: string;
  industry: string;
  weightScore: number;
  status: number;
}

export interface DemandParams {
  industry?: string;
  jobTitle?: string;
  jobDesc?: string;
  targetEightDim?: string;
  targetCareer21?: string;
  totalQuestionCount?: number;
  timeLimit?: number;
  remark?: string;
}

export async function getOnlineQuestionPool(): Promise<QuestionRow[]> {
  const dbi = await db();
  const rows = await dbi
    .select()
    .from(examOfficialQuestion)
    .where(eq(examOfficialQuestion.status, 1))
    .orderBy(desc(examOfficialQuestion.createdAt));
  return rows.map((r) => ({
    questionId: r.questionId,
    title: r.title,
    questionType: r.questionType,
    options: r.options,
    judgeRule: r.judgeRule,
    eightDimTags: r.eightDimTags,
    career21Tags: r.career21Tags,
    industry: r.industry,
    weightScore: r.weightScore,
    status: r.status,
  }));
}

export function generateExamPaper(pool: QuestionRow[], demand: DemandParams): string[] {
  const targetEight = new Set((demand.targetEightDim ?? "").split(",").filter(Boolean));
  const targetCareer21 = new Set((demand.targetCareer21 ?? "").split(",").filter(Boolean));
  const needTotal = Math.max(5, Math.min(50, demand.totalQuestionCount ?? 20));

  const scored = pool.map((q) => {
    const qEight = new Set(q.eightDimTags ? q.eightDimTags.split(",") : []);
    const qCareer = new Set(q.career21Tags ? q.career21Tags.split(",") : []);
    let score = 0;
    score += ALG_CONFIG.weight_eight * intersectionSize(qEight, targetEight);
    score += ALG_CONFIG.weight_career21 * intersectionSize(qCareer, targetCareer21);
    if (demand.industry && q.industry === demand.industry) score += 2;
    score += q.weightScore * ALG_CONFIG.weight_base;
    return { question: q, matchScore: score };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);

  const final: QuestionRow[] = [];
  const typeCounter: Record<string, number> = { single: 0, multiple: 0, essay: 0 };

  for (const item of scored) {
    if (final.length >= needTotal) break;
    const qt = item.question.questionType;
    const ratio = (ALG_CONFIG.type_ratio as Record<string, number>)[qt] || 0.3;
    const maxPerType = Math.max(3, Math.floor(needTotal * ratio));
    if ((typeCounter[qt] ?? 0) < maxPerType) {
      final.push(item.question);
      typeCounter[qt] = (typeCounter[qt] ?? 0) + 1;
    }
  }

  if (final.length < needTotal) {
    const finalIds = new Set(final.map((f) => f.questionId));
    for (const item of scored) {
      if (final.length >= needTotal) break;
      if (!finalIds.has(item.question.questionId)) {
        final.push(item.question);
      }
    }
  }

  return final.map((f) => f.questionId);
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

// ===================== 模块2：测评分析引擎 =====================

export interface AnswerRecord {
  questionId: string;
  userAnswer: string;
}

export function calculateEightDimScore(answers: AnswerRecord[], questionMap: Map<string, QuestionRow>): Record<string, number> {
  const dimSum: Record<string, number> = {};
  const dimMax: Record<string, number> = {};
  for (const d of EIGHT_DIM_KEYS) {
    dimSum[d] = 0;
    dimMax[d] = 0;
  }

  for (const ans of answers) {
    const q = questionMap.get(ans.questionId);
    if (!q) continue;
    const ansScore = calcSingleQuestionScore(q, ans.userAnswer);
    const tags = q.eightDimTags ? q.eightDimTags.split(",") : [];
    const w = q.weightScore;
    for (const tag of tags) {
      if (tag in dimSum) {
        dimSum[tag] += ansScore * w;
        dimMax[tag] += 10 * w;
      }
    }
  }

  const result: Record<string, number> = {};
  for (const d of EIGHT_DIM_KEYS) {
    result[d] = dimMax[d] === 0 ? 0 : Math.round((dimSum[d] / dimMax[d]) * 100 * 10) / 10;
  }
  return result;
}

function calcSingleQuestionScore(question: QuestionRow, userAns: string): number {
  const qt = question.questionType;
  if (!question.judgeRule) return 0;
  try {
    const judge = JSON.parse(question.judgeRule);
    if (qt === "single" || qt === "multiple") {
      const correct = new Set(judge.correct as string[]);
      const user = new Set(userAns ? userAns.split(",") : []);
      const matchRate = correct.size === 0 ? 0 : intersectionSize(correct, user) / correct.size;
      return matchRate * 10;
    }
    if (qt === "essay") {
      if (!userAns || userAns.trim().length < 10) return 3;
      if (userAns.trim().length < 50) return 5;
      return 7;
    }
  } catch {
    return 0;
  }
  return 0;
}

export function match21Career(eightDimScores: Record<string, number>): { careerName: string; careerLabel: string; similarity: number }[] {
  const vec = EIGHT_DIM_KEYS.map((d) => eightDimScores[d] ?? 0);
  const vecNorm = norm(vec);
  const results: { careerName: string; careerLabel: string; similarity: number }[] = [];

  for (const seat of SEATS) {
    const cv = CAREER21_VECTORS[seat.id];
    if (!cv) continue;
    const cvNorm = norm(cv);
    let sim = 0;
    if (vecNorm > 0 && cvNorm > 0) {
      let dot = 0;
      for (let i = 0; i < vec.length; i++) dot += vec[i] * cv[i];
      sim = dot / (vecNorm * cvNorm);
    }
    results.push({ careerName: seat.id, careerLabel: seat.name, similarity: Math.round(sim * 1000) / 1000 });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, 3);
}

function norm(v: number[]): number {
  let s = 0;
  for (const x of v) s += x * x;
  return Math.sqrt(s);
}

export function detectRiskTip(eightDimScores: Record<string, number>): string {
  const tips: string[] = [];
  if ((eightDimScores.systematic ?? 0) < 30 && (eightDimScores.imagination ?? 0) > 75) {
    tips.push("风险提示：想象力强但落地拆解偏弱，需警惕偏理论、嘴炮倾向，建议面试深度追问项目落地细节");
  }
  if ((eightDimScores.executing ?? 0) > 70 && (eightDimScores.empathy ?? 0) > 70) {
    tips.push("优势：执行力与底线意识强，实干属性突出");
  }
  if ((eightDimScores.curiosity ?? 0) > 75 && (eightDimScores.communication ?? 0) > 70) {
    tips.push("优势：探索力与协作力双高，适合跨域创新岗位");
  }
  if ((eightDimScores.ambiguity ?? 0) < 30) {
    tips.push("风险提示：模糊容忍度偏低，在不确定场景下可能推进困难");
  }
  return tips.join("；");
}

export function generateFinalSuggest(top3: { careerLabel: string }[], riskTip: string): string {
  const top1 = top3[0]?.careerLabel ?? "未匹配";
  if (riskTip.includes("嘴炮")) {
    return `候选人最适配岗位类型：${top1}；存在落地能力风险，建议增加线下深度面试核验项目真实性`;
  }
  if (riskTip.includes("优势")) {
    return `候选人最适配岗位类型：${top1}；实干特质较好，推荐进入下一面试环节`;
  }
  return `候选人最适配岗位类型：${top1}；建议进一步面试确认细节匹配度`;
}

export interface ExamAnalysisResult {
  eightDimScore: Record<string, number>;
  career21Result: { careerName: string; careerLabel: string; similarity: number }[];
  riskTip: string;
  finalSuggest: string;
}

export function examAnalysisMain(answers: AnswerRecord[], questionMap: Map<string, QuestionRow>): ExamAnalysisResult {
  const eightDimScore = calculateEightDimScore(answers, questionMap);
  const career21Result = match21Career(eightDimScore);
  const riskTip = detectRiskTip(eightDimScore);
  const finalSuggest = generateFinalSuggest(career21Result, riskTip);
  return { eightDimScore, career21Result, riskTip, finalSuggest };
}

// ===================== 持久化辅助 =====================

export async function saveExamReport(assignId: string, result: ExamAnalysisResult): Promise<string> {
  const dbi = await db();
  const inserted = await dbi
    .insert(examReport)
    .values({
      assignId,
      eightDimScore: result.eightDimScore,
      career21Result: result.career21Result,
      riskTip: result.riskTip,
      finalSuggest: result.finalSuggest,
    })
    .returning({ reportId: examReport.reportId });

  await dbi
    .update(examPaperAssign)
    .set({ reportId: inserted[0].reportId, status: 2, submitTime: sql`now()` })
    .where(eq(examPaperAssign.assignId, assignId));

  return inserted[0].reportId;
}

export async function getQuestionMap(questionIds: string[]): Promise<Map<string, QuestionRow>> {
  if (questionIds.length === 0) return new Map();
  const dbi = await db();
  const rows = await dbi
    .select()
    .from(examOfficialQuestion)
    .where(inArray(examOfficialQuestion.questionId, questionIds));
  const m = new Map<string, QuestionRow>();
  for (const r of rows) {
    m.set(r.questionId, {
      questionId: r.questionId,
      title: r.title,
      questionType: r.questionType,
      options: r.options,
      judgeRule: r.judgeRule,
      eightDimTags: r.eightDimTags,
      career21Tags: r.career21Tags,
      industry: r.industry,
      weightScore: r.weightScore,
      status: r.status,
    });
  }
  return m;
}