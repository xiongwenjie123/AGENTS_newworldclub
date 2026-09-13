"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Panel, SectionTitle, GlowButton } from "@/components/ui-kit";
import { Loader2, Send, Search, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

interface Paper {
  paperId: string;
  paperName: string;
  questionIds: string[];
  timeLimit: number | null;
  status: number;
  createdAt: string;
}

interface PoolUser {
  userId: string;
  nickname: string;
  civilizationNo: string;
  email: string | null;
  role: string;
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

export default function ExamDistributePage() {
  const router = useRouter();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [poolUsers, setPoolUsers] = useState<PoolUser[]>([]);
  const [assigns, setAssigns] = useState<AssignRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [selectedPaperId, setSelectedPaperId] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchKeyword, setSearchKeyword] = useState("");

  const fetchPapers = useCallback(async () => {
    try {
      const data = await api<{ records: Paper[] }>("/api/exam/paper/list", { query: { size: 100 } });
      setPapers(data.records);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加载考卷失败");
    }
  }, []);

  const fetchPoolUsers = useCallback(async () => {
    try {
      const data = await api<{ records: PoolUser[] }>("/api/exam/pool/users");
      setPoolUsers(data.records);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加载候选池失败");
    }
  }, []);

  const fetchAssigns = useCallback(async () => {
    try {
      const data = await api<{ records: AssignRecord[] }>("/api/exam/assign/list", { query: { size: 100 } });
      setAssigns(data.records);
    } catch {
      // 忽略
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPapers(), fetchPoolUsers(), fetchAssigns()]).finally(() => setLoading(false));
  }, [fetchPapers, fetchPoolUsers, fetchAssigns]);

  const toggleUser = (uid: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const batchDistribute = async () => {
    if (!selectedPaperId || selectedUsers.size === 0) return;
    setErr("");
    let successCount = 0;
    let failCount = 0;
    for (const uid of selectedUsers) {
      try {
        await api("/api/exam/assign", { method: "POST", body: { paperId: selectedPaperId, userUid: uid } });
        successCount++;
      } catch {
        failCount++;
      }
    }
    setSelectedUsers(new Set());
    fetchAssigns();
    alert(`分发完成：成功 ${successCount} 人${failCount > 0 ? `，失败 ${failCount} 人` : ""}`);
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

  const filteredUsers = poolUsers.filter((u) => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      u.nickname.toLowerCase().includes(kw) ||
      u.civilizationNo.toLowerCase().includes(kw) ||
      (u.email ?? "").toLowerCase().includes(kw)
    );
  });

  const statusLabel = (s: number) => (s === 0 ? "未作答" : s === 1 ? "已提交" : "报告完成");
  const selectedPaper = papers.find((p) => p.paperId === selectedPaperId);

  return (
    <div className="space-y-6">
      <SectionTitle sub="选择考卷 → 从候选池勾选候选人 → 批量分发 → 追踪作答状态">登舰智考 · 分发管理</SectionTitle>

      {err && <Panel className="border-rose-400/40 p-4 text-sm text-rose-300">{err}</Panel>}

      {loading ? (
        <div className="grid place-items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-cyan-300" /></div>
      ) : (
        <>
          <Panel className="p-4">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-cyan-100"><FileText className="h-5 w-5" />选择考卷</h3>
            {papers.length === 0 ? (
              <div className="py-6 text-center text-slate-500">
                暂无考卷，<button onClick={() => router.push("/exam/create")} className="text-cyan-300 hover:text-cyan-100">去生成</button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {papers.map((p) => (
                  <button
                    key={p.paperId}
                    onClick={() => setSelectedPaperId(p.paperId)}
                    className={`rounded border p-3 text-left transition ${
                      selectedPaperId === p.paperId
                        ? "border-cyan-400/60 bg-cyan-400/10"
                        : "border-cyan-400/15 bg-slate-900/40 hover:border-cyan-400/30"
                    }`}
                  >
                    <div className="font-semibold text-slate-200">{p.paperName}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {p.questionIds?.length ?? 0} 题 · {p.timeLimit ? `${p.timeLimit}分钟` : "不限时"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Panel>

          {selectedPaper && (
            <Panel className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-bold text-cyan-100"><Search className="h-5 w-5" />选择候选人</h3>
                <div className="flex items-center gap-3">
                  <input
                    className="w-48 rounded border border-cyan-400/20 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500"
                    placeholder="搜索姓名/编号/邮箱"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                  <span className="text-sm text-cyan-200">已选 {selectedUsers.size} 人</span>
                  <GlowButton onClick={batchDistribute} disabled={selectedUsers.size === 0}>
                    <Send className="h-4 w-4" />批量分发
                  </GlowButton>
                </div>
              </div>
              {filteredUsers.length === 0 ? (
                <div className="py-6 text-center text-slate-500">候选池为空或无匹配用户</div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredUsers.map((u) => {
                    const alreadyAssigned = assigns.some(
                      (a) => a.paperId === selectedPaperId && a.userUid === u.userId
                    );
                    return (
                      <label
                        key={u.userId}
                        className={`flex cursor-pointer items-center gap-3 rounded border p-2.5 transition ${
                          alreadyAssigned
                            ? "border-slate-700/40 bg-slate-900/20 opacity-50"
                            : selectedUsers.has(u.userId)
                              ? "border-cyan-400/60 bg-cyan-400/10"
                              : "border-cyan-400/15 bg-slate-900/40 hover:border-cyan-400/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(u.userId)}
                          disabled={alreadyAssigned}
                          onChange={() => toggleUser(u.userId)}
                          className="h-4 w-4 accent-cyan-400"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-200">{u.nickname}</div>
                          <div className="truncate text-xs text-slate-400">{u.civilizationNo}</div>
                        </div>
                        {alreadyAssigned && <span className="text-xs text-amber-400">已分发</span>}
                      </label>
                    );
                  })}
                </div>
              )}
            </Panel>
          )}

          <Panel className="p-4">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-cyan-100"><Send className="h-5 w-5" />分发记录</h3>
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
                          <span className={a.status === 2 ? "text-emerald-300" : a.status === 1 ? "text-amber-300" : "text-slate-300"}>
                            {statusLabel(a.status)}
                          </span>
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
        </>
      )}
    </div>
  );
}