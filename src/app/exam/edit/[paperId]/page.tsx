"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { Panel, SectionTitle, GlowButton } from "@/components/ui-kit";
import { Loader2, Save, Plus, X, Search } from "lucide-react";

interface PaperDetail {
  paperId: string;
  paperName: string;
  questionIds: string[];
  timeLimit: number | null;
  status: number;
  demandJson: unknown;
}

interface Question {
  questionId: string;
  title: string;
  questionType: string;
  weightScore: number;
  eightDimTags: string;
  career21Tags: string;
}

export default function ExamEditPage() {
  const params = useParams<{ paperId: string }>();
  const paperId = params.paperId;

  const [paper, setPaper] = useState<PaperDetail | null>(null);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [editName, setEditName] = useState("");
  const [editTimeLimit, setEditTimeLimit] = useState<string>("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());

  const fetchPaper = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ paper: PaperDetail; questions: Question[] }>(`api/exam/paper/${paperId}`);
      setPaper(data.paper);
      setCurrentQuestions(data.questions);
      setEditName(data.paper.paperName);
      setEditTimeLimit(data.paper.timeLimit?.toString() ?? "");
      setSelectedQuestionIds(new Set(data.paper.questionIds as string[]));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加载考卷失败");
    } finally {
      setLoading(false);
    }
  }, [paperId]);

  const fetchAllQuestions = useCallback(async () => {
    try {
      const data = await api<{ records: Question[] }>("/api/exam/admin/questions", { query: { size: 100 } });
      setAllQuestions(data.records);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加载题库失败");
    }
  }, []);

  useEffect(() => {
    fetchPaper();
    fetchAllQuestions();
  }, [fetchPaper, fetchAllQuestions]);

  const toggleQuestion = (qid: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  };

  const save = async () => {
    if (!paper) return;
    setSaving(true);
    setErr("");
    try {
      await api(`api/exam/paper/${paperId}`, {
        method: "PUT",
        body: {
          paperName: editName,
          questionIds: Array.from(selectedQuestionIds),
          timeLimit: editTimeLimit ? Number(editTimeLimit) : null,
        },
      });
      alert("保存成功");
      fetchPaper();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const filteredQuestions = allQuestions.filter((q) => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      q.title.toLowerCase().includes(kw) ||
      q.eightDimTags.toLowerCase().includes(kw) ||
      q.career21Tags.toLowerCase().includes(kw)
    );
  });

  if (loading) {
    return <div className="grid place-items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-cyan-300" /></div>;
  }

  if (!paper) {
    return <Panel className="border-rose-400/40 p-4 text-sm text-rose-300">{err || "考卷不存在"}</Panel>;
  }

  return (
    <div className="space-y-6">
      <SectionTitle sub="手动调整考卷题目 · 编辑名称与限时">登舰智考 · 考卷编辑</SectionTitle>

      {err && <Panel className="border-rose-400/40 p-4 text-sm text-rose-300">{err}</Panel>}

      <Panel className="p-4">
        <h3 className="mb-4 text-lg font-bold text-cyan-100">考卷信息</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-slate-400">考卷名称</span>
            <input
              className="mt-1 w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-400">限时（分钟，留空不限时）</span>
            <input
              type="number"
              className="mt-1 w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200"
              value={editTimeLimit}
              onChange={(e) => setEditTimeLimit(e.target.value)}
              placeholder="不限时"
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <GlowButton onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            保存修改
          </GlowButton>
          <span className="text-sm text-slate-400">当前已选 {selectedQuestionIds.size} 题</span>
        </div>
      </Panel>

      <Panel className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-cyan-100">已选题目（{selectedQuestionIds.size}）</h3>
        </div>
        {selectedQuestionIds.size === 0 ? (
          <div className="py-4 text-center text-slate-500">暂未选择任何题目</div>
        ) : (
          <div className="space-y-2">
            {currentQuestions
              .filter((q) => selectedQuestionIds.has(q.questionId))
              .map((q, idx) => (
                <div key={q.questionId} className="flex items-start gap-3 rounded border border-cyan-400/15 bg-slate-900/40 p-3">
                  <span className="mt-0.5 text-xs font-bold text-cyan-400">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-200">{q.title}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {q.questionType} · 权重 {q.weightScore} · {q.eightDimTags || "无维度标签"}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleQuestion(q.questionId)}
                    className="text-rose-300 hover:text-rose-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
          </div>
        )}
      </Panel>

      <Panel className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-cyan-100">题库选题（{allQuestions.length} 题可选）</h3>
          <input
            className="w-56 rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500"
            placeholder="搜索题干/维度/职业"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          {filteredQuestions.map((q) => {
            const selected = selectedQuestionIds.has(q.questionId);
            return (
              <div
                key={q.questionId}
                className={`flex items-start gap-3 rounded border p-3 transition ${
                  selected
                    ? "border-cyan-400/40 bg-cyan-400/5"
                    : "border-slate-700/40 bg-slate-900/30 hover:border-cyan-400/20"
                }`}
              >
                <button
                  onClick={() => toggleQuestion(q.questionId)}
                  className={`mt-0.5 grid h-5 w-5 place-items-center rounded border ${
                    selected
                      ? "border-cyan-400 bg-cyan-400 text-slate-950"
                      : "border-slate-500 text-transparent"
                  }`}
                >
                  <Plus className="h-3 w-3" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-200">{q.title}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {q.questionType} · 权重 {q.weightScore} · {q.eightDimTags || "无维度标签"} · {q.career21Tags || "无职业标签"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}