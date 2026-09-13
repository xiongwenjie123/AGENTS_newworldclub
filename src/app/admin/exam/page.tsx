"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import { Panel, SectionTitle, GlowButton } from "@/components/ui-kit";
import { DIMENSIONS, SEATS } from "@/lib/constants";
import { Loader2, Plus, Edit3, Trash2, Search, Upload } from "lucide-react";

interface Question {
  questionId: string;
  title: string;
  questionType: string;
  options: unknown;
  judgeRule: string | null;
  eightDimTags: string;
  career21Tags: string;
  industry: string;
  weightScore: number;
  status: number;
  createdAt: string;
}

const emptyForm = {
  questionId: "",
  title: "",
  questionType: "essay",
  options: "",
  judgeRule: "",
  eightDimTags: "",
  career21Tags: "",
  industry: "",
  weightScore: 5,
  status: 1,
};

export default function ExamQuestionLibPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState({ eightDimTags: "", industry: "", status: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [err, setErr] = useState("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await api<{ records: Question[]; total: number }>("/api/exam/admin/questions", {
        query: { eight_dim_tags: search.eightDimTags, industry: search.industry, status: search.status, size: 100 },
      });
      setList(data.records);
      setTotal(data.total);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openAdd = () => {
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (q: Question) => {
    setForm({
      questionId: q.questionId,
      title: q.title,
      questionType: q.questionType,
      options: q.options ? JSON.stringify(q.options) : "",
      judgeRule: q.judgeRule ?? "",
      eightDimTags: q.eightDimTags,
      career21Tags: q.career21Tags,
      industry: q.industry,
      weightScore: q.weightScore,
      status: q.status,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    setErr("");
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        questionType: form.questionType,
        eightDimTags: form.eightDimTags,
        career21Tags: form.career21Tags,
        industry: form.industry,
        weightScore: form.weightScore,
        status: form.status,
      };
      if (form.options) payload.options = JSON.parse(form.options);
      if (form.judgeRule) payload.judgeRule = form.judgeRule;

      if (form.questionId) {
        await api(`api/exam/admin/questions/${form.questionId}`, { method: "PUT", body: payload });
      } else {
        await api("/api/exam/admin/questions", { method: "POST", body: payload });
      }
      setDialogOpen(false);
      fetchList();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "保存失败");
    }
  };

  const del = async (id: string) => {
    if (!confirm("确认删除此题目？")) return;
    try {
      await api(`api/exam/admin/questions/${id}`, { method: "DELETE" });
      fetchList();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "删除失败");
    }
  };

  const importBatch = async () => {
    const text = prompt("粘贴题目 JSON 数组（每项含 title/questionType/eightDimTags 等字段）：");
    if (!text) return;
    try {
      const items = JSON.parse(text);
      const data = await api<{ successCount: number; errorCount: number }>("/api/exam/admin/questions/batch-import", {
        method: "POST",
        body: { items },
      });
      alert(`导入成功 ${data.successCount} 条，失败 ${data.errorCount} 条`);
      fetchList();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "导入失败");
    }
  };

  if (user?.role !== "platform_admin" && user?.role !== "club_operator" && user?.role !== "club_governor") {
    return (
      <div className="space-y-6">
        <SectionTitle sub="官方题库管理">登舰智考 · 题库</SectionTitle>
        <Panel className="p-8 text-center text-slate-400">仅平台管理员可访问题库管理</Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle sub="官方题库管理 · 导入调研问卷产出的测评题目">登舰智考 · 题库</SectionTitle>

      {err && <Panel className="border-rose-400/40 p-4 text-sm text-rose-300">{err}</Panel>}

      <Panel className="p-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <GlowButton onClick={openAdd}><Plus className="h-4 w-4" />新增题目</GlowButton>
          <GlowButton variant="ghost" onClick={importBatch}><Upload className="h-4 w-4" />批量导入</GlowButton>
          <div className="flex flex-1 items-center gap-2">
            <input
              className="w-40 rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200"
              placeholder="八维标签筛选"
              value={search.eightDimTags}
              onChange={(e) => setSearch({ ...search, eightDimTags: e.target.value })}
            />
            <input
              className="w-40 rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200"
              placeholder="行业筛选"
              value={search.industry}
              onChange={(e) => setSearch({ ...search, industry: e.target.value })}
            />
            <GlowButton variant="ghost" onClick={fetchList}><Search className="h-4 w-4" />查询</GlowButton>
          </div>
          <span className="text-sm text-slate-400">共 {total} 题</span>
        </div>

        {loading ? (
          <div className="grid place-items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-cyan-300" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cyan-400/20 text-left text-slate-400">
                  <th className="p-2">题干</th>
                  <th className="p-2">题型</th>
                  <th className="p-2">八维标签</th>
                  <th className="p-2">行业</th>
                  <th className="p-2">权重</th>
                  <th className="p-2">状态</th>
                  <th className="p-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((q) => (
                  <tr key={q.questionId} className="border-b border-slate-800/60 hover:bg-cyan-400/5">
                    <td className="max-w-xs truncate p-2 text-slate-200">{q.title}</td>
                    <td className="p-2 text-slate-300">{q.questionType === "single" ? "单选" : q.questionType === "multiple" ? "多选" : "简答"}</td>
                    <td className="p-2 text-cyan-300">{q.eightDimTags || "-"}</td>
                    <td className="p-2 text-slate-300">{q.industry || "-"}</td>
                    <td className="p-2 text-slate-300">{q.weightScore}</td>
                    <td className="p-2">
                      <span className={q.status === 1 ? "text-emerald-300" : "text-rose-300"}>{q.status === 1 ? "上线" : "下线"}</span>
                    </td>
                    <td className="p-2">
                      <button onClick={() => openEdit(q)} className="mr-2 text-cyan-300 hover:text-cyan-100"><Edit3 className="h-4 w-4" /></button>
                      <button onClick={() => del(q.questionId)} className="text-rose-300 hover:text-rose-100"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <div className="py-8 text-center text-slate-500">题库为空，请新增或批量导入</div>}
          </div>
        )}
      </Panel>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60" onClick={() => setDialogOpen(false)}>
          <Panel className="max-h-[85vh] w-[90vw] max-w-2xl overflow-y-auto p-6" >
            <div onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-4 text-lg font-bold text-cyan-100">{form.questionId ? "编辑题目" : "新增题目"}</h3>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm text-slate-400">题干</span>
                  <textarea className="mt-1 w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200" rows={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-sm text-slate-400">题型</span>
                    <select className="mt-1 w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200" value={form.questionType} onChange={(e) => setForm({ ...form, questionType: e.target.value })}>
                      <option value="single">单选</option>
                      <option value="multiple">多选</option>
                      <option value="essay">简答</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm text-slate-400">行业</span>
                    <input className="mt-1 w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                  </label>
                </div>
                {form.questionType !== "essay" && (
                  <label className="block">
                    <span className="text-sm text-slate-400">选项 JSON（如 {`{"A":"选项A","B":"选项B"}`}）</span>
                    <textarea className="mt-1 w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200" rows={2} value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} />
                  </label>
                )}
                <label className="block">
                  <span className="text-sm text-slate-400">评判规则/参考答案{form.questionType !== "essay" ? "（如 {correct:[A]}）" : ""}</span>
                  <textarea className="mt-1 w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200" rows={2} value={form.judgeRule} onChange={(e) => setForm({ ...form, judgeRule: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-400">八维标签（逗号分隔：curiosity,imagination,abstract,systematic,executing,communication,ambiguity,empathy）</span>
                  <input className="mt-1 w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200" value={form.eightDimTags} onChange={(e) => setForm({ ...form, eightDimTags: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-400">21 席标签（逗号分隔席位 id）</span>
                  <input className="mt-1 w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200" value={form.career21Tags} onChange={(e) => setForm({ ...form, career21Tags: e.target.value })} />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-sm text-slate-400">权重分值（0-10）</span>
                    <input type="number" min={0} max={10} className="mt-1 w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200" value={form.weightScore} onChange={(e) => setForm({ ...form, weightScore: Number(e.target.value) })} />
                  </label>
                  <label className="block">
                    <span className="text-sm text-slate-400">状态</span>
                    <select className="mt-1 w-full rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200" value={form.status} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}>
                      <option value={1}>上线</option>
                      <option value={0}>下线</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <GlowButton variant="ghost" onClick={() => setDialogOpen(false)}>取消</GlowButton>
                <GlowButton onClick={save}>保存</GlowButton>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}