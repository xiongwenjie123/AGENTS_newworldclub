import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { examReport, examPaperAssign } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { ok, fail, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** 获取测评报告详情（仅 HR/管理员可查看） */
export const GET = handler(async (_req: NextRequest, ctx: { params: Promise<{ assignId: string }> }) => {
  await requireUser(["platform_admin", "club_operator", "club_governor", "fleet_commander"]);
  const { assignId } = await ctx.params;
  const dbi = await db();

  const assign = await dbi.select().from(examPaperAssign).where(eq(examPaperAssign.assignId, assignId)).limit(1);
  if (assign.length === 0) return fail("分发记录不存在", 404);

  if (!assign[0].reportId) return fail("报告尚未生成", 400);

  const report = await dbi.select().from(examReport).where(eq(examReport.reportId, assign[0].reportId)).limit(1);
  if (report.length === 0) return fail("报告不存在", 404);

  return ok({ report: report[0], assign: assign[0] });
});