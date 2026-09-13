import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ code: 0, message: "success", data }, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ code: status, message, data: null }, { status });
}

/** 统一包装路由处理，自动捕获 AuthError 与未知异常 */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof AuthError) {
        return fail(e.message, e.status);
      }
      console.error("[api error]", e);
      return fail(e instanceof Error ? e.message : "服务器内部错误", 500);
    }
  };
}
