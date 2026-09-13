"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import { Panel, SectionTitle } from "@/components/ui-kit";
import { Users, Rocket, Compass, Cpu, Star, Activity, FileText, CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { CABIN_LABEL } from "@/lib/constants";

interface AdminStats {
  userCount: number;
  testCount: number;
  passedCount: number;
  passportCount: number;
  missionCount: number;
  fleetCount: number;
  agentAssignCount: number;
  agentCallCount: number;
  confirmedAgentCount: number;
  rejectedAgentCount: number;
  promptCount: number;
  cabinDistribution: { cabin: string; n: number }[];
}

interface RecentMission {
  missionId: string;
  missionName: string;
  status: string;
  createdAt: string;
}

const ROLE_LABEL: Record<string, string> = {
  platform_admin: "平台管理员",
  club_operator: "俱乐部运营",
  club_governor: "俱乐部治理者",
  fleet_commander: "舰长",
  member: "普通舰员",
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [missions, setMissions] = useState<RecentMission[]>([]);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { setDenied(true); return; }
    api<{ stats: AdminStats; recentMissions: RecentMission[] }>("/api/admin/stats")
      .then((d) => { setStats(d.stats); setMissions(d.recentMissions ?? []); })
      .catch(() => setDenied(true));
  }, [user, loading]);

  if (loading) return <div className="grid h-96 place-items-center text-slate-400">加载中…</div>;
  if (denied) {
    return (
      <Panel className="p-16 text-center">
        <ShieldIcon />
        <h2 className="mt-4 text-lg font-bold text-slate-200">需要运营管理权限</h2>
        <p className="mt-2 text-sm text-slate-400">当前账号无管理员权限。可使用演示账号 <code className="rounded bg-cyan-400/10 px-1.5 py-0.5 text-cyan-300">admin@newworld.club / demo123456</code> 登录体验多角色管理后台。</p>
      </Panel>
    );
  }

  const cards = [
    { label: "注册用户", value: stats?.userCount ?? 0, icon: Users, color: "cyan" },
    { label: "航行档案", value: stats?.passportCount ?? 0, icon: Star, color: "amber" },
    { label: "登舰测试", value: stats?.testCount ?? 0, icon: Compass, color: "violet" },
    { label: "Mission 数", value: stats?.missionCount ?? 0, icon: Rocket, color: "cyan" },
    { label: "舰队数", value: stats?.fleetCount ?? 0, icon: Activity, color: "emerald" },
    { label: "Agent 调用", value: stats?.agentCallCount ?? 0, icon: Cpu, color: "violet" },
  ] as const;

  const colorMap: Record<string, string> = {
    cyan: "text-cyan-300 bg-cyan-400/10",
    amber: "text-amber-300 bg-amber-400/10",
    violet: "text-violet-300 bg-violet-400/10",
    emerald: "text-emerald-300 bg-emerald-400/10",
  };

  const maxCabin = Math.max(1, ...(stats?.cabinDistribution.map((c) => c.n) ?? [1]));

  return (
    <div className="space-y-6">
      <SectionTitle sub="平台管理员 / 俱乐部运营 / 俱乐部治理者 多角色运营看板">运营管理后台</SectionTitle>

      <div className="flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-xs text-slate-300">
        <span className="rounded bg-cyan-400/20 px-2 py-0.5 font-semibold text-cyan-200">{ROLE_LABEL[user?.role ?? "member"] ?? user?.role}</span>
        <span>当前登录：{user?.nickname}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Panel key={c.label} className="flex items-center gap-4 p-5">
            <span className={`grid h-12 w-12 place-items-center rounded-xl ${colorMap[c.color]}`}>
              <c.icon className="h-6 w-6" />
            </span>
            <div>
              <div className="text-2xl font-black text-cyan-50">{c.value}</div>
              <div className="text-xs text-slate-400">{c.label}</div>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-6">
          <h3 className="mb-4 text-base font-bold text-slate-200">三舱席位分布</h3>
          <div className="space-y-3">
            {stats?.cabinDistribution.map((c) => (
              <div key={c.cabin}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-300">{CABIN_LABEL[c.cabin] ?? c.cabin}</span>
                  <span className="font-mono text-cyan-300">{c.n}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-700/40">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${(c.n / maxCabin) * 100}%` }} />
                </div>
              </div>
            ))}
            {(!stats || stats.cabinDistribution.length === 0) && <p className="text-xs text-slate-500">暂无数据</p>}
          </div>
        </Panel>

        <Panel className="p-6">
          <h3 className="mb-4 text-base font-bold text-slate-200">Agent 协作统计</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-cyan-400/15 bg-cyan-400/5 p-4 text-center">
              <Cpu className="mx-auto mb-2 h-5 w-5 text-violet-300" />
              <div className="text-xl font-bold text-cyan-100">{stats?.agentAssignCount ?? 0}</div>
              <div className="text-xs text-slate-400">Agent 补位席位</div>
            </div>
            <div className="rounded-lg border border-cyan-400/15 bg-cyan-400/5 p-4 text-center">
              <FileText className="mx-auto mb-2 h-5 w-5 text-cyan-300" />
              <div className="text-xl font-bold text-cyan-100">{stats?.agentCallCount ?? 0}</div>
              <div className="text-xs text-slate-400">Agent 调用次数</div>
            </div>
            <div className="rounded-lg border border-emerald-400/15 bg-emerald-400/5 p-4 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-emerald-300" />
              <div className="text-xl font-bold text-emerald-100">{stats?.confirmedAgentCount ?? 0}</div>
              <div className="text-xs text-slate-400">人工确认</div>
            </div>
            <div className="rounded-lg border border-rose-400/15 bg-rose-400/5 p-4 text-center">
              <XCircle className="mx-auto mb-2 h-5 w-5 text-rose-300" />
              <div className="text-xl font-bold text-rose-100">{stats?.rejectedAgentCount ?? 0}</div>
              <div className="text-xs text-slate-400">人工驳回</div>
            </div>
          </div>
        </Panel>
      </div>

      {missions.length > 0 && (
        <Panel className="p-6">
          <h3 className="mb-4 text-base font-bold text-slate-200">最近 Mission</h3>
          <div className="space-y-2">
            {missions.map((m) => (
              <div key={m.missionId} className="flex items-center justify-between rounded-lg border border-cyan-400/10 bg-slate-900/30 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <Rocket className="h-4 w-4 text-cyan-300" />
                  <span className="text-sm text-slate-200">{m.missionName}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={`rounded px-2 py-0.5 ${m.status === "archived" ? "bg-slate-600/30 text-slate-300" : "bg-cyan-400/15 text-cyan-200"}`}>{m.status}</span>
                  <span className="text-slate-500">{new Date(m.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel className="p-6">
        <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-200"><MessageSquare className="h-4 w-4 text-cyan-300" />系统治理提示</h3>
        <ul className="list-inside list-disc space-y-1.5 text-xs text-slate-400">
          <li>舰载智能（Agent）全部产出均有留痕，必须经人工确认后才进入最终航行档案，不具备自动通过权限。</li>
          <li>候选池仅展示成员主动公开的席位适配摘要，完整画像授权后方可查看。</li>
          <li>治理者可审核航行档案回填、维护 21 席席位标准与 AI Prompt 模板。</li>
          <li>当前系统已入库 {stats?.promptCount ?? 0} 套 Prompt 模板，支持版本管理与热加载。</li>
        </ul>
      </Panel>
    </div>
  );
}

function ShieldIcon() {
  return (
    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-400/10 text-amber-300">
      <Activity className="h-8 w-8" />
    </div>
  );
}
