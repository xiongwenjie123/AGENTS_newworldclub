import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { examPaper, examOfficialQuestion } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { inArray } from "drizzle-orm";
import { ok, fail, handler } from "@/lib/api-helpers";
import { getOnlineQuestionPool, generateExamPaper, type DemandParams } from "@/lib/exam";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  paperName: z.string().min(2, "考卷名称不能为空"),
  industry: z.string().optional(),
  jobTitle: z.string().optional(),
  jobDesc: z.string().optional(),
  targetEightDim: z.string().optional(),
  targetCareer21: z.string().optional(),
  totalQuestionCount: z.number().min(5).max(50).optional(),
  timeLimit: z.number().optional(),
  remark: z.string().optional(),
});

/** HR 录入招聘需求，调用出题算法生成考卷 */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireUser();
  const body = createSchema.safeParse(await req.json());
  if (!body.success) return fail(body.error.issues[0]?.message ?? "参数错误");

  const demand: DemandParams = {
    industry: body.data.industry,
    jobTitle: body.data.jobTitle,
    jobDesc: body.data.jobDesc,
    targetEightDim: body.data.targetEightDim,
    targetCareer21: body.data.targetCareer21,
    totalQuestionCount: body.data.totalQuestionCount ?? 20,
    timeLimit: body.data.timeLimit,
    remark: body.data.remark,
  };

  const pool = await getOnlineQuestionPool();
  if (pool.length === 0) return fail("官方题库为空，请先导入题目", 400);

  const questionIds = generateExamPaper(pool, demand);
  if (questionIds.length === 0) return fail("组卷失败，题库匹配不足", 400);

  const dbi = await db();
  const inserted = await dbi
    .insert(examPaper)
    .values({
      companyId: me.userId,
      paperName: body.data.paperName,
      demandJson: demand,
      questionIds,
      timeLimit: body.data.timeLimit ?? null,
      status: 1,
    })
    .returning({ paperId: examPaper.paperId });

  const questions = await dbi
    .select({
      questionId: examOfficialQuestion.questionId,
      title: examOfficialQuestion.title,
      questionType: examOfficialQuestion.questionType,
      options: examOfficialQuestion.options,
      weightScore: examOfficialQuestion.weightScore,
      eightDimTags: examOfficialQuestion.eightDimTags,
      career21Tags: examOfficialQuestion.career21Tags,
    })
    .from(examOfficialQuestion)
    .where(inArray(examOfficialQuestion.questionId, questionIds));

  return ok({ paperId: inserted[0].paperId, questionIds, questions });
});