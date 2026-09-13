"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Panel, SectionTitle, GlowButton } from "@/components/ui-kit";
import { Loader2, Plus, Send, FileText, Users, BarChart3, Edit3, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface Paper {
  paperId: string;
  paperName: string;
  demandJson: unknown;
  questionIds: string[];
  timeLimit: number | null;
  status: number;
  createdAt: string;
}

interface AssignRecord {
  assignId: string;
  paperId: string;
  userUid: string;
  status: number;
  assignTime: string;
  submitTime: string | null;
  reportId: string | null;
  candidateNickname: string;
  candidateCivNo: string;
}

export default function ExamManagePage() {
  const router = useRouter();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [assigns, setAssigns] = useState<AssignRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [distributePaperId, setDistributePaperId] = useState("");
  const [candidateUid, setCandidateUid] = useState("");

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ records: Paper[] }>("/api/exam/paper/list", { query: { size: 50 } });
      setPapers(data.records);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAssigns = useCallback(async () => {
    try {
      const data = await api<{ records: AssignRecord[] }>("/api/exam/assign/list", { query: { size: 50 } });
      setAssigns(data.records);
    } catch {
      // 忽略
    }
  }, []);

  useEffect(() => {
    fetchPapers();
    fetchAssigns();
  }, [fetchPapers, fetchAssigns]);

  const distribute = async () => {
    setErr("");
    try {
      await api("/api/exam/assign", { method: "POST", body: { paperId: distributePaperId, userUid: candidateUid } });
      setDistributePaperId("");
      setCandidateUid("");
      fetchAssigns();
      alert("分发成功");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "分发失败");
    }
  };

  const revoke = async (assignId: string) => {
    if (!confirm("确认撤回此考卷？")) return;
    try {
      await api(`api/exam/assign/${assignId}/revoke`, { method: "POST" });
      fetchAssigns();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "撤回失败");
    }
  };

  const statusLabel = (s: number) => s === 0 ? "未作答" : s === 1 ? "已提交" : "报告完成";

  return (
    <div className="space-y-6">
      <SectionTitle sub="录入招聘需求 → AI 组卷 → 分发候选人 → 查看测评报告">登舰智考 · 考卷管理</SectionTitle>

      {err && <Panel className="border-rose-400/40 p-4 text-sm text-rose-300">{err}</Panel>}

      <div className="grid gap-3 sm:grid-cols-3">
        <button onClick={() => router.push("/exam/distribute")} className="flex items-center justify-between rounded border border-cyan-400/20 bg-slate-900/40 p-4 transition hover:border-cyan-400/40 hover:bg-cyan-400/5">
          <span className="flex items-center gap-2 text-cyan-100"><Send className="h-5 w-5" />分发管理</span>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </button>
        <button onClick={() => router.push("/exam/reports")} className="flex items-center justify-between rounded border border-cyan-400/20 bg-slate-900/40 p-4 transition hover:border-cyan-400/40 hover:bg-cyan-400/5">
          <span className="flex items-center gap-2 text-cyan-100"><BarChart3 className="h-5 w-5" />报告中心</span>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </button>
        <button onClick={() => router.push("/exam/create")} className="flex items-center justify-between rounded border border-cyan-400/20 bg-slate-900/40 p-4 transition hover:border-cyan-400/40 hover:bg-cyan-400/5">
          <span className="flex items-center gap-2 text-cyan-100"><Plus className="h-5 w-5" />生成考卷</span>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      <Panel className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-cyan-100"><FileText className="h-5 w-5" />我的考卷</h3>
          <GlowButton onClick={() => router.push("/exam/create")}><Plus className="h-4 w-4" />生成专属考卷</GlowButton>
        </div>
        {loading ? (
          <div className="grid place-items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-cyan-300" /></div>
        ) : papers.length === 0 ? (
          <div className="py-8 text-center text-slate-500">暂无考卷，点击上方按钮生成</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {papers.map((p) => (
              <div key={p.paperId} className="rounded border border-cyan-400/15 bg-slate-900/40 p-3">
                <div className="font-semibold text-slate-200">{p.paperName}</div>
                <div className="mt-1 text-xs text-slate-400">
                  题目数：{p.questionIds?.length ?? 0} · {p.timeLimit ? `${p.timeLimit}分钟限时` : "不限时"}
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setDistributePaperId(p.paperId)} className="rounded bg-cyan-400/10 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-400/20">
                    <Send className="mr-1 inline h-3 w-3" />分发
                  </button>
                  <button onClick={() => router.push(`/exam/edit/${p.paperId}`)} className="rounded bg-violet-400/10 px-2 py-1 text-xs text-violet-200 hover:bg-violet-400/20">
                    <Edit3 className="mr-1 inline h-3 w-3" />编辑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {distributePaperId && (
        <Panel className="p-4">
          <h3 className="mb-30 flex items-center gap-2 text-lg font-bold text-cyan-100"><Send className="h-5 w-5" />分发考卷</h3>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-sm text-slate-400">应聘者用户 UID</span>
              <input className="mt-1 w-72 rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-200" placeholder="用户 user_id" value={candidateUid} onChange={(e) => setCandidateUid(e.target.value)} />
            </label>
            <GlowButton onClick={distribute}>确认分发</GlowButton>
            <GlowButton variant="ghost" onClick={() => setDistributePaperId("")}>取消</GlowButton>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            提示：如需从候选池批量选择候选人，请使用
            <button onClick={() => router.push("/exam/distribute")} className="ml-1 text-cyan-300 hover:text-cyan-100">分发管理</button>
            页面
          </div>
        </Panel>
      )}

      <Panel className="p-4">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-cyan-100"><Users className="h-5 w-5" />分发记录</h3>
        {assigns.length === 0 ? (
          <div className="py-6 text-center text-slate-500">暂无分发记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cyan-400/20 text-left text-slate-400">
                  <th className="p-2">候选人</th>
                  <th className="p-2">文明编号</th>
                  <th className="p-2">分发时间</th>
                  <th className="p-2">状态</th>
                  <th className="p-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {assigns.map((a) => (
                  <tr key={a.assignId} className="border-b border-slate-800/60 hover:bg-cyan-400/5">
                    <td className="p-2 text-slate-200">{a.candidateNickname}</td>
                    <td className="p-2 text-slate-300">{a.candidateCivNo}</td>
                    <td className="p-2 text-slate-400">{new Date(a.assignTime).toLocaleString()}</td>
                    <td className="p-2">
                      <span className={a.status === 2 ? "text-emerald-300" : a.status === 1 ? "text-amber-300" : "text-slate-300"}>{statusLabel(a.status)}</span>
                    </td>
                    <td className="p-2">
                      {a.status === 2 && a.reportId && (
                        <button onClick={() => router.push(`/exam/report/${a.assignId}`)} className="mr-2 text-cyan-300 hover:text-cyan-100">查看报告</button>
                      )}
                      {a.status === 0 && (
                        <button onClick={() => revoke(a.assignId)} className="text-rose-300 hover:text-rose-100">撤回</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}