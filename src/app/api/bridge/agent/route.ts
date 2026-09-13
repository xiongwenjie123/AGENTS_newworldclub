import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { shipIntelligenceAgentCallLog, missionPhaseOutput, mission as missionTable } from "@/storage/database/shared/schema";
import { desc } from "drizzle-orm";
import { llmStream, llmInvoke, forwardHeadersFrom } from "@/lib/llm";
import { MISSION_PHASES } from "@/lib/domain";
import { getMissionDetail } from "@/lib/mission-data";
import { loadTemplateFilled } from "@/lib/prompt-templates";

export const dynamic = "force-dynamic";

const schema = z.object({
  missionId: z.string().optional(),
  fleetId: z.string().optional(),
  phase: z.string().optional(),
  agentName: z.string().default("Cargo Agent 02"),
  instruction: z.string().optional(),
  stream: z.boolean().optional(),
});

const PHASE_AGENT_HINT: Record<string, string> = {
  intel_analysis: "靶源情报搜集、用户洞察与竞品扫描",
  positioning: "机会定位、价值主张与边界界定",
  prototype_build: "原型方案、任务拆解与实现路径",
  trial_voyage: "试航验收、反馈归类与迭代清单",
  maiden_voyage: "首航发布、传播计划与公测承接",
  archive_retrospect: "归档复盘与创新航迹总结",
};

