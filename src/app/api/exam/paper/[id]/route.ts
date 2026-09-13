import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { examPaper, examOfficialQuestion } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { eq, inArray, sql } from "drizzle-orm";
import { ok, fail, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** 考卷详情（含题目预览） */
export const GET = handler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const dbi = await db();
  const paper = await dbi.select().from(examPaper).where(eq(examPaper.paperId, id)).limit(1);
  if (paper.length === 0) return fail("考卷不存在", 404);

  const qIds = (paper[0].questionIds as string[]) ?? [];
  const questions = qIds.length > 0
    ? await dbi
        .select({
          questionId: examOfficialQuestion.questionId,
          title: examOfficialQuestion.title,
          questionType: examOfficialQuestion.questionType,
          options: examOfficialQuestion.options,
          judgeRule: examOfficialQuestion.judgeRule,
          weightScore: examOfficialQuestion.weightScore,
          eightDimTags: examOfficialQuestion.eightDimTags,
          career21Tags: examOfficialQuestion.career21Tags,
        })
        .from(examOfficialQuestion)
        .where(inArray(examOfficialQuestion.questionId, qIds))
    : [];

  return ok({ paper: paper[0], questions });
});

const editSchema = z.object({
  paperName: z.string().min(2).optional(),
  questionIds: z.array(z.string()).optional(),
  timeLimit: z.number().nullable().optional(),
  status: z.number().optional(),
});

/** HR 手动编辑考卷（增删题目） */
export const PUT = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const body = editSchema.safeParse(await req.json());
  if (!body.success) return fail(body.error.issues[0]?.message ?? "参数错误");

  const dbi = await db();
  const updateFields: Record<string, unknown> = { updatedAt: sql`now()` };
  if (body.data.paperName !== undefined) updateFields.paperName = body.data.paperName;
  if (body.data.questionIds !== undefined) updateFields.questionIds = body.data.questionIds;
  if (body.data.timeLimit !== undefined) updateFields.timeLimit = body.data.timeLimit;
  if (body.data.status !== undefined) updateFields.status = body.data.status;

  await dbi.update(examPaper).set(updateFields).where(eq(examPaper.paperId, id));
  return ok({ paperId: id });
});