import { getSessionUser } from "@/lib/auth";
import { ok, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const user = await getSessionUser();
  return ok({ user: user ?? null });
});
