"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { Panel, SectionTitle, GlowButton } from "@/components/ui-kit";
import { DIMENSIONS, SEATS } from "@/lib/constants";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ExamCreatePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    paperName: "",
    industry: "",
    jobTitle: "",
    jobDesc: "",
    targetEightDim: "",
    targetCareer21: "",
    totalQuestionCount: 20,
    timeLimit: 0,
    remark: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ paperId: string; questions: { questionId: string; title: string; questionType: string }[] } | null>(null);
  const [err, setErr] = useState("");

  const toggleEight = (dim: string) => {
    const tags = form.targetEightDim ? form.targetEightDim.split(",") : [];
    const next = tags.includes(dim) ? tags.filter((t) => t !== dim) : [...tags, dim];
    setForm({ ...form, targetEightDim: next.join(",") });
  };

  const toggleCareer = (seatId: string) => {
    const tags = form.targetCareer21 ? form.targetCareer21.split(",") : [];
    const next = tags.includes(seatId) ? tags.filter((t) => t !== seatId) : [...tags, seatId];
    setForm({ ...form, targetCareer21: next.join(",") });
  };

  const generate = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await api<{ paperId: string; questions: { questionId: string; title: string; questionType: string }[] }>("/api/exam/paper/create", {
        method: "POST",
        body: {
          paperName: form.paperName,
          industry: form.industry,
          jobTitle: form.jobTitle,
          jobDesc: form.jobDesc,
          targetEightDim: form.targetEightDim,
          targetCareer21: form.targetCareer21,
          totalQuestionCount: form.totalQuestionCount,
          timeLimit: form.timeLimit || undefined,
          remark: form.remark,
        },
      });
      setResult(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle sub="填写招聘需求，AI 自动从官方题库组卷">生成专属考卷</SectionTitle>

      {err && <Panel className="border-rose-400/40 p-4 text-sm text-rose-300">{err}</Panel>}

      {result ? (
        <Panel className="p-6">
          <div className="mb-4 flex items-center gap-2 text-emerald-300"><CheckCircle2 className="h-6 w-6" /><span className="text-lg font-bold">考卷生成成功</span></div>
          <div className="mb-2 text-sm text-slate-400">考卷 ID：{result.paperId} · 共 {result.questions.length} 题</div>
          <div className="mt-4 space-y-2">
            {result.questions.map((q, i) => (
              <div key={q.questionId} className="rounded border border-cyan-400/10 bg-slate-900/40 p-2 text-sm">
                <span className="text-cyan-300">{i + 1}. [{q.questionType}]</span> <span className="text-slate-200">{q.title}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <GlowButton onClick={() => router.push("/exam")}>返回考卷管理</GlowButton>
          </div>
        </Panel>
      ) : (
        <Panel className="p-6">
          {loading ? (
            <div className="grid place-items-center py-12"><Loader2 className="h-10 w-10 animate-spin text-cyan-300" /><p className="mt-3 text-sm text-slate-300">AI 正在从官方题库组卷…</p></div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm text-slate-400">考卷名称 *</span>
                  <input className="mt-1 w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200" value={form.paperName} onChange={(e) => setForm({ ...form, paperName: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-400">所属行业</span>
                  <input className="mt-1 w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-400">目标岗位</span>
                  <input className="mt-1 w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-400">题目数量（5-50）</span>
                  <input type="number" min={5} max={50} className="mt-1 w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200" value={form.totalQuestionCount} onChange={(e) => setForm({ ...form, totalQuestionCount: Number(e.target.value) })} />
                </label>
              </div>
              <label className="block">
                <span className="text-sm text-slate-400">岗位描述</span>
                <textarea className="mt-1 w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200" rows={3} value={form.jobDesc} onChange={(e) => setForm({ ...form, jobDesc: e.target.value })} />
              </label>
              <div>
                <span className="text-sm text-slate-400">重点考察八维能力（多选）</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DIMENSIONS.map((d) => (
                    <button key={d.id} onClick={() => toggleEight(d.id)} className={`rounded-full border px-3 py-1 text-xs ${form.targetEightDim.split(",").includes(d.id) ? "border-cyan-400 bg-cyan-400/20 text-cyan-100" : "border-slate-600 text-slate-400"}`}>
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-sm text-slate-400">期望 21 席类型（多选）</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SEATS.map((s) => (
                    <button key={s.id} onClick={() => toggleCareer(s.id)} className={`rounded-full border px-3 py-1 text-xs ${form.targetCareer21.split(",").includes(s.id) ? "border-violet-400 bg-violet-400/20 text-violet-100" : "border-slate-600 text-slate-400"}`}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm text-slate-400">考试限时（分钟，0=不限）</span>
                  <input type="number" min={0} className="mt-1 w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200" value={form.timeLimit} onChange={(e) => setForm({ ...form, timeLimit: Number(e.target.value) })} />
                </label>
              </div>
              <label className="block">
                <span className="text-sm text-slate-400">附加备注</span>
                <textarea className="mt-1 w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200" rows={2} value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
              </label>
              <div className="flex justify-end gap-3">
                <GlowButton variant="ghost" onClick={() => router.push("/exam")}>取消</GlowButton>
                <GlowButton onClick={generate} disabled={!form.paperName}>生成考卷</GlowButton>
              </div>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}