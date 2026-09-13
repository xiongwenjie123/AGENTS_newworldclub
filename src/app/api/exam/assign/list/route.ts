import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { examPaperAssign, examPaper, sysUser } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { eq, desc, inArray } from "drizzle-orm";
import { ok, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** 分发记录列表（当前 HR 的所有分发） */
export const GET = handler(async (req: NextRequest) => {
  const me = await requireUser();
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const size = Math.max(1, Math.min(100, Number(url.searchParams.get("size") ?? "20")));

  const dbi = await db();
  const papers = await dbi
    .select({ paperId: examPaper.paperId })
    .from(examPaper)
    .where(eq(examPaper.companyId, me.userId));

  if (papers.length === 0) return ok({ records: [], page, size });

  const paperIds = papers.map((p) => p.paperId);
  const rows = await dbi
    .select({
      assignId: examPaperAssign.assignId,
      paperId: examPaperAssign.paperId,
      userUid: examPaperAssign.userUid,
      assignTime: examPaperAssign.assignTime,
      submitTime: examPaperAssign.submitTime,
      reportId: examPaperAssign.reportId,
      status: examPaperAssign.status,
      candidateNickname: sysUser.nickname,
      candidateCivNo: sysUser.civilizationNo,
    })
    .from(examPaperAssign)
    .innerJoin(sysUser, eq(examPaperAssign.userUid, sysUser.userId))
    .where(inArray(examPaperAssign.paperId, paperIds))
    .orderBy(desc(examPaperAssign.assignTime))
    .limit(size)
    .offset((page - 1) * size);

  return ok({ records: rows, page, size });
});