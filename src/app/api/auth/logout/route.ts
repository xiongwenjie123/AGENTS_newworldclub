import { clearSessionCookie } from "@/lib/auth";
import { ok, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const POST = handler(async () => {
  await clearSessionCookie();
  return ok({ loggedOut: true });
});
