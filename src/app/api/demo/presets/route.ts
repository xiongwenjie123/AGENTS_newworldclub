import { db } from "@/lib/db";
import { demoPresetSnapshot } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { ok, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** 获取所有对照演示预置档案 */
export const GET = handler(async () => {
  await requireUser();
  const dbi = await db();
  const presets = await dbi.select().from(demoPresetSnapshot);
  return ok({ presets });
});