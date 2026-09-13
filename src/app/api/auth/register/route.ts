import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sysUser } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  signToken,
  setSessionCookie,
  nextCivilizationNo,
  type SessionUser,
} from "@/lib/auth";
import { ok, fail, handler } from "@/lib/api-helpers";

const schema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(6, "密码至少 6 位"),
  nickname: z.string().min(1, "请填写昵称").max(32),
});

export const POST = handler(async (req: NextRequest) => {
  const body = schema.safeParse(await req.json());
  if (!body.success) return fail(body.error.issues[0]?.message ?? "参数错误");

  const dbi = await db();
  const exists = await dbi.select({ id: sysUser.userId }).from(sysUser).where(eq(sysUser.email, body.data.email)).limit(1);
  if (exists.length > 0) return fail("该邮箱已被注册");

  const civilizationNo = await nextCivilizationNo();
  const inserted = await dbi
    .insert(sysUser)
    .values({
      loginType: "email",
      email: body.data.email,
      passwordHash: hashPassword(body.data.password),
      nickname: body.data.nickname,
      civilizationNo: civilizationNo,
      role: "member",
      inCandidatePool: false,
      isDemo: false,
    })
    .returning({ userId: sysUser.userId, nickname: sysUser.nickname, civilizationNo: sysUser.civilizationNo });

  const u = inserted[0];
  const token = signToken({ userId: u.userId, role: "member" });
  await setSessionCookie(token);

  const user: SessionUser = {
    userId: u.userId,
    nickname: u.nickname,
    avatarUrl: null,
    civilizationNo: u.civilizationNo,
    role: "member",
    inCandidatePool: false,
    isDemo: false,
    email: body.data.email,
  };
  return ok({ user });
});
