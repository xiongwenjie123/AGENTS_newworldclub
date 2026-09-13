"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import { Panel, SectionTitle, GlowButton } from "@/components/ui-kit";
import { CabinBadge } from "@/components/ui-kit";
import { MISSION_PHASES, SEATS } from "@/lib/constants";
import { Cpu, User, CheckCircle2, Loader2, Bot, XCircle, ArrowRight } from "lucide-react";

interface Output {
  outputId: string;
  phaseName: string;
  outputTitle: string | null;
  outputContentText: string | null;
  submitUserId: string | null;
  agentCallLogId: string | null;
  agentName: string | null;
  phaseStatus: string;
  confirmedBy: string | null;
  createdAt: string;
}
interface SeatAssignment {
  seatName: string;
  type: "human" | "agent";
  nickname?: string;
  agentAlias?: string;
  cabin: string;
}
interface BridgeData {
  mission: { missionId: string; missionName: string; missionStatus: string; currentPhase: string | null };
  phase: { id: string; name: string; short: string; purpose: string } | null;
  seats: SeatAssignment[];
  outputs: Output[];
}

function BridgeInner() {
  const sp = useSearchParams();
  const missionId = sp.get("missionId") ?? "";
  const { user } = useAuth();
  const [data, setData] = useState<BridgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const streamRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api<BridgeData>(`/api/bridge/${missionId}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [missionId]);

  useEffect(() => {
    if (missionId) load();
  }, [missionId, load]);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight });
  }, [streamText]);

  const callAgent = async () => {
    setBusy(true);
    setStreaming(true);
    setStreamText("");
    try {
      const res = await fetch("/api/bridge/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || "舰载智能调用失败");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        chunk.split("\n").forEach((line) => {
          if (line.startsWith("data:")) {
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") return;
            try {
              const evt = JSON.parse(payload);
              if (evt.type === "token") {
                acc += evt.content ?? "";
                setStreamText(acc);
              }
            } catch {
              /* ignore */
            }
          }
        });
      }
      await load();
    } catch (e) {
      setStreamText(`> ${e instanceof Error ? e.message : "调用失败"}`);
    } finally {
      setBusy(false);
      setTimeout(() => setStreaming(false), 800);
    }
  };

  const confirm = async (outputId: string, adopt: boolean) => {
    setBusy(true);
    try {
      await api("/api/bridge/confirm", { method: "POST", body: { missionId, outputId, operation: adopt ? "confirm" : "reject" } });
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="grid h-96 place-items-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data) return <Panel className="p-12 text-center text-slate-400">未找到该航行任务，请从 <a href="/mission" className="text-cyan-300">Mission 列表</a> 进入。</Panel>;

  const phaseIdx = MISSION_PHASES.findIndex((p) => p.id === data.phase?.id);

  return (
    <div className="space-y-6">
      <SectionTitle sub={`舰桥 · ${data.mission.missionName}`}>舰队舰桥</SectionTitle>

      {/* 阶段步骤条 */}
      <Panel className="p-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {MISSION_PHASES.map((p, i) => (
            <div key={p.id} className="flex flex-1 items-center gap-1">
              <div className={`flex min-w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
                phaseIdx > i ? "bg-emerald-400/15 text-emerald-300"
                : phaseIdx === i ? "bg-cyan-400/20 text-cyan-100 holo-glow"
                : "bg-slate-400/8 text-slate-500"}`}>
                {phaseIdx > i ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="font-mono">{i + 1}</span>}
                {p.name}
              </div>
              {i < MISSION_PHASES.length - 1 && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />}
            </div>
          ))}
        </div>
        {data.phase && (
          <div className="mt-3 text-xs text-slate-400">
            <span className="text-cyan-300">当前阶段 · {data.phase.name}</span> — {data.phase.purpose}
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 主工作区 */}
        <div className="space-y-4 lg:col-span-2">
          {/* NPC 控制台 */}
          <Panel glow className="overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-cyan-400/20 bg-cyan-400/5 px-5 py-3">
              <Bot className="h-5 w-5 text-cyan-300" />
              <span className="text-sm font-bold text-cyan-100">舰载智能协作台</span>
              <span className="ml-auto rounded bg-violet-500/15 px-2 py-0.5 text-[10px] text-violet-300">Agent 产出需人工确认</span>
            </div>
            <div ref={streamRef} className="h-56 overflow-y-auto whitespace-pre-wrap bg-[rgba(3,9,26,0.6)] p-5 font-mono text-xs leading-relaxed text-cyan-100/90">
              {streaming || streamText ? (
                <>
                  <span className="text-slate-500">{"> Cargo Agent 02 / 六 Agent 协同产出中…\n"}</span>
                  {streamText}
                  {busy && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-cyan-300 align-middle" />}
                </>
              ) : (
                <span className="text-slate-600">{"> 当前阶段可由舰载智能生成阶段产出（任务拆解书 / 角色说明书 / 验收标准…），产出后需舰长或对应人工席位确认。"}</span>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-cyan-400/20 p-3">
              <span className="text-[11px] text-slate-500">消耗 APU 算力（模拟）</span>
              <GlowButton onClick={callAgent} disabled={busy || !user} className="text-sm">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
                {user ? "调用舰载智能生成阶段产出" : "请先登录"}
              </GlowButton>
            </div>
          </Panel>

          {/* 阶段产出列表 */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300">阶段产出档案（人工确认记录）</h3>
            {data.outputs.length === 0 && <Panel className="p-6 text-center text-xs text-slate-500">暂无产出记录，调用舰载智能或由人工席位提交。</Panel>}
            {data.outputs.map((o) => (
              <Panel key={o.outputId} className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  {o.agentCallLogId ? <Bot className="h-4 w-4 text-violet-300" /> : <User className="h-4 w-4 text-cyan-300" />}
                  <span className="text-sm font-semibold text-slate-100">{o.outputTitle ?? "阶段产出"}</span>
                  <span className="rounded bg-slate-400/10 px-2 py-0.5 text-[10px] text-slate-400">{MISSION_PHASES.find((p) => p.id === o.phaseName)?.short ?? o.phaseName}</span>
                  <span className="ml-auto">
                    {o.phaseStatus === "confirmed" ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> 已确认</span>
                    ) : o.phaseStatus === "rejected" ? (
                      <span className="flex items-center gap-1 text-[11px] text-rose-300"><XCircle className="h-3.5 w-3.5" /> 已驳回</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-amber-300"><Bot className="h-3 w-3" /> Agent 产出·待人工确认</span>
                    )}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{o.outputContentText}</p>
                {o.phaseStatus !== "confirmed" && o.phaseStatus !== "rejected" && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => confirm(o.outputId, true)} disabled={busy} className="flex items-center gap-1 rounded-md bg-emerald-400/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-400/25">
                      <CheckCircle2 className="h-3.5 w-3.5" /> 确认采纳
                    </button>
                    <button onClick={() => confirm(o.outputId, false)} disabled={busy} className="flex items-center gap-1 rounded-md bg-rose-400/15 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-400/25">
                      <XCircle className="h-3.5 w-3.5" /> 驳回
                    </button>
                  </div>
                )}
              </Panel>
            ))}
          </div>
        </div>

        {/* 侧栏：席位 + 反馈 */}
        <div className="space-y-4">
          <Panel className="p-5">
            <h3 className="mb-3 text-sm font-bold text-slate-200">21 席舰员</h3>
            <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
              {data.seats.map((s) => (
                <div key={s.seatName} className="flex items-center gap-2 rounded-md border border-slate-700/40 bg-[rgba(8,18,44,0.4)] px-2.5 py-1.5">
                  <CabinBadge cabin={s.cabin} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs text-slate-200">{SEATS.find((x) => x.id === s.seatName)?.name ?? s.seatName}</div>
                    <div className="truncate text-[10px] text-slate-500">
                      {s.type === "agent" ? <span className="text-violet-300">{s.agentAlias} (Agent)</span> : s.nickname}
                    </div>
                  </div>
                  {s.type === "agent" ? <Cpu className="h-3.5 w-3.5 text-violet-400" /> : <User className="h-3.5 w-3.5 text-cyan-400" />}
                </div>
              ))}
            </div>
          </Panel>

          {data.mission.missionStatus === "archived" && (
            <a href={`/trace?missionId=${data.mission.missionId}`} className="block">
              <Panel className="cursor-pointer p-5 text-center transition hover:holo-glow">
                <span className="text-sm font-semibold text-cyan-200">查看创新航迹档案 →</span>
              </Panel>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BridgePage() {
  return (
    <Suspense fallback={<div className="grid h-96 place-items-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <BridgeInner />
    </Suspense>
  );
}
