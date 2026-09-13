import { seedDemoData, seedQuestions, seedDemoPresets } from "@/../scripts/seed-demo";
import { ok, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";
// 演示数据接口允许任意访问（MVP 演示模式）
export const POST = handler(async () => {
  await seedQuestions();
  const presetCount = await seedDemoPresets();
  const result = await seedDemoData();
  return ok({ ...result, demoPassword: "demo123456", presetCount });
});
