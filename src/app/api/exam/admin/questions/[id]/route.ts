import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { examOfficialQuestion } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";
import { ok, fail, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const editSchema = z.object({
  title: z.string().min(2).optional(),
  questionType: z.enum(["single", "multiple", "essay"]).optional(),
  options: z.any().optional(),
  judgeRule: z.string().optional().nullable(),
  eightDimTags: z.string().optional(),
  career21Tags: z.string().optional(),
  industry: z.string().optional(),
  weightScore: z.number().min(0).max(10).optional(),
  status: z.number().optional(),
});

/** 编辑题目 */
export const PUT = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser(["platform_admin", "club_operator", "club_governor"]);
  const { id } = await ctx.params;
  const body = editSchema.safeParse(await req.json());
  if (!body.success) return fail(body.error.issues[0]?.message ?? "参数错误");

  const dbi = await db();
  const updateFields: Record<string, unknown> = { updatedAt: sql`now()` };
  const d = body.data;
  if (d.title !== undefined) updateFields.title = d.title;
  if (d.questionType !== undefined) updateFields.questionType = d.questionType;
  if (d.options !== undefined) updateFields.options = d.options;
  if (d.judgeRule !== undefined) updateFields.judgeRule = d.judgeRule;
  if (d.eightDimTags !== undefined) updateFields.eightDimTags = d.eightDimTags;
  if (d.career21Tags !== undefined) updateFields.career21Tags = d.career21Tags;
  if (d.industry !== undefined) updateFields.industry = d.industry;
  if (d.weightScore !== undefined) updateFields.weightScore = d.weightScore;
  if (d.status !== undefined) updateFields.status = d.status;

  await dbi.update(examOfficialQuestion).set(updateFields).where(eq(examOfficialQuestion.questionId, id));
  return ok({ questionId: id });
});

/** 删除题目 */
export const DELETE = handler(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser(["platform_admin", "club_operator", "club_governor"]);
  const { id } = await ctx.params;
  const dbi = await db();
  await dbi.delete(examOfficialQuestion).where(eq(examOfficialQuestion.questionId, id));
  return ok({ questionId: id });
});