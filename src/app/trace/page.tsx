"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { Panel, SectionTitle } from "@/components/ui-kit";
import { MISSION_PHASES } from "@/lib/constants";
import { Loader2, Bot, CheckCircle2, Zap, FileArchive, Users, Cpu } from "lucide-react";

interface TraceData {
  mission: { missionNo: string; missionName: string; missionStatus: string };
  phases: Record<string, number>;
  outputs: { outputId: string; phaseName: string; outputTitle: string | null; agentName: string | null; phaseStatus: string; createdAt: string }[];
  agentCalls: { callLogId: string; agentName: string; userInstruction: string | null; llmModelName: string | null; inputTokens: number; outputTokens: number; costMs: number; createdAt: string }[];
  feedbacks: { feedbackId: string; seatName: string; createdAt: string }[];
  totalApu: number;
  humanConfirmCount: number;
  totalOutput: number;
}

function TraceInner() {
  const sp = useSearchParams();
  const missionId = sp.get("missionId") ?? "";
  const [data, setData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<TraceData>(`/api/mission/${missionId || "latest"}/trace`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [missionId]);

  if (loading) return <div className="grid h-96 place-items-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data) return <Panel className="p-12 text-center text-slate-400">暂无已归档的航迹档案。Mission 完成归档后可在此查看完整留痕。</Panel>;

  // 时间线事件（产出 + Agent 调用）合并
  const events: { time: string; type: "output" | "agent" | "feedback"; title: string; sub: string; phase?: string }[] = [];
  data.outputs.forEach((o) => events.push({ time: o.createdAt, type: "output", title: o.outputTitle ?? "阶段产出", sub: o.agentName ? `${o.agentName} 生成 · ${o.phaseStatus === "confirmed" ? "已人工确认" : "待确认"}` : "人工席位提交", phase: o.phaseName }));
  data.agentCalls.forEach((c) => events.push({ time: c.createdAt, type: "agent", title: `调用 ${c.agentName}`, sub: `指令：${(c.userInstruction ?? "").slice(0, 40) || "阶段协作"} · ${c.inputTokens + c.outputTokens} tokens · ${(c.costMs / 1000).toFixed(1)}s` }));
  data.feedbacks.forEach((f) => events.push({ time: f.createdAt, type: "feedback", title: "席位协作互评", sub: f.seatName }));
  events.sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="space-y-6">
      <SectionTitle sub="每段航行自动沉淀为可回放、可追溯的创新档案">创新航迹档案</SectionTitle>

      <Panel glow className="p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-cyan-400/15 text-cyan-300"><FileArchive className="h-6 w-6" /></span>
          <div>
            <div className="font-mono text-xs text-cyan-400/70">{data.mission.missionNo}</div>
            <h2 className="text-xl font-black text-cyan-50">{data.mission.missionName}</h2>
            <p className="mt-1 text-xs text-slate-400">状态：{data.mission.missionStatus === "archived" ? "已归档" : "航行中"}</p>
          </div>
        </div>
      </Panel>

      {/* 统计 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Panel className="flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><Cpu className="h-5 w-5" /></span>
          <div><div className="text-xl font-black text-cyan-50">{data.totalOutput}</div><div className="text-xs text-slate-400">阶段产出</div></div>
        </Panel>
        <Panel className="flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><CheckCircle2 className="h-5 w-5" /></span>
          <div><div className="text-xl font-black text-emerald-300">{data.humanConfirmCount}</div><div className="text-xs text-slate-400">人工确认节点</div></div>
        </Panel>
        <Panel className="flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><Zap className="h-5 w-5" /></span>
          <div><div className="text-xl font-black text-amber-300">{data.totalApu}</div><div className="text-xs text-slate-400">APU 算力消耗</div></div>
        </Panel>
      </div>

      {/* 阶段产出分布 */}
      <Panel className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-200"><Users className="h-4 w-4 text-cyan-300" /> 五阶段航行贡献</h3>
        <div className="space-y-3">
          {MISSION_PHASES.map((p) => {
            const count = data.phases[p.id] ?? 0;
            const max = Math.max(1, ...Object.values(data.phases));
            return (
              <div key={p.id}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-300">{p.name}</span>
                  <span className="font-mono text-cyan-300">{count} 份产出</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-700/40">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: `${(count / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* 时间线 */}
      <Panel className="p-6">
        <h3 className="mb-5 text-base font-bold text-slate-200">协作时间线（全留痕）</h3>
        <div className="relative space-y-5 pl-6">
          <div className="absolute bottom-2 left-2 top-2 w-px bg-gradient-to-b from-cyan-400/50 via-violet-400/40 to-transparent" />
          {events.length === 0 && <p className="text-xs text-slate-500">暂无记录</p>}
          {events.map((e, i) => (
            <div key={i} className="relative">
              <div className={`absolute -left-[18px] top-1 grid h-4 w-4 place-items-center rounded-full ${e.type === "agent" ? "bg-violet-500/30" : e.type === "feedback" ? "bg-amber-400/30" : "bg-cyan-400/30"}`}>
                <div className={`h-1.5 w-1.5 rounded-full ${e.type === "agent" ? "bg-violet-300" : e.type === "feedback" ? "bg-amber-300" : "bg-cyan-300"}`} />
              </div>
              <div className="text-[10px] text-slate-500">{new Date(e.time).toLocaleString("zh-CN")}</div>
              <div className="flex items-center gap-1.5 text-sm text-slate-100">
                {e.type === "agent" ? <Bot className="h-3.5 w-3.5 text-violet-300" /> : e.type === "feedback" ? <Users className="h-3.5 w-3.5 text-amber-300" /> : <CheckCircle2 className="h-3.5 w-3.5 text-cyan-300" />}
                {e.title}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">{e.sub}</div>
            </div>
          ))}
        </div>
      </Panel>

      <p className="text-center text-[11px] text-slate-600">
        Agent 调用日志、Prompt、原始输出、人工修改内容、协作互评全部入档，满足 AI 留痕与审计要求。
      </p>
    </div>
  );
}

export default function TracePage() {
  return (
    <Suspense fallback={<div className="grid h-96 place-items-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <TraceInner />
    </Suspense>
  );
}
