import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sysUser } from "@/storage/database/shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { verifyPassword, signToken, setSessionCookie, type SessionUser } from "@/lib/auth";
import { ok, fail, handler } from "@/lib/api-helpers";

const schema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(1, "请输入密码"),
});

export const POST = handler(async (req: NextRequest) => {
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail(body.error.issues[0]?.message ?? "参数错误");

  const dbi = await db();
  const rows = await dbi
    .select()
    .from(sysUser)
    .where(and(eq(sysUser.email, body.data.email), isNull(sysUser.deletedAt)))
    .limit(1);
  const u = rows[0];
  if (!u || !verifyPassword(body.data.password, u.passwordHash)) {
    return fail("邮箱或密码错误", 401);
  }

  const token = signToken({ userId: u.userId, role: u.role });
  await setSessionCookie(token);

  const user: SessionUser = {
    userId: u.userId,
    nickname: u.nickname,
    avatarUrl: u.avatarUrl,
    civilizationNo: u.civilizationNo,
    role: u.role as SessionUser["role"],
    inCandidatePool: u.inCandidatePool,
    isDemo: u.isDemo,
    email: u.email,
  };
  return ok({ user });
});
