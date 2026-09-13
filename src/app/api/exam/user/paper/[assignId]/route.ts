import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { examPaperAssign, examPaper, examOfficialQuestion, examAnswerRecord } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { eq, inArray } from "drizzle-orm";
import { ok, fail, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** 考生：获取考卷题目（不返回评判规则） */
export const GET = handler(async (_req: NextRequest, ctx: { params: Promise<{ assignId: string }> }) => {
  const me = await requireUser();
  const { assignId } = await ctx.params;
  const dbi = await db();

  const assign = await dbi.select().from(examPaperAssign).where(eq(examPaperAssign.assignId, assignId)).limit(1);
  if (assign.length === 0) return fail("考卷不存在", 404);
  if (assign[0].userUid !== me.userId) return fail("无权查看此考卷", 403);
  if (assign[0].status >= 1) return fail("已提交，不可重复查看", 400);

  const paper = await dbi.select().from(examPaper).where(eq(examPaper.paperId, assign[0].paperId)).limit(1);
  if (paper.length === 0) return fail("考卷数据异常", 404);

  const qIds = (paper[0].questionIds as string[]) ?? [];
  const questions = qIds.length > 0
    ? await dbi
        .select({
          questionId: examOfficialQuestion.questionId,
          title: examOfficialQuestion.title,
          questionType: examOfficialQuestion.questionType,
          options: examOfficialQuestion.options,
          weightScore: examOfficialQuestion.weightScore,
        })
        .from(examOfficialQuestion)
        .where(inArray(examOfficialQuestion.questionId, qIds))
    : [];

  const drafts = await dbi.select().from(examAnswerRecord).where(eq(examAnswerRecord.assignId, assignId));
  const draftMap: Record<string, string> = {};
  for (const d of drafts) draftMap[d.questionId] = d.userAnswer ?? "";

  return ok({
    assignId,
    paperName: paper[0].paperName,
    timeLimit: paper[0].timeLimit,
    questions,
    drafts: draftMap,
  });
});