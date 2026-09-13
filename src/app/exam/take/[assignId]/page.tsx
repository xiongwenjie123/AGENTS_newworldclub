"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { Panel, SectionTitle, GlowButton } from "@/components/ui-kit";
import { Loader2, CheckCircle2, Save } from "lucide-react";

interface Question {
  questionId: string;
  title: string;
  questionType: string;
  options: Record<string, string> | null;
  weightScore: number;
}

function TakeInner() {
  const sp = useSearchParams();
  const assignId = sp.get("assignId") ?? "";
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [paperName, setPaperName] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const fetchPaper = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ questions: Question[]; drafts: Record<string, string>; paperName: string; assignId: string }>(`api/exam/user/paper/${assignId}`);
      setQuestions(data.questions);
      setAnswers(data.drafts ?? {});
      setPaperName(data.paperName);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [assignId]);

  useEffect(() => {
    fetchPaper();
  }, [fetchPaper]);

  const saveDraft = async () => {
    try {
      await api("/api/exam/user/draft", { method: "POST", body: { assignId, answers } });
    } catch {
      // 静默失败
    }
  };

  useEffect(() => {
    if (questions.length === 0) return;
    const timer = setInterval(saveDraft, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, answers]);

  const submit = async () => {
    const unanswered = questions.filter((q) => !answers[q.questionId]?.trim());
    if (unanswered.length > 0 && !confirm(`还有 ${unanswered.length} 题未作答，确认提交？`)) return;
    setSubmitting(true);
    setErr("");
    try {
      await api("/api/exam/user/submit", { method: "POST", body: { assignId, answers } });
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Panel className="grid place-items-center p-12"><Loader2 className="h-8 w-8 animate-spin text-cyan-300" /></Panel>;
  }

  if (done) {
    return (
      <Panel className="p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-300" />
        <h3 className="text-xl font-bold text-emerald-200">答卷提交成功</h3>
        <p className="mt-2 text-sm text-slate-400">测评报告已生成，请等待 HR 查看</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <SectionTitle sub={paperName}>在线答题</SectionTitle>
      {err && <Panel className="border-rose-400/40 p-4 text-sm text-rose-300">{err}</Panel>}

      {questions.map((q, i) => (
        <Panel key={q.questionId} className="p-4">
          <div className="mb-3 flex items-start gap-2">
            <span className="shrink-0 rounded bg-cyan-400/20 px-2 py-0.5 text-sm font-bold text-cyan-200">{i + 1}</span>
            <div className="flex-1">
              <p className="text-slate-100">{q.title}</p>
              <span className="text-xs text-slate-500">{q.questionType === "single" ? "单选题" : q.questionType === "multiple" ? "多选题" : "简答题"} · 权重 {q.weightScore}</span>
            </div>
          </div>
          {q.questionType === "essay" ? (
            <textarea
              className="w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200"
              rows={4}
              placeholder="请输入你的回答…"
              value={answers[q.questionId] ?? ""}
              onChange={(e) => setAnswers({ ...answers, [q.questionId]: e.target.value })}
            />
          ) : q.options ? (
            <div className="space-y-2">
              {Object.entries(q.options).map(([key, val]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 rounded border border-slate-700/50 p-2 hover:bg-cyan-400/5">
                  <input
                    type={q.questionType === "single" ? "radio" : "checkbox"}
                    name={q.questionId}
                    checked={answers[q.questionId]?.split(",").includes(key) ?? false}
                    onChange={(e) => {
                      const current = answers[q.questionId] ? answers[q.questionId].split(",").filter(Boolean) : [];
                      const next = e.target.checked ? [...current, key] : current.filter((k) => k !== key);
                      setAnswers({ ...answers, [q.questionId]: next.join(",") });
                    }}
                  />
                  <span className="text-cyan-300">{key}</span>
                  <span className="text-slate-200">{val}</span>
                </label>
              ))}
            </div>
          ) : (
            <input className="w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200" value={answers[q.questionId] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.questionId]: e.target.value })} />
          )}
        </Panel>
      ))}

      <div className="flex justify-end gap-3">
        <GlowButton variant="ghost" onClick={saveDraft}><Save className="h-4 w-4" />保存草稿</GlowButton>
        <GlowButton onClick={submit} disabled={submitting}>{submitting ? "提交中…" : "提交答卷"}</GlowButton>
      </div>
    </div>
  );
}

export default function ExamTakePage() {
  return (
    <Suspense fallback={<Panel className="grid place-items-center p-12"><Loader2 className="h-8 w-8 animate-spin text-cyan-300" /></Panel>}>
      <TakeInner />
    </Suspense>
  );
}