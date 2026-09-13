import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { examPaperAssign, examPaper } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { ok, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** 考生：获取分配给自己的考卷列表 */
export const GET = handler(async (_req: NextRequest) => {
  const me = await requireUser();
  const dbi = await db();
  const rows = await dbi
    .select({
      assignId: examPaperAssign.assignId,
      paperId: examPaperAssign.paperId,
      status: examPaperAssign.status,
      assignTime: examPaperAssign.assignTime,
      submitTime: examPaperAssign.submitTime,
      paperName: examPaper.paperName,
      timeLimit: examPaper.timeLimit,
    })
    .from(examPaperAssign)
    .innerJoin(examPaper, eq(examPaperAssign.paperId, examPaper.paperId))
    .where(eq(examPaperAssign.userUid, me.userId))
    .orderBy(desc(examPaperAssign.assignTime));

  return ok({ records: rows });
});