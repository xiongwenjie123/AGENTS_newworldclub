"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { Panel, SectionTitle } from "@/components/ui-kit";
import { CabinBadge } from "@/components/ui-kit";
import { SEATS, CABIN_LABEL } from "@/lib/constants";
import { Loader2, Users, Search } from "lucide-react";

interface Candidate {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  civilizationNo: string;
  honorTitle: string;
  starCount: number;
  apuCredit: number;
  cognitiveStyleTags: string[];
  topSeats: { seatId: string; seatName: string; cabin: string; score: number }[];
}

export default function PoolPage() {
  const [list, setList] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [cabin, setCabin] = useState<string>("all");
  const [kw, setKw] = useState("");

  useEffect(() => {
    api<{ members: Candidate[] }>("/api/expedition/pool")
      .then((d) => setList(d.members ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return list.filter((c) => {
      if (kw && !c.nickname.includes(kw) && !c.cognitiveStyleTags.some((t) => t.includes(kw))) return false;
      if (cabin !== "all" && !c.topSeats.some((s) => s.cabin === cabin)) return false;
      return true;
    });
  }, [list, cabin, kw]);

  return (
    <div className="space-y-6">
      <SectionTitle sub="舰长发布 Mission 时，舰载智能在此扫描并匹配互补舰员">星舰候选池</SectionTitle>

      <Panel className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Users className="h-4 w-4 text-cyan-300" />
            共 <b className="text-cyan-200">{filtered.length}</b> 位候选舰员
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md border border-cyan-400/20 bg-[rgba(8,18,44,0.6)] px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-slate-500" />
              <input
                value={kw}
                onChange={(e) => setKw(e.target.value)}
                placeholder="搜索代号 / 风格标签"
                className="w-40 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600"
              />
            </div>
            <div className="flex gap-1.5">
              {[
                { id: "all", label: "全部" },
                { id: "explore", label: "探索舱" },
                { id: "build", label: "建造舱" },
                { id: "govern", label: "治理舱" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCabin(c.id)}
                  className={`rounded-md px-3 py-1.5 text-xs transition ${cabin === c.id ? "bg-cyan-400/20 text-cyan-100" : "text-slate-400 hover:bg-cyan-400/10"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {loading ? (
        <div className="grid h-64 place-items-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Panel key={c.userId} className="p-5 transition hover:holo-glow">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/80 to-violet-500/80 text-base font-black text-slate-950">
                  {c.nickname.slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold text-cyan-50">{c.nickname}</span>
                  </div>
                  <div className="font-mono text-[10px] text-slate-500">{c.civilizationNo}</div>
                </div>
                <span className="ml-auto rounded bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">{c.honorTitle}</span>
              </div>

              <div className="mb-3 flex flex-wrap gap-1.5">
                {c.cognitiveStyleTags.slice(0, 3).map((t) => (
                  <span key={t} className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-200">#{t}</span>
                ))}
              </div>

              <div className="space-y-1.5">
                {c.topSeats.slice(0, 3).map((s) => (
                  <div key={s.seatId} className="flex items-center gap-2">
                    <CabinBadge cabin={s.cabin} />
                    <span className="text-xs text-slate-300">{s.seatName}</span>
                    <div className="ml-auto h-1.5 w-16 overflow-hidden rounded-full bg-cyan-400/10">
                      <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${s.score}%` }} />
                    </div>
                    <span className="w-7 text-right font-mono text-[11px] font-bold text-cyan-300">{s.score}</span>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <Panel className="p-12 text-center text-sm text-slate-400">候选池暂无符合条件的舰员</Panel>
      )}

      <p className="text-center text-[11px] text-slate-600">
        候选池仅展示成员主动公开的席位适配摘要；完整 8 维画像需在加入具体舰队后授权可见。
      </p>
    </div>
  );
}
