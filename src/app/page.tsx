"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Panel, SectionTitle, GlowButton } from "@/components/ui-kit";
import { SEATS, CABIN_LABEL, MISSION_PHASES, AGENTS } from "@/lib/constants";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import {
  Compass,
  Radar,
  Ship,
  Users,
  Sparkles,
  ShieldCheck,
  Workflow,
  Cpu,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const CABINS = [
  { id: "explore", icon: Compass, title: "探索舱", seats: 7, desc: "提出问题、发现信号、构想未来" },
  { id: "build", icon: Ship, title: "建造舱", seats: 7, desc: "架构、工程、原型与交付" },
  { id: "govern", icon: ShieldCheck, title: "治理舱", seats: 7, desc: "决策、协作、信任与凭证" },
];

const LOOP = [
  { icon: Users, title: "申请登舰", desc: "邮箱/手机号注册，签署协作公约" },
  { icon: Compass, title: "航行档案", desc: "AI 测绘 8 维能力与 21 席适配" },
  { icon: Workflow, title: "填迭代", desc: "发布 Mission，沉淀协作航迹" },
];

export default function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{ passportCount: number; missionCount: number; userCount: number } | null>(null);

  useEffect(() => {
    api<{ stats: { passportCount: number; missionCount: number; userCount: number } }>("/api/admin/stats")
      .then((d) => setStats(d.stats))
      .catch(() => setStats(null));
  }, []);

  return (
    <div className="space-y-20 pb-10">
      {/* HERO */}
      <section className="relative overflow-hidden pt-10 text-center sm:pt-16">
        <div className="scanline" />
        <div className="fade-up mx-auto max-w-4xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/8 px-4 py-1.5 text-xs text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" />
            21 席 · 灵魂协作操作系统
          </div>
          <h1 className="text-4xl font-black leading-tight tracking-wide sm:text-6xl">
            <span className="title-gradient text-glow">新大陆俱乐部</span>
          </h1>
          <p className="mt-2 text-xl font-bold tracking-[0.3em] text-cyan-300/90 sm:text-2xl">NEW WORLD CLUB</p>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            不是寻找最优秀的人，而是寻找可以共同完成
            <span className="text-cyan-300">伟大航行</span>
            的互补个体。
            <br className="hidden sm:block" />
            从大航海时代的木帆船，到 AI 时代的星际星舰——我们用「航行档案」读懂你，用「21 席三舱」组好队，用「舰载智能」补齐缺口。
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            {user ? (
              <>
                <GlowButton href="/dashboard">进入母港 <ArrowRight className="h-4 w-4" /></GlowButton>
                <GlowButton href="/mission" variant="ghost">查看 Mission</GlowButton>
              </>
            ) : (
              <>
                <GlowButton href="/onboarding">申请登舰 <ArrowRight className="h-4 w-4" /></GlowButton>
                <GlowButton href="/login" variant="ghost">已有账号 · 登录</GlowButton>
              </>
            )}
          </div>

          {/* 演示账号提示 */}
          {!user && (
            <div className="mx-auto mt-8 max-w-lg rounded-lg border border-violet-400/25 bg-violet-500/8 px-4 py-3 text-left text-xs text-violet-200/90">
              <div className="mb-1 font-semibold text-violet-300">⚡ 一键体验演示账号</div>
              <div>舰员：<code className="text-cyan-200">demo1@newworld.club</code>　治理者：<code className="text-cyan-200">admin@newworld.club</code>　密码均为 <code className="text-cyan-200">demo123456</code></div>
            </div>
          )}
        </div>

        {/* 星舰意象 */}
        <div className="relative mx-auto mt-12 h-40 max-w-3xl sm:h-56">
          <svg viewBox="0 0 800 200" className="h-full w-full">
            <defs>
              <linearGradient id="shipGlow" x1="0" x2="1">
                <stop offset="0%" stopColor="#6fe6ff" stopOpacity="0" />
                <stop offset="100%" stopColor="#6fe6ff" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <line x1="40" y1="150" x2="760" y2="150" stroke="url(#shipGlow)" strokeWidth="1.5" className="flow-line" />
            <g className="float-slow" style={{ transformOrigin: "center" }}>
              <path d="M 420 100 L 620 100 L 680 120 L 620 140 L 420 140 L 380 120 Z" fill="rgba(57,205,251,0.08)" stroke="#6fe6ff" strokeWidth="1.5" />
              <path d="M 470 100 L 560 78 L 600 100 Z" fill="rgba(139,92,246,0.18)" stroke="#a78bfa" strokeWidth="1.2" />
              <circle cx="640" cy="120" r="3" fill="#bff3ff">
                <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
              </circle>
            </g>
          </svg>
        </div>
      </section>

      {/* 数据条 */}
      <section className="grid grid-cols-3 gap-3 sm:gap-6">
        {[
          { label: "航行档案", value: stats?.passportCount ?? "—", icon: Radar },
          { label: "在航 Mission", value: stats?.missionCount ?? "—", icon: Compass },
          { label: "登舰成员", value: stats?.userCount ?? "—", icon: Users },
        ].map((s) => (
          <Panel key={s.label} className="px-4 py-5 text-center sm:py-7">
            <s.icon className="mx-auto mb-2 h-5 w-5 text-cyan-300 sm:h-6 sm:w-6" />
            <div className="text-2xl font-black text-glow title-gradient sm:text-4xl">{s.value}</div>
            <div className="mt-1 text-xs text-slate-400 sm:text-sm">{s.label}</div>
          </Panel>
        ))}
      </section>

      {/* 世界观 三舱 */}
      <section>
        <SectionTitle sub="一艘能远航的星舰，需要 21 个互补的席位">世界观 · 21 席三舱</SectionTitle>
        <div className="grid gap-5 md:grid-cols-3">
          {CABINS.map((c) => (
            <Panel key={c.id} className="group p-6 transition hover:holo-glow">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-lg border border-cyan-400/30 bg-cyan-400/10">
                  <c.icon className="h-6 w-6 text-cyan-300" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-cyan-100">{c.title}</h3>
                  <p className="text-xs text-slate-400">{c.seats} 个席位</p>
                </div>
              </div>
              <p className="mb-4 text-sm text-slate-300">{c.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {SEATS.filter((s) => s.cabin === c.id).map((s) => (
                  <span key={s.id} className="rounded border border-cyan-400/20 bg-cyan-400/6 px-2 py-1 text-[11px] text-slate-300">
                    {s.name}
                  </span>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      </section>

      {/* 业务循环 */}
      <section>
        <SectionTitle sub="申请登舰 → 航行档案 → Mission 协作 → 归档复盘，航迹持续沉淀">业务循环</SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {LOOP.map((l, i) => (
            <Panel key={l.title} className="relative p-6">
              <div className="absolute -top-3 left-6 grid h-7 w-7 place-items-center rounded-full border border-cyan-400/40 bg-[#0a1430] text-xs font-bold text-cyan-300">
                {i + 1}
              </div>
              <l.icon className="mb-3 h-7 w-7 text-cyan-300" />
              <h3 className="mb-1.5 text-lg font-bold text-cyan-100">{l.title}</h3>
              <p className="text-sm text-slate-400">{l.desc}</p>
            </Panel>
          ))}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {MISSION_PHASES.slice(0, 5).map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-cyan-400/15 bg-cyan-400/5 px-4 py-3 text-sm text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              {p.name}
            </div>
          ))}
        </div>
      </section>

      {/* 舰载智能 */}
      <section>
        <SectionTitle sub="Agent 永远只在低匹配席位补位，产出必须经人工确认">舰载智能 · 三 Agent</SectionTitle>
        <div className="grid gap-5 md:grid-cols-3">
          {AGENTS.map((a) => (
            <Panel key={a.alias} className="p-6">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full border border-violet-400/40 bg-violet-500/15">
                  <Cpu className="h-6 w-6 text-violet-300" />
                </span>
                <div>
                  <div className="font-mono text-sm font-bold text-violet-200">{a.alias}</div>
                  <div className="text-xs text-slate-400">{a.name}</div>
                </div>
              </div>
              <p className="text-sm text-slate-300">{a.duty}</p>
            </Panel>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          数据隔离：Agent 仅在你授权的舰队范围内读取数据，你的航行档案属于你自己。
        </p>
      </section>

      {/* CTA */}
      <section className="text-center">
        <Panel glow className="mx-auto max-w-2xl p-8 sm:p-10">
          <Radar className="mx-auto mb-4 h-12 w-12 text-cyan-300" style={{ filter: "drop-shadow(0 0 10px rgba(111,230,255,0.6))" }} />
          <h2 className="mb-3 text-2xl font-black title-gradient sm:text-3xl">准备好登舰了吗？</h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-slate-300">
            完成 5 道开放题登舰测试，舰载智能将为你测绘专属「航行档案」，并推荐最适配的席位。
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <GlowButton href={user ? "/dashboard" : "/onboarding"}>
              {user ? "进入我的母港" : "开始登舰测试"} <ArrowRight className="h-4 w-4" />
            </GlowButton>
            {!user && (
              <Link href="/login" className="inline-flex items-center px-4 py-3 text-sm text-slate-400 hover:text-cyan-200">
                已有账号，直接登录
              </Link>
            )}
          </div>
        </Panel>
      </section>
    </div>
  );
}
