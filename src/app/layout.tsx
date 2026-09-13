import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: {
    default: "新大陆俱乐部 New World Club",
    template: "%s · 新大陆俱乐部",
  },
  description:
    "新大陆俱乐部 New World Club —— 21 席·灵魂协作操作系统。不是寻找最优秀的人，而是寻找可以共同完成伟大航行的互补个体。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
