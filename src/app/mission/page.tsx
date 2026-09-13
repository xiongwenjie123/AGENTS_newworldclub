"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import { Panel, SectionTitle, GlowButton } from "@/components/ui-kit";
import { MISSION_PHASES } from "@/lib/constants";
import { Loader2, Compass, Plus, ArrowRight, Ship } from "lucide-react";

interface MissionItem {
  missionId: string;
  missionNo: string;
  missionName: string;
  missionGoal: string;
  missionTags: string[];
  missionStatus: string;
  currentPhase: string | null;
  isDemo: boolean;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  pending_fleet: "待组舰",
  in_progress: "航行中",
  archived: "已归档",
};

export default function MissionPage() {
  const { user } = useAuth();
  const [list, setList] = useState<MissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", background: "", goal: "", tags: "" });
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");

  const load = () => {
    api<{ missions: MissionItem[] }>("/api/mission")
      .then((d) => setList(d.missions))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async () => {
    setErr("");
    if (!form.name || !form.goal) return setErr("请填写使命名称与目标");
    setCreating(true);
    try {
      const data = await api<{ mission: MissionItem }>("/api/mission", {
        method: "POST",
        body: {
          missionName: form.name,
          missionBackground: form.background,
          missionGoal: form.goal,
          missionTags: form.tags.split(/[,，\s]+/).filter(Boolean),
        },
      });
      setShowCreate(false);
      setForm({ name: "", background: "", goal: "", tags: "" });
      window.location.href = `/fleet?missionId=${data.mission.missionId}`;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "发布失败");
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle sub="一段为探索新世界而发起的集体航行">Mission 航行使命</SectionTitle>

      <div className="flex justify-end">
        {user && <GlowButton onClick={() => setShowCreate((v) => !v)}><Plus className="h-4 w-4" /> 发起 Mission</GlowButton>}
      </div>

      {showCreate && (
        <Panel glow className="space-y-4 p-6">
          <h3 className="text-base font-bold text-cyan-100">发起新的航行使命</h3>
          <div>
            <label className="mb-1 block text-xs text-slate-400">使命名称</label>
            <input className="nw-input w-full rounded-md px-3 py-2 text-sm" placeholder="例如：星际探索者协作平台 V2 首航" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">使命背景</label>
            <textarea className="nw-input min-h-[80px] w-full rounded-md px-3 py-2 text-sm" placeholder="为什么要发起这段航行？" value={form.background} onChange={(e) => setForm({ ...form, background: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">使命目标（必填）</label>
            <textarea className="nw-input min-h-[80px] w-full rounded-md px-3 py-2 text-sm" placeholder="这段航行要达成什么？" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">标签（逗号分隔）</label>
            <input className="nw-input w-full rounded-md px-3 py-2 text-sm" placeholder="AI协作, 组织创新" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </div>
          {err && <div className="text-xs text-rose-300">{err}</div>}
          <GlowButton onClick={create} disabled={creating}>{creating ? "创建中…" : "创建并前往 AI 组舰"}</GlowButton>
        </Panel>
      )}

      {loading ? (
        <div className="grid h-64 place-items-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {list.map((m) => {
            const phaseIdx = MISSION_PHASES.findIndex((p) => p.id === m.currentPhase);
            return (
              <Panel key={m.missionId} className="p-5 transition hover:holo-glow sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] text-cyan-400/70">{m.missionNo}</span>
                      <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                        m.missionStatus === "in_progress" ? "bg-emerald-400/15 text-emerald-300"
                        : m.missionStatus === "archived" ? "bg-slate-400/15 text-slate-400"
                        : "bg-amber-400/15 text-amber-300"}`}>
                        {STATUS_LABEL[m.missionStatus] ?? m.missionStatus}
                      </span>
                      {m.isDemo && <span className="rounded bg-violet-500/15 px-2 py-0.5 text-[10px] text-violet-300">演示</span>}
                    </div>
                    <h3 className="text-lg font-bold text-cyan-50">{m.missionName}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400">{m.missionGoal}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(m.missionTags ?? []).map((t) => (
                        <span key={t} className="rounded border border-cyan-400/20 bg-cyan-400/5 px-2 py-0.5 text-[10px] text-cyan-300">{t}</span>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={m.missionStatus === "pending_fleet" || m.missionStatus === "draft" ? `/fleet?missionId=${m.missionId}` : `/bridge?missionId=${m.missionId}`}
                    className="inline-flex shrink-0 items-center gap-2 self-start rounded-md border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/20"
                  >
                    {m.missionStatus === "pending_fleet" || m.missionStatus === "draft" ? <><Ship className="h-4 w-4" /> 前往组舰</> : <><Compass className="h-4 w-4" /> 进入舰桥</>}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* 阶段进度 */}
                <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-1">
                  {MISSION_PHASES.slice(0, 5).map((p, i) => (
                    <div key={p.id} className="flex flex-1 items-center gap-1">
                      <div className={`flex min-w-fit items-center gap-1 rounded-full px-2 py-1 text-[10px] ${
                        phaseIdx > i ? "bg-emerald-400/15 text-emerald-300"
                        : phaseIdx === i ? "bg-cyan-400/20 text-cyan-100"
                        : "bg-slate-400/8 text-slate-500"}`}>
                        {phaseIdx > i ? "✓" : ""}{p.short}
                      </div>
                      {i < 4 && <div className={`h-px flex-1 ${phaseIdx > i ? "bg-emerald-400/40" : "bg-slate-600/40"}`} />}
                    </div>
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
