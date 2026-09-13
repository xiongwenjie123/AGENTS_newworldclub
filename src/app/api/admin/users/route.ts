import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sysUser } from "@/storage/database/shared/schema";
import { desc, eq } from "drizzle-orm";
import { ok, fail, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** 治理者：用户列表 */
export const GET = handler(async (req: NextRequest) => {
  await requireUser(["platform_admin","club_operator","club_governor"]);
  const dbi = await db();
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const rows = await dbi
    .select({
      userId: sysUser.userId,
      nickname: sysUser.nickname,
      phone: sysUser.phone,
      role: sysUser.role,
      aiTokenBalance: sysUser.aiTokenBalance,
      profileCompleted: sysUser.profileCompleted,
      isDemo: sysUser.isDemo,
      createdAt: sysUser.createdAt,
    })
    .from(sysUser)
    .orderBy(desc(sysUser.createdAt))
    .limit(200);
  const filtered = role ? rows.filter((r) => r.role === role) : rows;
  return ok({ users: filtered });
});

const creditSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int(),
  reason: z.string().default("治理者调整"),
});

/** 治理者：给用户调整 APU 额度 */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireUser(["platform_admin","club_operator","club_governor"]);
  const body = creditSchema.safeParse(await req.json());
  if (!body.success) return fail(body.error.issues[0]?.message ?? "参数错误");
  const { userId, amount, reason } = body.data;
  const dbi = await db();

  const target = await dbi.select().from(sysUser).where(eq(sysUser.userId, userId)).limit(1);
  if (!target[0]) return fail("用户不存在", 404);

  const newBalance = target[0].aiTokenBalance + amount;
  if (newBalance < 0) return fail("额度不足，扣减失败", 400);

  await dbi
    .update(sysUser)
    .set({ aiTokenBalance: newBalance })
    .where(eq(sysUser.userId, userId));

  return ok({ userId, newBalance, reason, operatorId: me.userId });
});
