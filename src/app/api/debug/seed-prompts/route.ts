import { ok, handler } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { seedPromptTemplates } from "@/lib/prompt-seed";

export const dynamic = "force-dynamic";

/** 播种 Prompt 模板（仅管理员可调用） */
export const POST = handler(async () => {
  await requireUser(["platform_admin", "club_operator"]);
  const result = await seedPromptTemplates();
  return ok(result);
});