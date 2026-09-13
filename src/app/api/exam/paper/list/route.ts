import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { examPaper } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { ok, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** 考卷列表（当前 HR 的考卷） */
export const GET = handler(async (req: NextRequest) => {
  const me = await requireUser();
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const size = Math.max(1, Math.min(100, Number(url.searchParams.get("size") ?? "20")));

  const dbi = await db();
  const rows = await dbi
    .select()
    .from(examPaper)
    .where(eq(examPaper.companyId, me.userId))
    .orderBy(desc(examPaper.createdAt))
    .limit(size)
    .offset((page - 1) * size);

  return ok({ records: rows, page, size });
});