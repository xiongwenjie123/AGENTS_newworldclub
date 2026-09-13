"use client";

import { CABIN_COLOR, CABIN_LABEL } from "@/lib/constants";

/** 舱段标签徽章 */
export function CabinBadge({ cabin }: { cabin: string }) {
  const color = CABIN_COLOR[cabin] ?? "#6fe6ff";
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ borderColor: `${color}55`, color, background: `${color}14` }}
    >
      {CABIN_LABEL[cabin] ?? cabin}
    </span>
  );
}

/** 全息面板 */
export function Panel({
  children,
  className = "",
  glow = false,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return <div className={`holo-panel ${glow ? "holo-glow" : ""} ${className}`}>{children}</div>;
}

/** 区块标题（居中，两侧装饰线） */
export function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-8 text-center">
      <div className="mb-2 flex items-center justify-center gap-3">
        <span className="h-px w-10 bg-gradient-to-r from-transparent to-cyan-400/60 sm:w-16" />
        <h2 className="text-2xl font-black tracking-wide title-gradient sm:text-3xl">{children}</h2>
        <span className="h-px w-10 bg-gradient-to-l from-transparent to-cyan-400/60 sm:w-16" />
      </div>
      {sub && <p className="text-sm text-slate-400">{sub}</p>}
    </div>
  );
}

/** 主行动按钮 */
export function GlowButton({
  children,
  onClick,
  href,
  variant = "primary",
  className = "",
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "ghost";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const cls =
    variant === "primary"
      ? "clip-notch bg-gradient-to-r from-cyan-400 to-blue-500 font-bold text-slate-950 shadow-[0_0_22px_rgba(57,205,251,0.45)] hover:shadow-[0_0_32px_rgba(57,205,251,0.7)] hover:brightness-110"
      : "clip-notch border border-cyan-400/40 bg-cyan-400/8 font-semibold text-cyan-200 hover:bg-cyan-400/18";
  const inner = (
    <span className={`inline-flex items-center justify-center gap-2 px-6 py-3 text-sm transition disabled:opacity-50 ${cls} ${className}`}>
      {children}
    </span>
  );
  if (href) {
    return (
      <a href={href} className="inline-block">
        {inner}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="disabled:cursor-not-allowed">
      {inner}
    </button>
  );
}

/** 分数环 */
export function ScoreRing({ score, size = 56, label }: { score: number; size?: number; label?: string }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const ratio = Math.max(0, Math.min(100, score)) / 100;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(57,205,251,0.15)" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#6fe6ff"
          strokeWidth={4}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 4px rgba(111,230,255,0.7))" }}
        />
      </svg>
      <span className="absolute text-sm font-bold text-cyan-100">{label ?? score}</span>
    </div>
  );
}
