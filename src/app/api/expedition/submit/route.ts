import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { expeditionTestSession } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { analyzeAnswers, writeSnapshot, markSessionParsed } from "@/lib/passport";
import { forwardHeadersFrom } from "@/lib/llm";
import { encryptText } from "@/lib/crypto";
import { ok, fail, handler } from "@/lib/api-helpers";

const schema = z.object({
  answers: z
    .array(
      z.object({
        questionTitle: z.string().min(1),
        answer: z.string().min(1, "请完成每道题"),
      })
    )
    .min(1, "请至少完成一道题"),
  joinPool: z.boolean().optional(),
});

export const dynamic = "force-dynamic";

export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser();
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail(body.error.issues[0]?.message ?? "参数错误");

  const dbi = await db();

  // 1. 创建测试会话（草稿）
  const session = await dbi
    .insert(expeditionTestSession)
    .values({
      userId: user.userId,
      sessionStatus: "analyzing",
      questionList: body.data.answers.map((a, i) => ({
        id: `q${i + 1}`,
        title: a.questionTitle,
        tag: "mix",
      })),
      userAnswerEnc: encryptText(body.data.answers.map((a) => a.answer).join("\n----\n")),
      isDemo: false,
    })
    .returning({ id: expeditionTestSession.testSessionId });
  const sessionId = session[0].id;

  // 2. 调用舰载智能解析（真实 LLM，透传请求头用于鉴权/配额）
  const result = await analyzeAnswers(body.data.answers, { forwardHeaders: forwardHeadersFrom(req) });

  // 3. 回写会话解析结果
  await markSessionParsed(sessionId, result.raw, result.sessionStatus, result.errorMsg);

  // 4. 写入不可篡改航行档案快照 v1
  const snapshotId = await writeSnapshot({
    userId: user.userId,
    sourceType: "test",
    sourceRelationId: sessionId,
    passport: result.data,
    starCount: 0,
    apuCredit: 100,
    missionCount: 0,
    comment: result.sessionStatus === "parse_failed" ? "AI 解析异常，已生成中性兜底画像" : "登舰测试测绘生成",
    isDemo: false,
  });

  return ok({
    sessionId,
    snapshotId,
    parseStatus: result.sessionStatus,
    parseError: result.errorMsg,
    passport: result.data,
  });
});
