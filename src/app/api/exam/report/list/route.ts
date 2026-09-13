import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { examReport, examPaperAssign, examPaper, sysUser } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { eq, desc, inArray } from "drizzle-orm";
import { ok, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** 测评报告列表（当前 HR 的所有报告） */
export const GET = handler(async (req: NextRequest) => {
  const me = await requireUser(["platform_admin", "club_operator", "club_governor", "fleet_commander"]);
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

  const assigns = await dbi
    .select({
      assignId: examPaperAssign.assignId,
      paperId: examPaperAssign.paperId,
      userUid: examPaperAssign.userUid,
      status: examPaperAssign.status,
      submitTime: examPaperAssign.submitTime,
      reportId: examPaperAssign.reportId,
      candidateNickname: sysUser.nickname,
      candidateCivNo: sysUser.civilizationNo,
    })
    .from(examPaperAssign)
    .innerJoin(sysUser, eq(examPaperAssign.userUid, sysUser.userId))
    .where(inArray(examPaperAssign.paperId, paperIds))
    .orderBy(desc(examPaperAssign.submitTime))
    .limit(size)
    .offset((page - 1) * size);

  const reportIds = assigns
    .filter((a) => a.reportId)
    .map((a) => a.reportId as string);

  const reports = reportIds.length > 0
    ? await dbi
        .select({
          reportId: examReport.reportId,
          eightDimScore: examReport.eightDimScore,
          finalSuggest: examReport.finalSuggest,
          createdAt: examReport.createdAt,
        })
        .from(examReport)
        .where(inArray(examReport.reportId, reportIds))
    : [];

  const reportMap = new Map(reports.map((r) => [r.reportId, r]));

  const records = assigns.map((a) => ({
    ...a,
    report: a.reportId ? reportMap.get(a.reportId) ?? null : null,
  }));

  return ok({ records, page, size });
});