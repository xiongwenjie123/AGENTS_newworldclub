"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import { Panel, GlowButton, SectionTitle } from "@/components/ui-kit";
import { RadarChart } from "@/components/radar-chart";
import { DIMENSIONS, SEATS, CABIN_LABEL } from "@/lib/constants";
import { Compass, Loader2, CheckCircle2, ArrowRight, Lock } from "lucide-react";

interface Question {
  id: string;
  title: string;
  tag: string;
}
interface Passport {
  honorTitle: string;
  eightDimScore: Record<string, number>;
  cognitiveStyleTags: string[];
  seatFullScore: Record<string, number>;
  seatExplainBasis: { target_item: string; score: number; basis_text: string }[];
}

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<"intro" | "quiz" | "analyzing" | "result">("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [passport, setPassport] = useState<Passport | null>(null);
  const [inPool, setInPool] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  const start = async () => {
    setErr("");
    try {
      const data = await api<{ questions: Question[] }>("/api/expedition/questions");
      setQuestions(data.questions);
      setIdx(0);
      setAnswers({});
      setStep("quiz");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "题目加载失败");
    }
  };

  const submit = async () => {
    setErr("");
    setStep("analyzing");
    try {
      const payload = questions.map((q) => ({ questionId: q.id, questionTitle: q.title, answer: answers[q.id] ?? "" }));
      const data = await api<{ passport: Passport; sessionId: string }>("/api/expedition/submit", {
        method: "POST",
        body: { answers: payload },
      });
      setPassport(data.passport);
      setStep("result");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "测绘失败，请重试");
      setStep("quiz");
    }
  };

  const joinPool = async () => {
    await api("/api/expedition/pool", { method: "POST", body: { inPool: true } }).catch(() => {});
    setInPool(true);
  };

  if (authLoading || !user) {
    return (
      <div className="grid h-96 place-items-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-6">
      {step === "intro" && (
        <Panel glow className="p-8 text-center sm:p-12">
          <Compass className="mx-auto mb-4 h-12 w-12 text-cyan-300" style={{ filter: "drop-shadow(0 0 10px rgba(111,230,255,0.6))" }} />
          <h1 className="mb-3 text-2xl font-black title-gradient sm:text-3xl">航行档案测绘</h1>
          <p className="mx-auto mb-6 max-w-lg text-sm leading-relaxed text-slate-300">
            欢迎登舰，<span className="text-cyan-300">{user.nickname}</span>。接下来的 <b className="text-cyan-200">5 道开放题</b>没有标准答案——
            舰载智能「航行档案测绘官」将根据你的真实经历，分析你的 8 维协作能力与 21 席适配度。
          </p>
          <div className="mx-auto mb-7 grid max-w-md grid-cols-3 gap-3 text-xs text-slate-400">
            {["行为依据评分", "无标准答案", "数据归属你自己"].map((t) => (
              <div key={t} className="rounded-lg border border-cyan-400/15 bg-cyan-400/5 px-2 py-3">
                <Lock className="mx-auto mb-1.5 h-4 w-4 text-cyan-400" />
                {t}
              </div>
            ))}
          </div>
          {err && <div className="mb-4 text-xs text-rose-300">{err}</div>}
          <GlowButton onClick={start}>开始测绘 <ArrowRight className="h-4 w-4" /></GlowButton>
        </Panel>
      )}

      {step === "quiz" && questions[idx] && (
        <Panel className="p-7 sm:p-9">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-400">QUESTION {idx + 1} / {questions.length}</span>
            <div className="flex gap-1.5">
              {questions.map((_, i) => (
                <span key={i} className={`h-1.5 w-6 rounded-full ${i <= idx ? "bg-cyan-400" : "bg-cyan-400/20"}`} />
              ))}
            </div>
          </div>
          <h2 className="mb-1.5 text-lg font-bold text-cyan-100 sm:text-xl">{questions[idx].title}</h2>
          <p className="mb-5 text-xs text-slate-500">请结合你的真实经历，尽可能具体地描述（建议 50 字以上）</p>
          <textarea
            className="nw-input min-h-[180px] w-full rounded-lg p-4 text-sm leading-relaxed"
            placeholder="在这里写下你的故事与做法…"
            value={answers[questions[idx].id] ?? ""}
            onChange={(e) => setAnswers((a) => ({ ...a, [questions[idx].id]: e.target.value }))}
          />
          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="text-sm text-slate-400 disabled:opacity-30"
            >
              上一题
            </button>
            {idx < questions.length - 1 ? (
              <GlowButton onClick={() => setIdx((i) => i + 1)} disabled={!(answers[questions[idx].id] ?? "").trim()}>
                下一题 <ArrowRight className="h-4 w-4" />
              </GlowButton>
            ) : (
              <GlowButton onClick={submit} disabled={!(answers[questions[idx].id] ?? "").trim()}>
                提交 · 开始 AI 测绘
              </GlowButton>
            )}
          </div>
          {err && <div className="mt-4 text-xs text-rose-300">{err}</div>}
        </Panel>
      )}

      {step === "analyzing" && (
        <Panel glow className="grid place-items-center p-16 text-center">
          <Loader2 className="mb-5 h-12 w-12 animate-spin text-cyan-300" />
          <h2 className="mb-2 text-xl font-bold text-cyan-100">舰载智能正在测绘你的航行档案…</h2>
          <p className="max-w-sm text-sm text-slate-400">正在解析行为依据、归一化 8 维能力分、映射 21 席适配度，全程约需数秒。</p>
          <div className="mt-6 flex gap-2">
            {["解析答卷", "能力建模", "席位映射"].map((t, i) => (
              <span key={t} className="rounded-full border border-cyan-400/25 bg-cyan-400/8 px-3 py-1 text-[11px] text-cyan-200" style={{ animation: `pulseGlow 1.5s ${i * 0.3}s infinite` }}>
                {t}
              </span>
            ))}
          </div>
        </Panel>
      )}

      {step === "result" && passport && (
        <div className="space-y-6">
          <Panel glow className="relative overflow-hidden p-8 text-center">
            <div className="scanline" />
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-400" />
            <p className="text-xs tracking-[0.3em] text-cyan-400/70">YOUR HONOR TITLE</p>
            <h1 className="mt-1 text-3xl font-black title-gradient text-glow">{passport.honorTitle}</h1>
            <p className="mt-2 text-sm text-slate-300">
              认知风格：{passport.cognitiveStyleTags.map((t) => `#${t}`).join(" ")}
            </p>
          </Panel>

          <div className="grid gap-6 md:grid-cols-2">
            <Panel className="flex flex-col items-center p-6">
              <SectionTitle sub="基于你答卷中的真实行为依据">8 维能力画像</SectionTitle>
              <RadarChart scores={passport.eightDimScore} size={300} />
              <div className="mt-4 grid w-full grid-cols-2 gap-x-6 gap-y-2">
                {DIMENSIONS.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{d.name}</span>
                    <span className="font-mono font-bold text-cyan-200">{passport.eightDimScore[d.id] ?? 0}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="p-6">
              <SectionTitle sub="适配度最高的席位推荐">21 席适配</SectionTitle>
              <div className="space-y-2.5">
                {[...SEATS]
                  .map((s) => ({ ...s, score: passport.seatFullScore[s.id] ?? 0 }))
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 6)
                  .map((s) => (
                    <div key={s.id} className="rounded-lg border border-cyan-400/15 bg-cyan-400/5 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-cyan-100">{s.name}</span>
                          <span className="rounded bg-cyan-400/10 px-1.5 py-0.5 text-[10px] text-cyan-300">{CABIN_LABEL[s.cabin]}</span>
                        </div>
                        <span className="font-mono text-sm font-bold text-cyan-300">{s.score}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cyan-400/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${s.score}%` }} />
                      </div>
                    </div>
                  ))}
              </div>
            </Panel>
          </div>

          <Panel className="p-6">
            <h3 className="mb-3 text-sm font-bold text-cyan-200">AI 评分依据（可解释）</h3>
            <div className="space-y-2">
              {passport.seatExplainBasis.slice(0, 4).map((b, i) => (
                <div key={i} className="rounded-md border border-cyan-400/12 bg-[rgba(8,18,44,0.5)] p-3 text-xs leading-relaxed text-slate-300">
                  <span className="mr-2 font-semibold text-cyan-300">{b.target_item}</span>
                  {b.basis_text}
                </div>
              ))}
            </div>
          </Panel>

          <Panel glow className="flex flex-col items-center gap-4 p-8 text-center">
            <h3 className="text-lg font-bold text-cyan-100">你的航行档案已生成（V1）</h3>
            <p className="max-w-md text-sm text-slate-400">
              选择加入候选池后，舰长发布 Mission 时，舰载智能将在你授权范围内读取画像并为你匹配席位。
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {!inPool ? (
                <GlowButton onClick={joinPool}>加入候选池 <CheckCircle2 className="h-4 w-4" /></GlowButton>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> 已加入候选池
                </span>
              )}
              <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-3 text-sm text-slate-300 hover:text-cyan-200">
                查看我的航行档案 <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
