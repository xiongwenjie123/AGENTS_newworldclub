"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Panel, SectionTitle, GlowButton } from "@/components/ui-kit";
import { Loader2, FileText, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

interface ExamItem {
  assignId: string;
  paperId: string;
  status: number;
  assignTime: string;
  submitTime: string | null;
  paperName: string;
  timeLimit: number | null;
}

export default function ExamTakeListPage() {
  const router = useRouter();
  const [list, setList] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ records: ExamItem[] }>("/api/exam/user/list");
      setList(data.records);
    } catch {
      // 忽略
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const statusLabel = (s: number) => s === 0 ? "待作答" : s === 1 ? "已提交" : "报告已生成";

  return (
    <div className="space-y-6">
      <SectionTitle sub="HR 分发的考卷将显示在此处">登舰考试</SectionTitle>

      {loading ? (
        <Panel className="grid place-items-center p-12"><Loader2 className="h-8 w-8 animate-spin text-cyan-300" /></Panel>
      ) : list.length === 0 ? (
        <Panel className="p-8 text-center text-slate-400">暂无分配给你的考卷</Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((item) => (
            <Panel key={item.assignId} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-lg font-bold text-slate-100"><FileText className="h-5 w-5 text-cyan-300" />{item.paperName}</div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                    <span><Clock className="mr-1 inline h-3 w-3" />{item.timeLimit ? `${item.timeLimit}分钟限时` : "不限时"}</span>
                    <span>分发于 {new Date(item.assignTime).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`rounded px-2 py-1 text-xs ${item.status === 0 ? "bg-amber-400/20 text-amber-200" : "bg-emerald-400/20 text-emerald-200"}`}>{statusLabel(item.status)}</span>
              </div>
              {item.status === 0 && (
                <div className="mt-3">
                  <GlowButton onClick={() => router.push(`/exam/take/${item.assignId}`)}>开始答题</GlowButton>
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}