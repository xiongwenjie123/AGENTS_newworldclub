import { db } from "@/lib/db";
import { examOfficialQuestion } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { ok, fail, handler } from "@/lib/api-helpers";
import { SEED_EXAM_QUESTIONS } from "@/lib/exam-seed-data";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** 播种官方题库（10 套调研问卷产出的种子题目） */
export const POST = handler(async () => {
  const me = await requireUser(["platform_admin", "club_operator", "club_governor"]);
  const dbi = await db();

  let successCount = 0;
  for (const q of SEED_EXAM_QUESTIONS) {
    await dbi.insert(examOfficialQuestion).values({
      title: q.title,
      questionType: q.questionType,
      options: q.options ?? null,
      judgeRule: q.judgeRule ?? null,
      eightDimTags: q.eightDimTags,
      career21Tags: q.career21Tags,
      industry: q.industry,
      weightScore: q.weightScore,
      status: q.status,
      createdBy: me.userId,
    });
    successCount++;
  }

  return ok({ successCount, message: `成功导入 ${successCount} 道调研题库` });
});