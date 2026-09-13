"use client";

import { DIMENSIONS } from "@/lib/constants";

interface RadarChartProps {
  scores: Record<string, number>;
  size?: number;
  label?: boolean;
}

/** 8 维能力雷达图（SVG 全息风） */
export function RadarChart({ scores, size = 280, label = true }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - (label ? 46 : 18);
  const n = DIMENSIONS.length;

  const point = (idx: number, ratio: number) => {
    const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
    return [cx + Math.cos(angle) * radius * ratio, cy + Math.sin(angle) * radius * ratio] as const;
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const dataPoints = DIMENSIONS.map((d, i) => {
    const v = Math.max(0, Math.min(100, scores?.[d.id] ?? 0)) / 100;
    return point(i, v);
  });
  const polygon = dataPoints.map((p) => p.join(",")).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6fe6ff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#2f7bff" stopOpacity="0.15" />
        </radialGradient>
      </defs>

      {/* 网格环 */}
      {rings.map((r) => (
        <polygon
          key={r}
          points={DIMENSIONS.map((_, i) => point(i, r).join(",")).join(" ")}
          fill="none"
          stroke="rgba(57,205,251,0.18)"
          strokeWidth={1}
        />
      ))}
      {/* 轴线 */}
      {DIMENSIONS.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(57,205,251,0.15)" strokeWidth={1} />;
      })}

      {/* 数据多边形 */}
      <polygon points={polygon} fill="url(#radarFill)" stroke="#6fe6ff" strokeWidth={2} style={{ filter: "drop-shadow(0 0 6px rgba(111,230,255,0.6))" }} />
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill="#bff3ff" />
      ))}

      {/* 标签 */}
      {label &&
        DIMENSIONS.map((d, i) => {
          const [x, y] = point(i, 1.18);
          return (
            <text
              key={d.id}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#9fd6ff"
              fontSize={12}
              fontWeight={600}
            >
              {d.name}
            </text>
          );
        })}
    </svg>
  );
}
