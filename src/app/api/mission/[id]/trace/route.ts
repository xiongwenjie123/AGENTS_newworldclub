import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  missionPhaseOutput,
  shipIntelligenceAgentCallLog,
  innovateTraceExportLog,
  missionCollaborateFeedback,
  sysUser,
} from "@/storage/database/shared/schema";
import { eq, desc } from "drizzle-orm";
import { MISSION_PHASES } from "@/lib/domain";
import { fail, ok, handler } from "@/lib/api-helpers";
import { mission } from "@/storage/database/shared/schema";

export const dynamic = "force-dynamic";

/** 导出创新航迹（全流程审计），支持 json / md；id 支持 "latest" 取最近一个有产出的使命 */
export const GET = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  let { id: missionId } = await ctx.params;
  const dbi = await db();
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") === "md" ? "md" : "json";

  if (missionId === "latest") {
    const latestOut = await dbi
      .select({ missionId: missionPhaseOutput.missionId, createdAt: missionPhaseOutput.createdAt })
      .from(missionPhaseOutput)
      .orderBy(desc(missionPhaseOutput.createdAt))
      .limit(1);
    if (!latestOut[0]) return fail("暂无创新航迹（还没有任何阶段产出）", 404);
    missionId = latestOut[0].missionId;
  }

  const outputs = await dbi.select().from(missionPhaseOutput).where(eq(missionPhaseOutput.missionId, missionId));
  if (outputs.length === 0) return fail("该使命暂无航迹数据", 404);

  const missionRows = await dbi
    .select()
    .from(mission)
    .where(eq(mission.missionId, missionId))
    .limit(1);

  const agentLogs = await dbi
    .select()
    .from(shipIntelligenceAgentCallLog)
    .where(eq(shipIntelligenceAgentCallLog.missionId, missionId));
  const feedbacks = await dbi
    .select({
      feedbackId: missionCollaborateFeedback.feedbackId,
      createdAt: missionCollaborateFeedback.createdAt,
      targetNickname: sysUser.nickname,
    })
    .from(missionCollaborateFeedback)
    .leftJoin(sysUser, eq(sysUser.userId, missionCollaborateFeedback.feedbackTargetUserId))
    .where(eq(missionCollaborateFeedback.missionId, missionId));

  const mRow = missionRows[0];
  const agentNameByLogId = new Map(agentLogs.map((l) => [l.callLogId, l.agentName]));

  const totalApu = agentLogs.reduce(
    (sum, l) => sum + (l.tokenConsumedInput ?? 0) + (l.tokenConsumedOutput ?? 0),
    0,
  );

  // 前端页面视图（扁平、统计齐全）
  const phaseCounts: Record<string, number> = {};
  for (const p of MISSION_PHASES) phaseCounts[p.id] = 0;
  for (const o of outputs) phaseCounts[o.phaseName ?? ""] = (phaseCounts[o.phaseName ?? ""] ?? 0) + 1;

  const view = {
    mission: {
      missionNo: mRow?.missionNo ?? "-",
      missionName: mRow?.missionName ?? "未知使命",
      missionStatus: mRow?.missionStatus ?? "in_progress",
    },
    phases: phaseCounts,
    outputs: outputs.map((o) => ({
      outputId: o.outputId,
      phaseName: o.phaseName,
      outputTitle: o.outputTitle,
      agentName: o.agentCallLogId ? (agentNameByLogId.get(o.agentCallLogId) ?? null) : null,
      phaseStatus: o.phaseStatus,
      createdAt: o.createdAt,
    })),
    agentCalls: agentLogs.map((l) => ({
      callLogId: l.callLogId,
      agentName: l.agentName,
      userInstruction: l.userInstruction,
      llmModelName: l.llmModelName,
      inputTokens: l.tokenConsumedInput ?? 0,
      outputTokens: l.tokenConsumedOutput ?? 0,
      costMs: l.callCostTimeMs ?? 0,
      createdAt: l.createdAt,
    })),
    feedbacks: feedbacks.map((f) => ({
      feedbackId: f.feedbackId,
      seatName: `给 ${f.targetNickname ?? "舰员"} 的协作互评`,
      createdAt: f.createdAt,
    })),
    totalApu,
    humanConfirmCount: outputs.filter((o) => o.phaseStatus === "confirmed").length,
    totalOutput: outputs.length,
  };

  // 记录导出日志
  await dbi.insert(innovateTraceExportLog).values({
    missionId: missionId,
    exportUserId: null,
    exportFormat: format,
    exportContentJson: view as unknown as Record<string, unknown>,
  });

  if (format === "md") {
    const md = buildMarkdown(missionId, view);
    return new Response(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="trace-${missionId}.md"`,
      },
    });
  }

  return ok(view);
});

type TraceView = {
  mission: { missionNo: string; missionName: string; missionStatus: string };
  phases: Record<string, number>;
  outputs: { outputId: string; phaseName: string; outputTitle: string | null; agentName: string | null; phaseStatus: string; createdAt: string }[];
  agentCalls: { callLogId: string; agentName: string; userInstruction: string | null; inputTokens: number; outputTokens: number; costMs: number }[];
  feedbacks: { feedbackId: string; seatName: string; createdAt: string }[];
  totalApu: number;
  humanConfirmCount: number;
  totalOutput: number;
};

function buildMarkdown(missionId: string, trace: TraceView): string {
  const phaseLabel: Record<string, string> = {};
  for (const p of MISSION_PHASES) phaseLabel[p.id] = p.name;
  const lines: string[] = [
    "# 新大陆俱乐部 · 创新航迹报告",
    "",
    `> Mission ID: ${missionId}`,
    `> 编号：${trace.mission.missionNo}　名称：${trace.mission.missionName}`,
    "",
    "## 一、总览",
    "",
    `- 阶段产出：${trace.totalOutput} 份`,
    `- 人工确认节点：${trace.humanConfirmCount} 次`,
    `- APU 算力消耗：${trace.totalApu} tokens`,
    "",
    "## 二、分阶段产出",
    "",
  ];
  for (const o of trace.outputs) {
    lines.push(`### ${o.outputTitle ?? "阶段产出"}（${phaseLabel[o.phaseName ?? ""] ?? o.phaseName}）`);
    lines.push(`- 来源：${o.agentName ? `${o.agentName} Agent 生成` : "人工席位提交"}　状态：${o.phaseStatus === "confirmed" ? "✅ 已人工确认" : "⏳ 待确认"}`);
    lines.push("");
  }
  lines.push("## 三、Agent 协作审计（留痕）", "");
  for (const a of trace.agentCalls) {
    lines.push(`- **${a.agentName}**：指令「${a.userInstruction ?? "阶段协作"}」 · ${a.inputTokens + a.outputTokens} tokens · ${(a.costMs / 1000).toFixed(1)}s`);
  }
  if (trace.agentCalls.length === 0) lines.push("_（暂无 Agent 调用）_");
  lines.push("", `## 四、协作互评（${trace.feedbacks.length} 条）`, "");
  for (const f of trace.feedbacks) lines.push(`- ${f.seatName} · ${new Date(f.createdAt).toLocaleString("zh-CN")}`);
  if (trace.feedbacks.length === 0) lines.push("_（暂无互评）_");
  return lines.join("\n");
}
