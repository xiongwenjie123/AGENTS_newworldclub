import { db } from "@/lib/db";
import { sysUser } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { ok, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** 候选池用户列表（供 HR 分发考卷时选择） */
export const GET = handler(async () => {
  await requireUser(["platform_admin", "club_operator", "club_governor", "fleet_commander"]);

  const dbi = await db();
  const users = await dbi
    .select({
      userId: sysUser.userId,
      nickname: sysUser.nickname,
      civilizationNo: sysUser.civilizationNo,
      email: sysUser.email,
      role: sysUser.role,
    })
    .from(sysUser)
    .where(eq(sysUser.inCandidatePool, true))
    .orderBy(sysUser.nickname);

  return ok({ records: users });
});