import { getMissionDetail } from "@/lib/mission-data";
import { ok, fail, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const detail = await getMissionDetail(id);
  if (!detail) return fail("使命不存在", 404);
  return ok({ mission: detail });
});
