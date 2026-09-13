"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface EchartsRadarProps {
  data: { name: string; value: number }[];
  max?: number;
  height?: number;
}

export function EchartsRadar({ data, max = 100, height = 340 }: EchartsRadarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    chartRef.current = echarts.init(ref.current, "dark");
    const handleResize = () => chartRef.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.setOption({
      backgroundColor: "transparent",
      tooltip: { trigger: "item" },
      radar: {
        indicator: data.map((d) => ({ name: d.name, max })),
        shape: "polygon",
        splitNumber: 5,
        axisName: { color: "#7dd3fc", fontSize: 13, fontWeight: 600 },
        splitLine: { lineStyle: { color: "rgba(56,189,248,0.15)" } },
        splitArea: { areaStyle: { color: ["rgba(15,23,42,0.3)", "rgba(15,23,42,0.1)"] } },
        axisLine: { lineStyle: { color: "rgba(56,189,248,0.2)" } },
      },
      series: [
        {
          type: "radar",
          data: [
            {
              value: data.map((d) => d.value),
              name: "能力得分",
              areaStyle: { color: "rgba(56,189,248,0.25)" },
              lineStyle: { color: "#38bdf8", width: 2 },
              itemStyle: { color: "#38bdf8" },
              label: { show: true, color: "#bff3ff", fontSize: 11 },
            },
          ],
        },
      ],
    });
    chartRef.current.resize();
  }, [data, max]);

  return <div ref={ref} style={{ width: "100%", height }} />;
}