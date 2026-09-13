import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { examAnswerRecord, examPaperAssign } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";
import { ok, fail, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const draftSchema = z.object({
  assignId: z.string().min(1),
  answers: z.record(z.string(), z.string()),
});

/** 考生：保存答题草稿（自动定时调用） */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireUser();
  const body = draftSchema.safeParse(await req.json());
  if (!body.success) return fail(body.error.issues[0]?.message ?? "参数错误");

  const dbi = await db();
  const assign = await dbi.select().from(examPaperAssign).where(eq(examPaperAssign.assignId, body.data.assignId)).limit(1);
  if (assign.length === 0) return fail("考卷不存在", 404);
  if (assign[0].userUid !== me.userId) return fail("无权操作此考卷", 403);
  if (assign[0].status >= 1) return fail("已提交，不可修改", 400);

  for (const [questionId, answer] of Object.entries(body.data.answers)) {
    const existing = await dbi
      .select()
      .from(examAnswerRecord)
      .where(and(eq(examAnswerRecord.assignId, body.data.assignId), eq(examAnswerRecord.questionId, questionId)))
      .limit(1);
    if (existing.length > 0) {
      await dbi
        .update(examAnswerRecord)
        .set({ userAnswer: answer, isDraft: true, updatedAt: sql`now()` })
        .where(eq(examAnswerRecord.recordId, existing[0].recordId));
    } else {
      await dbi.insert(examAnswerRecord).values({
        assignId: body.data.assignId,
        questionId,
        userAnswer: answer,
        isDraft: true,
      });
    }
  }

  return ok({ saved: Object.keys(body.data.answers).length });
});