/** Agent 生成阶段产出（SSE 流式）。产出标记 agent_generated，必须人工确认。 */
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    return new Response(JSON.stringify({ code: 401, message: "未登录" }), { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ code: 400, message: parsed.error.issues[0]?.message }), { status: 400 });
  }
  const input = { ...parsed.data };
  const fwdHeaders = forwardHeadersFrom(req);
  // 未指定 missionId 时取最近一个进行中的使命
  if (!input.missionId) {
    const dbi = await db();
    const recent = await dbi
      .select({ missionId: missionTable.missionId, missionName: missionTable.missionName, currentPhase: missionTable.currentPhase })
      .from(missionTable)
      .orderBy(desc(missionTable.createdAt))
      .limit(1);
    input.missionId = recent[0]?.missionId ?? "";
  }
  const detail = await getMissionDetail(input.missionId);
  const phaseId: string =
    input.phase ||
    detail?.currentPhase ||
    (detail?.missionStatus === "archived" ? "archive_retrospect" : "intel_analysis");
  const phaseDef = MISSION_PHASES.find((p) => p.id === phaseId);
  const phaseName = phaseDef?.name ?? phaseId;
  input.phase = phaseId;
  const instruction = input.instruction || `请为【${phaseName}】阶段生成结构化协作草稿。`;
  input.instruction = instruction;
  const agentName = input.agentName ?? "Cargo Agent 02";
  input.agentName = agentName;
  const missionId = input.missionId ?? "";
  input.missionId = missionId;
  const useStream = input.stream !== false;

  const fleetContext = detail?.fleets[0];
  const humanSeats = fleetContext?.seats.filter((s) => s.assignType === "human").length ?? 0;
  const agentSeats = fleetContext?.seats.filter((s) => s.assignType === "agent").length ?? 0;

  const phaseHint = PHASE_AGENT_HINT[phaseId] ?? "阶段产出";
  const systemPrompt = (await loadTemplateFilled("bridge_agent_system", {
    agentName,
    missionName: detail?.missionName ?? "",
    phaseName,
    humanSeats: String(humanSeats),
    agentSeats: String(agentSeats),
    phaseHint,
  })) ?? `你是新大陆俱乐部「${agentName}」舰载智能，负责为 Mission「${detail?.missionName ?? ""}」的【${phaseName}】阶段产出草稿。
当前舰队：真人 ${humanSeats} 席，Agent 补位 ${agentSeats} 席。
你的产出必须是草稿（agent_generated），不能自动封板，最终必须由人类确认。
请围绕：${phaseHint}，结合需求给出结构化、可执行的内容（Markdown），控制在 400 字以内，语言专业且符合星际协作语境。`;

  const started = Date.now();

  if (!useStream) {
    // 非流式：直接落库并返回（LLM 不可用则走本地草稿模板）
    let fullText = "";
    let outputId = "";
    let degraded = false;
    try {
      fullText = await llmInvoke(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: instruction },
        ],
        { forwardHeaders: fwdHeaders }
      );
      if (!fullText.trim()) throw new Error("empty");
      const saved = await saveOutput({ missionId, fleetId: input.fleetId ?? null, phase: phaseId, agentName, instruction }, user.userId, fullText, Date.now() - started, systemPrompt, false);
      outputId = saved.outputId;
    } catch {
      degraded = true;
      fullText = buildFallbackDraft(phaseId, phaseName, instruction, agentName);
      const saved = await saveOutput({ missionId, fleetId: input.fleetId ?? null, phase: phaseId, agentName, instruction }, user.userId, fullText, Date.now() - started, systemPrompt, true);
      outputId = saved.outputId;
    }
    return new Response(JSON.stringify({ code: 0, data: { content: fullText, outputId, degraded, humanConfirmed: false } }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // SSE 流式
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      let text = "";
      let usedFallback = false;
      try {
        for await (const chunk of llmStream(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: instruction },
          ],
          { forwardHeaders: fwdHeaders }
        )) {
          text += chunk;
          send({ type: "token", content: chunk });
        }
        if (!text.trim()) throw new Error("舰载智能返回为空");
      } catch {
        // LLM 不可用（资源点不足/超时）：使用本地结构化草稿模板兜底，产出仍标记为待人工确认
        usedFallback = true;
        text = buildFallbackDraft(phaseId, phaseName, instruction, agentName);
        const tokens = text.match(/.{1,12}/g) ?? [text];
        for (const t of tokens) {
          send({ type: "token", content: t });
          await new Promise((r) => setTimeout(r, 18));
        }
      }
      const saved = await saveOutput({
        missionId, fleetId: input.fleetId ?? null, phase: phaseId,
        agentName, instruction,
      }, user.userId, text, Date.now() - started, systemPrompt, usedFallback);
      send({ type: "done", outputId: saved.outputId, callLogId: saved.callLogId, humanConfirmed: false, degraded: usedFallback });
      send({ type: "raw", data: "[DONE]" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

interface SaveInput {
  missionId: string;
  fleetId: string | null;
  phase: string;
  agentName: string;
  instruction: string;
}

async function saveOutput(
  input: SaveInput,
  userId: string,
  content: string,
  costMs: number,
  systemPrompt: string,
  degraded = false
): Promise<{ callLogId: string; outputId: string }> {
  const dbi = await db();
  const log = await dbi
    .insert(shipIntelligenceAgentCallLog)
    .values({
      missionId: input.missionId,
      fleetId: input.fleetId,
      agentName: input.agentName,
      callTriggerUserId: userId,
      userInstruction: input.instruction,
      agentInputPrompt: systemPrompt,
      llmModelName: degraded ? "local-template-fallback" : "doubao-seed-2-0-lite",
      llmRawOutput: content,
      humanOperationType: degraded ? "local_draft" : null,
      tokenConsumedInput: systemPrompt.length,
      tokenConsumedOutput: content.length,
      callCostTimeMs: costMs,
      isDemo: false,
    })
    .returning({ callLogId: shipIntelligenceAgentCallLog.callLogId });

  // 同步写一条阶段产出（待人工确认）
  const output = await dbi.insert(missionPhaseOutput).values({
    missionId: input.missionId,
    fleetId: input.fleetId,
    phaseName: input.phase,
    submitUserId: null,
    outputTitle: `[${input.agentName}] ${MISSION_PHASES.find((p) => p.id === input.phase)?.name ?? input.phase} 阶段草稿${degraded ? "（本地模板）" : ""}`,
    outputContentText: content,
    phaseStatus: "agent_generated",
    agentCallLogId: log[0].callLogId,
  })
    .returning({ outputId: missionPhaseOutput.outputId });

  return { callLogId: log[0].callLogId, outputId: output[0].outputId };
}

/** LLM 不可用时的本地结构化阶段草稿（仍标记 agent_generated，必须人工确认） */
function buildFallbackDraft(phase: string, phaseName: string, instruction: string, agentName: string): string {
  const templates: Record<string, string> = {
    intel_analysis: `## 靶源情报 · 阶段草稿（${agentName} 生成，待人工确认）\n\n### 已识别需求\n- 来自指令「${instruction || "阶段协作"}」的核心目标待明确\n- 建议补充：目标用户、使用场景、成功标准\n\n### 待侦察信号\n1. 目标用户画像与高频痛点\n2. 现有替代方案的边界\n3. 可复用的内部资源\n\n### 风险提示\n- 情报来源需人工核验，避免未验证假设直接进入定位阶段\n\n> 本草案由本地模板生成（舰载智能暂不可用），仅作结构参考，内容需人工补全与确认。`,
    positioning: `## 机会定位 · 阶段草稿（${agentName} 生成，待人工确认）\n\n### 一句话价值主张（待定）\n「为 ___ 提供 ___，使其能够 ___」\n\n### 差异化坐标\n- 我们不做什么（边界）\n- 我们必须做好什么（锚点）\n\n### 21 席能力对齐建议\n- 探索舱：验证需求真实性\n- 建造舱：评估技术可行性\n- 治理舱：明确协作规则\n\n> 本草案由本地模板生成，需舰长与探索舱共同确认后封板。`,
    prototype_build: `## 原型建造 · 阶段草稿（${agentName} 生成，待人工确认）\n\n### 最小可行原型（MVP）清单\n1. 核心链路闭环（主流程可走通）\n2. 关键界面与交互骨架\n3. 数据埋点与验证指标\n\n### 分工建议（21 席）\n- 引擎总师 / 机械造物师：技术方案\n- 星辰锻铁匠 / 星脉布线工：实现落地\n- 星坞守门人：用户体验走查\n\n### 验收标准（建议）\n- 主流程完成率、关键操作耗时、缺陷数\n\n> 本草案由本地模板生成，待建造舱确认后排期。`,
    trial_voyage: `## 试航反馈 · 阶段草稿（${agentName} 生成，待人工确认）\n\n### 试航数据摘要\n- 参与人数 / 完成率 / NPS（待填）\n\n### 高频反馈归类\n- 亮点：\n- 阻塞点：\n- 意外发现：\n\n### 迭代决策建议\n- 保留 / 调整 / 放弃 三栏\n- 必须人工（守门人）确认的体验红线\n\n> 本草案由本地模板生成，反馈结论需与真实试航数据核对。`,
    maiden_voyage: `## 首航发布 · 阶段草稿（${agentName} 生成，待人工确认）\n\n### 发布准备\n- 公测范围、承接 SOP、应急预案\n\n### 传播与渠道\n- 飞梭传令官：渠道分发\n- 流星神射手：增长实验\n\n> 本草案由本地模板生成，发布节奏需舰长拍板。`,
    archive_retrospect: `## 归档复盘 · 阶段草稿（${agentName} 生成，待人工确认）\n\n### 目标达成度\n- 预期 vs 实际（待填）\n\n### 协作航迹\n- 关键产出节点\n- Agent 补位与人工接管记录\n- 协作互评摘要\n\n### 下一程建议\n- 沉淀可复用资产\n- 席位能力回填航行档案\n\n> 本草案由本地模板生成，归档报告需治理者与舰长共同签署。`,
  };
  return templates[phase] ?? `## ${phaseName} · 阶段草稿（${agentName} 生成，待人工确认）\n\n围绕「${instruction || "阶段协作"}」的结构化草稿，需人工补全与确认。`;
}
