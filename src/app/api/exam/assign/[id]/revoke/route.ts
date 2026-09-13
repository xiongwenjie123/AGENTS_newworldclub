import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { examPaperAssign } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { ok, fail, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** 撤回未作答考卷 */
export const POST = handler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const dbi = await db();
  const assign = await dbi.select().from(examPaperAssign).where(eq(examPaperAssign.assignId, id)).limit(1);
  if (assign.length === 0) return fail("分发记录不存在", 404);
  if (assign[0].status > 0) return fail("考生已作答，无法撤回");

  await dbi.delete(examPaperAssign).where(eq(examPaperAssign.assignId, id));
  return ok({ assignId: id });
});