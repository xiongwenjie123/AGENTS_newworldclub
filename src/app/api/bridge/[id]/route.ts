import { getMissionDetail } from "@/lib/mission-data";
import { db } from "@/lib/db";
import { missionPhaseOutput, shipIntelligenceAgentCallLog } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import { ok, fail, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const PHASE_META: Record<string, { id: string; name: string; short: string; purpose: string }> = {
  intel_analysis: { id: "intel_analysis", name: "靶源情报", short: "情报", purpose: "侦察目标与机会，扫描环境信号" },
  positioning: { id: "positioning", name: "机会定位", short: "定位", purpose: "收敛价值主张与差异化坐标" },
  prototype_build: { id: "prototype_build", name: "原型建造", short: "原型", purpose: "把方案锻造成可运行的最小原型" },
  trial_voyage: { id: "trial_voyage", name: "试航迭代", short: "试航", purpose: "试航验证、反馈归类与迭代" },
  maiden_voyage: { id: "maiden_voyage", name: "首航发布", short: "首航", purpose: "公测发布与首航承接" },
  archive_retrospect: { id: "archive_retrospect", name: "归档复盘", short: "复盘", purpose: "沉淀创新航迹，归档复盘" },
};

/** 舰桥：当前阶段 + 舰队席位 + 阶段产出档案（含 Agent 产出待人工确认） */
export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const detail = await getMissionDetail(id);
  if (!detail) return fail("使命不存在", 404);

  const dbi = await db();
  const outputs = await dbi
    .select()
    .from(missionPhaseOutput)
    .where(eq(missionPhaseOutput.missionId, id));
  const logs = await dbi
    .select()
    .from(shipIntelligenceAgentCallLog)
    .where(eq(shipIntelligenceAgentCallLog.missionId, id));
  const logMap = new Map(logs.map((l) => [l.callLogId, l.agentName]));

  const primaryFleet = detail.fleets.find((f) => f.isPrimary) ?? detail.fleets[0];

  const result = {
    mission: {
      missionId: detail.missionId,
      missionName: detail.missionName,
      missionStatus: detail.missionStatus,
      currentPhase: detail.currentPhase,
    },
    phase: detail.currentPhase
      ? PHASE_META[detail.currentPhase] ?? { id: detail.currentPhase, name: detail.currentPhase, short: detail.currentPhase, purpose: "" }
      : null,
    seats: (primaryFleet?.seats ?? []).map((s) => ({
      seatName: s.seatName,
      type: s.type,
      nickname: s.nickname,
      agentAlias: s.agentAlias,
      cabin: s.cabin,
    })),
    outputs: outputs
      .map((o) => ({
        outputId: o.outputId,
        phaseName: o.phaseName,
        outputTitle: o.outputTitle,
        outputContentText: o.outputContentText,
        submitUserId: o.submitUserId,
        agentCallLogId: o.agentCallLogId,
        agentName: o.agentCallLogId ? logMap.get(o.agentCallLogId) ?? "Agent" : null,
        phaseStatus: o.phaseStatus,
        confirmedBy: o.confirmUserId,
        createdAt: o.createdAt,
      }))
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))),
  };

  return ok(result);
});
