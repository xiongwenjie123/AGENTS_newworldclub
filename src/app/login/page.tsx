"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import { GlowButton, Panel } from "@/components/ui-kit";
import { Ship, LogIn, UserPlus } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr("");
    if (!email || !password) return setErr("请输入邮箱与密码");
    setLoading(true);
    try {
      if (mode === "register") {
        const data = await api<{ user: { userId: string; nickname: string; civilizationNo: string; role: string } }>(
          "/api/auth/register",
          { method: "POST", body: { email, password, nickname: nickname || email.split("@")[0] } }
        );
        setUser({
          userId: data.user.userId,
          nickname: data.user.nickname,
          avatarUrl: null,
          civilizationNo: data.user.civilizationNo,
          role: data.user.role,
          inCandidatePool: false,
          isDemo: false,
          email,
        });
        router.push("/onboarding");
      } else {
        const data = await api<{ user: import("@/components/auth-provider").SessionUser }>("/api/auth/login", {
          method: "POST",
          body: { email, password },
        });
        setUser(data.user);
        router.push("/dashboard");
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (em: string) => {
    setEmail(em);
    setPassword("demo123456");
    setErr("");
    setLoading(true);
    try {
      const data = await api<{ user: import("@/components/auth-provider").SessionUser }>("/api/auth/login", {
        method: "POST",
        body: { email: em, password: "demo123456" },
      });
      setUser(data.user);
      router.push(em.includes("admin") ? "/admin" : "/dashboard");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "登录失败");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-8 sm:py-14">
      <Panel glow className="p-7 sm:p-9">
        <div className="mb-7 text-center">
          <Ship className="mx-auto mb-3 h-10 w-10 text-cyan-300" style={{ filter: "drop-shadow(0 0 10px rgba(111,230,255,0.6))" }} />
          <h1 className="text-2xl font-black title-gradient">{mode === "login" ? "登舰" : "申请登舰"}</h1>
          <p className="mt-1 text-xs text-slate-400">New World Club · 星舰船坞通行认证</p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-1">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md py-2 text-sm font-semibold transition ${mode === m ? "bg-cyan-400/20 text-cyan-100 shadow-[0_0_12px_rgba(57,205,251,0.3)]" : "text-slate-400"}`}
            >
              {m === "login" ? "登录" : "注册"}
            </button>
          ))}
        </div>

        <div className="space-y-3.5">
          {mode === "register" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">舰员代号</label>
              <input className="nw-input w-full rounded-md px-3.5 py-2.5 text-sm" placeholder="如何称呼你？" value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">邮箱</label>
            <input className="nw-input w-full rounded-md px-3.5 py-2.5 text-sm" placeholder="you@newworld.club" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">密码</label>
            <input type="password" className="nw-input w-full rounded-md px-3.5 py-2.5 text-sm" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
          </div>
          {err && <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{err}</div>}
          <GlowButton type="submit" className="w-full" onClick={submit} disabled={loading}>
            {mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {loading ? "认证中…" : mode === "login" ? "登舰" : "注册并登舰"}
          </GlowButton>
        </div>

        <div className="mt-6 border-t border-cyan-400/15 pt-4">
          <p className="mb-2 text-center text-[11px] text-slate-500">一键体验演示账号</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => quickLogin("demo1@newworld.club")} className="rounded-md border border-cyan-400/25 bg-cyan-400/8 py-2 text-xs text-cyan-200 hover:bg-cyan-400/18">
              舰员视角
            </button>
            <button onClick={() => quickLogin("admin@newworld.club")} className="rounded-md border border-violet-400/25 bg-violet-400/8 py-2 text-xs text-violet-200 hover:bg-violet-400/18">
              治理者视角
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
