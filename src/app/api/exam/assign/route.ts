import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { examPaperAssign, examPaper } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { ok, fail, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const assignSchema = z.object({
  paperId: z.string().min(1, "考卷ID不能为空"),
  userUid: z.string().min(1, "应聘者UID不能为空"),
});

/** 分发考卷，绑定应聘者 UID */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireUser();
  const body = assignSchema.safeParse(await req.json());
  if (!body.success) return fail(body.error.issues[0]?.message ?? "参数错误");

  const dbi = await db();
  const paper = await dbi.select().from(examPaper).where(eq(examPaper.paperId, body.data.paperId)).limit(1);
  if (paper.length === 0) return fail("考卷不存在", 404);
  if (paper[0].companyId !== me.userId && me.role !== "platform_admin") {
    return fail("无权分发他人考卷", 403);
  }

  const existing = await dbi
    .select()
    .from(examPaperAssign)
    .where(and(eq(examPaperAssign.paperId, body.data.paperId), eq(examPaperAssign.userUid, body.data.userUid)))
    .limit(1);
  if (existing.length > 0) return fail("该候选人已分发过此考卷");

  const inserted = await dbi
    .insert(examPaperAssign)
    .values({
      paperId: body.data.paperId,
      userUid: body.data.userUid,
      status: 0,
    })
    .returning({ assignId: examPaperAssign.assignId });

  return ok({ assignId: inserted[0].assignId });
});