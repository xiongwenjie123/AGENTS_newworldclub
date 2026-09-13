import { db } from "@/lib/db";
import { expeditionQuestion } from "@/storage/database/shared/schema";
import { eq, asc, and } from "drizzle-orm";
import { ok, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const dbi = await db();
  let rows = await dbi
    .select()
    .from(expeditionQuestion)
    .where(and(eq(expeditionQuestion.isActive, true)))
    .orderBy(asc(expeditionQuestion.sortOrder));

  // 若题库为空，返回内置默认题
  if (rows.length === 0) {
    rows = [
      { questionId: "builtin-1", questionTitle: "请讲一次你在信息极度不完整时，仍主动做出判断并推进的真实经历。你当时依据的是什么？", questionTag: "explore", sortOrder: 1, isActive: true, createdAt: "", updatedAt: "", deletedAt: null } as never,
      { questionId: "builtin-2", questionTitle: "当团队陷入方向分歧、久议不决时，你通常会怎么做？请描述一个你亲身经历的场景。", questionTag: "govern", sortOrder: 2, isActive: true, createdAt: "", updatedAt: "", deletedAt: null } as never,
      { questionId: "builtin-3", questionTitle: "描述一个你从零到一完成的复杂任务：你如何拆解、排期、兜底，并确保最终闭环交付？", questionTag: "build", sortOrder: 3, isActive: true, createdAt: "", updatedAt: "", deletedAt: null } as never,
      { questionId: "builtin-4", questionTitle: "你有没有过一个大多数人不理解、但你坚持探索的想法或爱好？它后来怎么样了？", questionTag: "explore", sortOrder: 4, isActive: true, createdAt: "", updatedAt: "", deletedAt: null } as never,
      { questionId: "builtin-5", questionTitle: "回忆一次你与他人发生激烈分歧或冲突的经历，你是如何处理的，结果如何？", questionTag: "govern", sortOrder: 5, isActive: true, createdAt: "", updatedAt: "", deletedAt: null } as never,
    ];
  }

  return ok({
    questions: rows.map((q) => ({
      id: q.questionId,
      title: q.questionTitle,
      tag: q.questionTag,
    })),
  });
});
