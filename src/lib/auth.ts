import "server-only";
import {
  createHmac,
  scryptSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { sysUser } from "@/storage/database/shared/schema";
import { eq, sql } from "drizzle-orm";
import type { UserRole } from "@/lib/domain";

const COOKIE_NAME = "nw_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 天

function getSecret(): string {
  return (
    process.env.NW_SESSION_SECRET ||
    process.env.COZE_WORKLOAD_IDENTITY_CLIENT_SECRET ||
    "new-world-club-default-dev-secret-change-me-0x5173"
  );
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** 签发会话令牌（HMAC-SHA256，自带过期时间） */
export function signToken(payload: { userId: string; role: string }): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(
    JSON.stringify({ uid: payload.userId, rol: payload.role, exp: Date.now() + MAX_AGE_SEC * 1000 })
  );
  const sig = createHmac("sha256", getSecret()).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

/** 校验会话令牌，返回载荷；失败返回 null */
export function verifyToken(token: string): { uid: string; rol: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = createHmac("sha256", getSecret()).update(`${header}.${body}`).digest("base64url");
  try {
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as {
      uid: string;
      rol: string;
      exp: number;
    };
    if (!payload.exp || payload.exp < Date.now()) return null;
    return { uid: payload.uid, rol: payload.rol };
  } catch {
    return null;
  }
}

/** scrypt 密码哈希 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 64);
  const ref = Buffer.from(hash, "hex");
  return test.length === ref.length && timingSafeEqual(test, ref);
}

export interface SessionUser {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  civilizationNo: string;
  role: UserRole;
  inCandidatePool: boolean;
  isDemo: boolean;
  email: string | null;
}

/** 从 cookie 读取当前登录用户；未登录返回 null */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;

  const dbi = await db();
  const rows = await dbi
    .select()
    .from(sysUser)
    .where(eq(sysUser.userId, payload.uid))
    .limit(1);
  const u = rows[0];
  if (!u || u.deletedAt) return null;

  return {
    userId: u.userId,
    nickname: u.nickname,
    avatarUrl: u.avatarUrl,
    civilizationNo: u.civilizationNo,
    role: u.role as UserRole,
    inCandidatePool: u.inCandidatePool,
    isDemo: u.isDemo,
    email: u.email,
  };
}

/** 强制要求登录；可附加角色白名单（单个或多个） */
export async function requireUser(roles?: UserRole | UserRole[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError("未登录或会话已过期", 401);
  }
  const list = roles ? (Array.isArray(roles) ? roles : [roles]) : [];
  if (list.length > 0 && !list.includes(user.role)) {
    throw new AuthError("权限不足", 403);
  }
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** 生成文明编号 NW-XXXX */
export async function nextCivilizationNo(): Promise<string> {
  const dbi = await db();
  const res: unknown = await dbi.execute(
    sql`SELECT MAX(civilization_no) AS max_no FROM sys_user`
  );
  const maxNo = (res as { rows: { max_no: string | null }[] }).rows[0]?.max_no;
  const nextNum = maxNo ? parseInt(maxNo.replace(/\D/g, ""), 10) + 1 : 1024;
  return `NW-${String(nextNum).padStart(4, "0")}`;
}
