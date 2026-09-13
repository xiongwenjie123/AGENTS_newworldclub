"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api-client";
import { ROLE_LABEL } from "@/lib/constants";
import { Rocket, LayoutDashboard, Compass, Users, Radar, Ship, Settings, LogOut, Menu, X, GraduationCap, ClipboardList } from "lucide-react";

const NAV = [
  { href: "/", label: "母港", icon: Rocket },
  { href: "/pool", label: "候选池", icon: Users },
  { href: "/mission", label: "Mission", icon: Compass },
  { href: "/fleet", label: "AI组舰", icon: Radar },
  { href: "/bridge", label: "舰桥", icon: Ship },
  { href: "/exam", label: "智考管理", icon: ClipboardList },
  { href: "/exam/take", label: "登舰考试", icon: GraduationCap },
  { href: "/admin", label: "治理后台", icon: Settings, admin: true },
  { href: "/admin/exam", label: "题库管理", icon: ClipboardList, admin: true },
];

const MOBILE_TAB = [
  { href: "/", label: "母港", icon: Rocket },
  { href: "/pool", label: "候选池", icon: Users },
  { href: "/mission", label: "任务", icon: Compass },
  { href: "/bridge", label: "舰桥", icon: Ship },
  { href: "/dashboard", label: "我的", icon: LayoutDashboard },
];

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  const adminRoles = ["platform_admin", "club_operator", "club_governor", "governor"];
  const isAdmin = user && adminRoles.includes(user.role);
  const visibleNav = NAV.filter((n) => !n.admin || isAdmin);

  const doLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen">
      <div className="nebula-bg" />
      <div className="star-field" />

      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 border-b border-[rgba(56,205,255,0.18)] bg-[rgba(4,8,26,0.72)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="relative grid h-9 w-9 place-items-center">
              <Ship className="h-6 w-6 text-cyan-300" style={{ filter: "drop-shadow(0 0 6px rgba(111,230,255,0.7))" }} />
            </span>
            <div className="leading-tight">
              <div className="text-[15px] font-black tracking-wide text-glow title-gradient">新大陆俱乐部</div>
              <div className="text-[10px] tracking-[0.28em] text-cyan-400/70">NEW WORLD CLUB</div>
            </div>
          </Link>

          {/* PC 导航 */}
          <nav className="hidden items-center gap-1 md:flex">
            {visibleNav.map((n) => {
              const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`rounded-md px-3.5 py-2 text-sm font-medium transition ${
                    active ? "bg-cyan-400/15 text-cyan-200 shadow-[0_0_14px_rgba(57,205,251,0.25)]" : "text-slate-300 hover:bg-cyan-400/10 hover:text-cyan-100"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {loading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-cyan-400/15" />
            ) : user ? (
              <div className="hidden items-center gap-2.5 sm:flex">
                <Link href="/dashboard" className="flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/8 px-3 py-1.5">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-[11px] font-bold text-slate-900">
                    {user.nickname.slice(0, 1)}
                  </span>
                  <span className="text-xs font-medium text-cyan-100">{user.nickname}</span>
                  <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-200">{ROLE_LABEL[user.role] ?? user.role}</span>
                </Link>
                <button onClick={doLogout} className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:text-cyan-200" title="退出">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden rounded-md border border-cyan-400/40 bg-cyan-400/10 px-4 py-1.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20 sm:block"
              >
                登舰
              </Link>
            )}
            {/* 移动端菜单按钮 */}
            <button className="grid h-9 w-9 place-items-center rounded-md border border-cyan-400/25 text-cyan-200 md:hidden" onClick={() => setMenuOpen((v) => !v)}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* 移动端下拉菜单 */}
        {menuOpen && (
          <nav className="border-t border-cyan-400/15 bg-[rgba(6,12,30,0.96)] px-4 py-3 md:hidden">
            {visibleNav.map((n) => (
              <Link key={n.href} href={n.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-cyan-400/10">
                <n.icon className="h-4 w-4 text-cyan-300" />
                {n.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-cyan-400/10 pt-2">
              {user ? (
                <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-rose-300 hover:bg-rose-400/10">
                  <LogOut className="h-4 w-4" /> 退出登录
                </button>
              ) : (
                <Link href="/login" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-cyan-200">
                  <Rocket className="h-4 w-4" /> 登舰 / 注册
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* 主内容 */}
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 md:pb-12">{children}</main>

      {/* 移动端底部 Tab */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-cyan-400/20 bg-[rgba(4,8,26,0.9)] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_TAB.map((t) => {
            const active = pathname === t.href || (t.href !== "/" && pathname.startsWith(t.href));
            return (
              <Link key={t.href} href={t.href} className={`flex flex-col items-center gap-1 py-2.5 text-[10px] ${active ? "text-cyan-300" : "text-slate-400"}`}>
                <t.icon className="h-5 w-5" />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ShellInner>{children}</ShellInner>
    </AuthProvider>
  );
}
