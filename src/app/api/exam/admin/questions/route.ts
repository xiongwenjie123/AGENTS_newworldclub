import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { examOfficialQuestion } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { ok, fail, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** 题库列表查询 */
export const GET = handler(async (req: NextRequest) => {
  await requireUser();
  const url = new URL(req.url);
  const eightDim = url.searchParams.get("eight_dim_tags") ?? "";
  const career21 = url.searchParams.get("career21_tags") ?? "";
  const industry = url.searchParams.get("industry") ?? "";
  const status = url.searchParams.get("status");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const size = Math.max(1, Math.min(100, Number(url.searchParams.get("size") ?? "20")));

  const dbi = await db();
  const conditions = [];
  if (eightDim) conditions.push(like(examOfficialQuestion.eightDimTags, `%${eightDim}%`));
  if (career21) conditions.push(like(examOfficialQuestion.career21Tags, `%${career21}%`));
  if (industry) conditions.push(eq(examOfficialQuestion.industry, industry));
  if (status !== null && status !== "") conditions.push(eq(examOfficialQuestion.status, Number(status)));

  const where = conditions.length > 0 ? and(...conditions) : sql`true`;
  const rows = await dbi
    .select()
    .from(examOfficialQuestion)
    .where(where)
    .orderBy(desc(examOfficialQuestion.createdAt))
    .limit(size)
    .offset((page - 1) * size);

  const totalRow = await dbi.select({ cnt: sql<number>`count(*)` }).from(examOfficialQuestion).where(where);
  const total = Number(totalRow[0]?.cnt ?? 0);

  return ok({ records: rows, total, page, size });
});

const addSchema = z.object({
  title: z.string().min(2, "题干不能为空"),
  questionType: z.enum(["single", "multiple", "essay"]),
  options: z.any().optional(),
  judgeRule: z.string().optional(),
  eightDimTags: z.string().optional(),
  career21Tags: z.string().optional(),
  industry: z.string().optional(),
  weightScore: z.number().min(0).max(10).optional(),
  status: z.number().optional(),
});

/** 单条新增题目 */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireUser(["platform_admin", "club_operator", "club_governor"]);
  const body = addSchema.safeParse(await req.json());
  if (!body.success) return fail(body.error.issues[0]?.message ?? "参数错误");

  const dbi = await db();
  const inserted = await dbi
    .insert(examOfficialQuestion)
    .values({
      title: body.data.title,
      questionType: body.data.questionType,
      options: body.data.options ?? null,
      judgeRule: body.data.judgeRule ?? null,
      eightDimTags: body.data.eightDimTags ?? "",
      career21Tags: body.data.career21Tags ?? "",
      industry: body.data.industry ?? "",
      weightScore: body.data.weightScore ?? 5,
      status: body.data.status ?? 1,
      createdBy: me.userId,
    })
    .returning({ questionId: examOfficialQuestion.questionId });

  return ok({ questionId: inserted[0].questionId });
});