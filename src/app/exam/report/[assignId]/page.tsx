"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { Panel, SectionTitle, ScoreRing } from "@/components/ui-kit";
import { EchartsRadar } from "@/components/echarts-radar";
import { DIMENSIONS } from "@/lib/constants";
import { Loader2, AlertTriangle, Target } from "lucide-react";

interface Report {
  reportId: string;
  eightDimScore: Record<string, number>;
  career21Result: { careerName: string; careerLabel: string; similarity: number }[];
  riskTip: string;
  finalSuggest: string;
  createdAt: string;
}

function ReportInner() {
  const params = useParams<{ assignId: string }>();
  const assignId = params.assignId;
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ report: Report }>(`api/exam/report/${assignId}`);
      setReport(data.report);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [assignId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading) {
    return <Panel className="grid place-items-center p-12"><Loader2 className="h-8 w-8 animate-spin text-cyan-300" /></Panel>;
  }

  if (err) {
    return <Panel className="border-rose-400/40 p-4 text-sm text-rose-300">{err}</Panel>;
  }

  if (!report) return null;

  const dimEntries = DIMENSIONS.map((d) => ({ ...d, score: report.eightDimScore[d.id] ?? 0 }));

  return (
    <div className="space-y-6">
      <SectionTitle sub="八维能力雷达 · 21 席匹配 · 录用建议">测评报告</SectionTitle>

      <Panel glow className="p-6">
        <div className="flex items-start gap-3">
          <Target className="mt-1 h-6 w-6 shrink-0 text-cyan-300" />
          <div>
            <h3 className="text-lg font-bold text-cyan-100">一句话录用建议</h3>
            <p className="mt-2 text-slate-200">{report.finalSuggest}</p>
          </div>
        </div>
      </Panel>

      <Panel className="p-6">
        <h3 className="mb-4 text-lg font-bold text-cyan-100">八维能力雷达图</h3>
        <EchartsRadar
          data={dimEntries.map((d) => ({ name: d.name, value: d.score }))}
          max={100}
          height={360}
        />
      </Panel>

      <Panel className="p-6">
        <h3 className="mb-4 text-lg font-bold text-cyan-100">八维能力得分</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dimEntries.map((d) => (
            <div key={d.id} className="flex flex-col items-center rounded border border-cyan-400/10 bg-slate-900/40 p-3">
              <ScoreRing score={d.score} size={64} label={String(d.score)} />
              <span className="mt-2 text-sm font-medium text-slate-200">{d.name}</span>
              <span className="text-xs text-slate-500">{d.desc}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="p-6">
        <h3 className="mb-4 text-lg font-bold text-cyan-100">21 席职业匹配 TOP3</h3>
        <div className="space-y-3">
          {report.career21Result.map((c, i) => (
            <div key={c.careerName} className="flex items-center gap-4">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? "bg-amber-400/30 text-amber-200" : i === 1 ? "bg-slate-400/30 text-slate-200" : "bg-orange-700/30 text-orange-300"}`}>{i + 1}</span>
              <span className="flex-1 text-slate-100">{c.careerLabel}</span>
              <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: `${c.similarity * 100}%` }} />
              </div>
              <span className="w-12 text-right text-sm text-cyan-300">{(c.similarity * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </Panel>

      {report.riskTip && (
        <Panel className="p-6">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-cyan-100"><AlertTriangle className="h-5 w-5 text-amber-300" />风险与特征提示</h3>
          <div className="space-y-2">
            {report.riskTip.split("；").filter(Boolean).map((tip, i) => (
              <p key={i} className={`text-sm ${tip.includes("优势") ? "text-emerald-300" : "text-amber-300"}`}>{tip}</p>
            ))}
          </div>
        </Panel>
      )}

      <Panel className="p-4 text-center text-xs text-slate-500">
        报告生成于 {new Date(report.createdAt).toLocaleString()} · 报告 ID：{report.reportId}
      </Panel>
    </div>
  );
}

export default function ExamReportPage() {
  return <ReportInner />;
}