import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { examOfficialQuestion } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { ok, fail, handler } from "@/lib/api-helpers";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

interface ImportItem {
  title: string;
  questionType?: string;
  options?: string[] | null;
  judgeRule?: string | null;
  eightDimTags?: string;
  career21Tags?: string;
  industry?: string;
  weightScore?: number;
  status?: number;
}

function parseExcelRow(row: Record<string, unknown>): ImportItem {
  const get = (k: string) => {
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().trim() === k.toLowerCase().trim()) return row[key];
    }
    return undefined;
  };
  const optsRaw = get("options");
  let options: string[] | null = null;
  if (typeof optsRaw === "string" && optsRaw.trim()) {
    options = optsRaw.split(/[;；|]/).map((s) => s.trim()).filter(Boolean);
  }
  const tagsRaw = get("eightDimTags") ?? get("eight_dim_tags");
  return {
    title: String(get("title") ?? get("题干") ?? ""),
    questionType: String(get("questionType") ?? get("question_type") ?? get("题型") ?? "essay"),
    options,
    judgeRule: typeof get("judgeRule") === "string" ? String(get("judgeRule")) : null,
    eightDimTags: String(tagsRaw ?? ""),
    career21Tags: String(get("career21Tags") ?? get("career21_tags") ?? ""),
    industry: String(get("industry") ?? get("行业") ?? ""),
    weightScore: Number(get("weightScore") ?? get("weight_score") ?? get("权重") ?? 5),
    status: Number(get("status") ?? get("状态") ?? 1),
  };
}

/** 批量导入题库（支持 JSON 数组 或 Excel 文件上传） */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireUser(["platform_admin", "club_operator", "club_governor"]);
  const contentType = req.headers.get("content-type") ?? "";

  let items: ImportItem[] = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) return fail("请上传 Excel 文件");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
    items = rows.map(parseExcelRow);
  } else {
    const body = await req.json();
    items = Array.isArray(body) ? body : body.items;
  }

  if (!Array.isArray(items) || items.length === 0) return fail("请传入题目数组或 Excel 文件");

  const dbi = await db();
  let successCount = 0;
  const errorRows: { index: number; error: string }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      if (!item.title || typeof item.title !== "string" || item.title.length < 2) {
        errorRows.push({ index: i + 1, error: "题干不能为空" });
        continue;
      }
      const qType = item.questionType || "essay";
      if (!["single", "multiple", "essay"].includes(qType)) {
        errorRows.push({ index: i + 1, error: "题型不合法" });
        continue;
      }
      await dbi.insert(examOfficialQuestion).values({
        title: item.title,
        questionType: qType,
        options: item.options ?? null,
        judgeRule: item.judgeRule ?? null,
        eightDimTags: item.eightDimTags ?? "",
        career21Tags: item.career21Tags ?? "",
        industry: item.industry ?? "",
        weightScore: Number(item.weightScore ?? 5),
        status: Number(item.status ?? 1),
        createdBy: me.userId,
      });
      successCount++;
    } catch (e) {
      errorRows.push({ index: i + 1, error: e instanceof Error ? e.message : "未知错误" });
    }
  }

  return ok({ successCount, errorCount: errorRows.length, errorRows });
});
