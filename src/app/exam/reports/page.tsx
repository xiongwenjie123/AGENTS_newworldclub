"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Panel, SectionTitle, ScoreRing } from "@/components/ui-kit";
import { Loader2, FileBarChart, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface ReportRecord {
  assignId: string;
  paperId: string;
  userUid: string;
  status: number;
  submitTime: string | null;
  reportId: string | null;
  candidateNickname: string;
  candidateCivNo: string;
  report: {
    reportId: string;
    eightDimScore: Record<string, number>;
    finalSuggest: string;
    createdAt: string;
  } | null;
}

export default function ExamReportsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ records: ReportRecord[] }>("/api/exam/report/list", { query: { size: 100 } });
      setRecords(data.records);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const avgScore = (scores: Record<string, number> | null | undefined) => {
    if (!scores) return 0;
    const vals = Object.values(scores);
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  return (
    <div className="space-y-6">
      <SectionTitle sub="查看所有候选人的测评报告 · 八维评分总览">登舰智考 · 测评报告中心</SectionTitle>

      {err && <Panel className="border-rose-400/40 p-4 text-sm text-rose-300">{err}</Panel>}

      {loading ? (
        <div className="grid place-items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-cyan-300" /></div>
      ) : records.length === 0 ? (
        <Panel className="p-8 text-center text-slate-500">暂无报告记录</Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((r) => {
            const avg = avgScore(r.report?.eightDimScore);
            return (
              <Panel key={r.assignId} className="p-4" glow={r.status === 2}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileBarChart className="h-4 w-4 text-cyan-300" />
                      <span className="truncate font-semibold text-slate-200">{r.candidateNickname}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{r.candidateCivNo}</div>
                    {r.submitTime && (
                      <div className="mt-1 text-xs text-slate-500">
                        提交于 {new Date(r.submitTime).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  {r.report && <ScoreRing score={avg} size={48} />}
                </div>

                {r.report?.eightDimScore && (
                  <div className="mt-3 grid grid-cols-4 gap-1.5">
                    {Object.entries(r.report.eightDimScore).slice(0, 8).map(([dim, score]) => (
                      <div key={dim} className="rounded bg-slate-900/50 px-1.5 py-1 text-center">
                        <div className="text-[10px] text-slate-400">{dim.slice(0, 4)}</div>
                        <div className="text-xs font-bold text-cyan-200">{score}</div>
                      </div>
                    ))}
                  </div>
                )}

                {r.report?.finalSuggest && (
                  <div className="mt-3 line-clamp-2 text-xs text-slate-400">{r.report.finalSuggest}</div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-xs ${r.status === 2 ? "text-emerald-300" : r.status === 1 ? "text-amber-300" : "text-slate-300"}`}>
                    {r.status === 2 ? "报告完成" : r.status === 1 ? "已提交" : "未作答"}
                  </span>
                  {r.status === 2 && r.reportId && (
                    <button
                      onClick={() => router.push(`/exam/report/${r.assignId}`)}
                      className="flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-100"
                    >
                      查看详情 <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}