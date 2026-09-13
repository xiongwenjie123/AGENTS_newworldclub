"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import { Panel, SectionTitle, GlowButton, ScoreRing } from "@/components/ui-kit";
import { RadarChart } from "@/components/radar-chart";
import { ROLE_LABEL } from "@/lib/constants";
import { Loader2, Award, Ship, Compass, RefreshCw, Star } from "lucide-react";
import { useRouter } from "next/navigation";

interface Passport {
  version: number;
  honorTitle: string;
  eightDimScore: Record<string, number>;
  cognitiveStyleTags: string[];
  seatScores: { seatId: string; seatName: string; cabin: string; cabinName: string; score: number }[];
  basis: { target_item: string; score: number; basis_text: string }[];
  starCount: number;
  apuCredit: number;
  missionCount: number;
  createdAt: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [passport, setPassport] = useState<Passport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (!user) return;
    api<{ passport: Passport | null }>(`/api/expedition/passport?userId=${user.userId}`)
      .then((d) => setPassport(d.passport))
      .catch(() => setPassport(null))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="grid h-96 place-items-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* 身份卡 */}
      <Panel glow className="relative overflow-hidden p-6 sm:p-8">
        <div className="scanline" />
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-2xl font-black text-slate-950">
              {user.nickname.slice(0, 1)}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-cyan-50">{user.nickname}</h1>
                <span className="rounded bg-violet-500/20 px-2 py-0.5 text-[11px] text-violet-200">{ROLE_LABEL[user.role] ?? user.role}</span>
              </div>
              <p className="mt-1 font-mono text-xs text-cyan-400/80">文明编号 · {user.civilizationNo}</p>
              <p className="mt-0.5 text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-3">
            {!passport && <GlowButton href="/onboarding"><Compass className="h-4 w-4" /> 完成登舰测试</GlowButton>}
            {passport && (
              <GlowButton href="/onboarding" variant="ghost"><RefreshCw className="h-4 w-4" /> 重新测绘</GlowButton>
            )}
          </div>
        </div>

        {/* 荣誉条 */}
        <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-md">
          {[
            { icon: Award, label: "荣誉称号", value: passport?.honorTitle ?? "—" },
            { icon: Star, label: "星级", value: `${passport?.starCount ?? 0} ★` },
            { icon: Ship, label: "Mission", value: `${passport?.missionCount ?? 0}` },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-cyan-400/15 bg-cyan-400/5 p-3 text-center">
              <s.icon className="mx-auto mb-1 h-4 w-4 text-cyan-300" />
              <div className="truncate text-sm font-bold text-cyan-100">{s.value}</div>
              <div className="text-[10px] text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </Panel>

      {!passport ? (
        <Panel className="p-12 text-center">
          <Compass className="mx-auto mb-4 h-12 w-12 text-cyan-400/60" />
          <h2 className="mb-2 text-lg font-bold text-cyan-100">尚未生成航行档案</h2>
          <p className="mx-auto mb-6 max-w-sm text-sm text-slate-400">完成 5 道登舰测试开放题，舰载智能将为你测绘专属能力画像与席位适配。</p>
          <GlowButton href="/onboarding">开始登舰测试</GlowButton>
        </Panel>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel className="flex flex-col items-center p-6">
              <SectionTitle sub={`航行档案 V${passport.version}`}>8 维能力画像</SectionTitle>
              <RadarChart scores={passport.eightDimScore} size={290} />
            </Panel>

            <Panel className="p-6">
              <SectionTitle>席位适配榜</SectionTitle>
              <div className="space-y-2">
                {passport.seatScores
                  .slice(0, 8)
                  .map((s, i) => (
                    <div key={s.seatId} className="flex items-center gap-3">
                      <span className={`w-5 text-center font-mono text-xs ${i < 3 ? "font-bold text-cyan-300" : "text-slate-500"}`}>{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-200">{s.seatName}<span className="ml-1.5 text-[10px] text-slate-500">{s.cabinName}</span></span>
                          <span className="font-mono font-bold text-cyan-200">{s.score}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cyan-400/10">
                          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${s.score}%` }} />
                        </div>
                      </div>
                      {i < 3 && <ScoreRing score={s.score} size={34} label="" />}
                    </div>
                  ))}
              </div>
            </Panel>
          </div>

          <Panel className="p-6">
            <h3 className="mb-3 text-sm font-bold text-cyan-200">认知风格 & AI 评分依据</h3>
            <div className="mb-4 flex flex-wrap gap-2">
              {passport.cognitiveStyleTags.map((t) => (
                <span key={t} className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">#{t}</span>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {passport.basis.slice(0, 6).map((b, i) => (
                <div key={i} className="rounded-md border border-cyan-400/12 bg-[rgba(8,18,44,0.5)] p-3 text-xs leading-relaxed text-slate-300">
                  <span className="mr-2 font-semibold text-cyan-300">{b.target_item}</span>
                  {b.basis_text}
                </div>
              ))}
            </div>
          </Panel>

          <div className="flex justify-center">
            <Link href="/pool" className="text-sm text-cyan-300 hover:underline">前往候选池，看看其他舰员 →</Link>
          </div>
        </>
      )}
    </div>
  );
}
