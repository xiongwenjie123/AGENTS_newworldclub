import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { examOfficialQuestion } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { handler, fail } from "@/lib/api-helpers";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

/** 导出题库为 Excel 文件 */
export const GET = handler(async (req: NextRequest) => {
  await requireUser(["platform_admin", "club_operator", "club_governor"]);
  const dbi = await db();

  const url = new URL(req.url);
  const industry = url.searchParams.get("industry");

  const { eq: eqOp } = await import("drizzle-orm");
  const questions = industry
    ? await dbi.select().from(examOfficialQuestion).where(eqOp(examOfficialQuestion.industry, industry))
    : await dbi.select().from(examOfficialQuestion);

  const rows = questions.map((q) => ({
    "题目ID": q.questionId,
    "题干": q.title,
    "题型": q.questionType,
    "选项": Array.isArray(q.options) ? (q.options as string[]).join("；") : "",
    "判分规则": q.judgeRule ?? "",
    "八维标签": q.eightDimTags,
    "21席标签": q.career21Tags,
    "行业": q.industry,
    "权重": q.weightScore,
    "状态": q.status === 1 ? "上线" : "下线",
    "创建时间": q.createdAt,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "题库");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="exam-questions-${Date.now()}.xlsx"`,
    },
  });
});

export const POST = handler(async () => {
  return fail("请使用 GET 方法导出", 405);
});