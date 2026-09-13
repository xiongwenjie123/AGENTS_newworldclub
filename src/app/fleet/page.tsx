"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import { Panel, SectionTitle, GlowButton } from "@/components/ui-kit";
import { CabinBadge } from "@/components/ui-kit";
import { SEATS, CABIN_LABEL } from "@/lib/constants";
import { Loader2, Radar, Cpu, User, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";

interface Assignment {
  seatName: string;
  seatLabel: string;
  cabin: string;
  type: "human" | "agent";
  userId?: string;
  nickname?: string;
  agentAlias?: string;
  score: number;
  comment?: string;
}
interface Plan {
  strategy: string;
  strategyLabel: string;
  riskLevel: "low" | "mid" | "high";
  riskNote: string[];
  assignments: Assignment[];
  humanCount: number;
  agentCount: number;
  avgScore: number;
}

function FleetInner() {
  const sp = useSearchParams();
  const missionId = sp.get("missionId") ?? "";
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [err, setErr] = useState("");

  const compose = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await api<{ plans: Plan[] }>("/api/fleet/compose", {
        method: "POST",
        body: { missionId: missionId || undefined, strategy: "balanced" },
      });
      setPlans(data.plans);
      setSelected(0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "组舰失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    compose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirm = async () => {
    setConfirming(true);
    setErr("");
    try {
      const p = plans[selected];
      await api("/api/fleet/confirm", {
        method: "POST",
        body: {
          missionId: missionId || undefined,
          plan: {
            strategy: p.strategy,
            humanCount: p.humanCount,
            agentCount: p.agentCount,
            riskLevel: p.riskLevel,
            riskNote: p.riskNote,
            assignments: p.assignments.map((a) => ({
              seatId: a.seatName,
              seatName: a.seatLabel ?? a.seatName,
              cabin: a.cabin,
              assignType: a.type,
              assignedUserId: a.userId ?? null,
              agentAlias: a.agentAlias ?? null,
              matchScore: a.score,
              assignComment: a.comment ?? "",
            })),
          },
        },
      });
      setConfirmed(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "确认失败");
      setConfirming(false);
    }
  };

  const plan = plans[selected];

  return (
    <div className="space-y-6">
      <SectionTitle sub="Cargo Agent 02 扫描候选池，按 21 席三舱生成 3 套互补方案">AI 自动组舰</SectionTitle>

      {err && <Panel className="border-rose-400/40 p-4 text-sm text-rose-300">{err}</Panel>}

      {loading && (
        <Panel glow className="grid place-items-center p-16 text-center">
          <Radar className="mb-4 h-12 w-12 animate-spin text-cyan-300" />
          <p className="text-sm text-slate-300">舰载智能正在扫描候选池、匹配 21 席互补画像…</p>
        </Panel>
      )}

      {!loading && plans.length > 0 && (
        <>
          {/* 方案选择 */}
          <div className="grid gap-3 sm:grid-cols-3">
            {plans.map((p, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`text-left rounded-xl border p-4 transition ${
                  selected === i ? "border-cyan-400/70 bg-cyan-400/10 holo-glow" : "border-cyan-400/15 bg-[rgba(8,18,44,0.5)] hover:border-cyan-400/40"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-bold text-cyan-100">方案 {String.fromCharCode(65 + i)}</span>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                    p.riskLevel === "low" ? "bg-emerald-400/15 text-emerald-300"
                    : p.riskLevel === "mid" ? "bg-amber-400/15 text-amber-300"
                    : "bg-rose-400/15 text-rose-300"}`}>
                    风险 {p.riskLevel === "low" ? "低" : p.riskLevel === "mid" ? "中" : "高"}
                  </span>
                </div>
                <div className="text-xs text-slate-400">{p.strategyLabel}</div>
                <div className="mt-3 flex gap-4 text-xs">
                  <span className="text-cyan-300">真人 {p.humanCount}</span>
                  <span className="text-violet-300">Agent {p.agentCount}</span>
                  <span className="text-slate-300">均分 {p.avgScore}</span>
                </div>
              </button>
            ))}
          </div>

          {plan && (
            <>
              {/* 风险提示 */}
              <Panel className="border-amber-400/30 bg-amber-500/5 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                  <div>
                    <div className="mb-1 text-sm font-semibold text-amber-200">Agent 组舰风险说明</div>
                    <ul className="list-inside list-disc space-y-0.5 text-xs text-slate-300">
                      {plan.riskNote.map((n, i) => <li key={i}>{n}</li>)}
                    </ul>
                  </div>
                </div>
              </Panel>

              {/* 三舱席位分配 */}
              <div className="space-y-5">
                {(["explore", "build", "govern"] as const).map((cabin) => (
                  <Panel key={cabin} className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-base font-bold">
                        <CabinBadge cabin={cabin} />
                        <span className="text-slate-200">{CABIN_LABEL[cabin]}</span>
                      </h3>
                      <span className="text-xs text-slate-500">{plan.assignments.filter((a) => a.cabin === cabin).length} 席</span>
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {SEATS.filter((s) => s.cabin === cabin).map((seat) => {
                        const a = plan.assignments.find((x) => x.seatName === seat.id);
                        const isAgent = a?.type === "agent";
                        return (
                          <div key={seat.id} className={`flex items-center gap-3 rounded-lg border p-3 ${isAgent ? "border-violet-400/30 bg-violet-500/8" : "border-cyan-400/20 bg-cyan-400/5"}`}>
                            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${isAgent ? "bg-violet-500/20" : "bg-cyan-400/15"}`}>
                              {isAgent ? <Cpu className="h-4.5 w-4.5 text-violet-300" /> : <User className="h-4.5 w-4.5 text-cyan-300" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 text-sm">
                                <span className="font-semibold text-slate-100">{seat.name}</span>
                                {isAgent && <span className="rounded bg-violet-500/25 px-1 py-0.5 text-[9px] text-violet-200">AGENT</span>}
                              </div>
                              <div className="truncate text-[11px] text-slate-400">
                                {isAgent ? <span className="text-violet-300">{a?.agentAlias} 补位（待人工确认）</span> : a?.nickname}
                              </div>
                            </div>
                            {!isAgent && <span className="font-mono text-sm font-bold text-cyan-300">{a?.score}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                ))}
              </div>

              <Panel className="p-5 text-center">
                {confirmed ? (
                  <div className="flex flex-col items-center gap-3">
                    <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                    <h3 className="text-lg font-bold text-emerald-300">舰队已确认！</h3>
                    <p className="text-sm text-slate-400">21 席已就位，Agent 补位席位将在航行中等待人工招募替换。</p>
                    {missionId ? (
                      <GlowButton href={`/bridge?missionId=${missionId}`}>进入舰桥 <Sparkles className="h-4 w-4" /></GlowButton>
                    ) : (
                      <GlowButton href="/mission">返回 Mission 列表</GlowButton>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <p className="max-w-lg text-xs text-slate-400">
                      组舰结果由舰载智能生成，<b className="text-cyan-300">最终确认权在舰长（人工）</b>。确认后舰队进入航行状态，Agent 产出仍需逐个人工确认。
                    </p>
                    <GlowButton onClick={confirm} disabled={confirming || !user}>
                      {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      {user ? "舰长确认采用此方案" : "请先登录"}
                    </GlowButton>
                  </div>
                )}
              </Panel>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function FleetPage() {
  return (
    <Suspense fallback={<div className="grid h-96 place-items-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <FleetInner />
    </Suspense>
  );
}
