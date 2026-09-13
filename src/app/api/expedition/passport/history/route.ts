import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { expeditionPassportSnapshot } from "@/storage/database/shared/schema";
import { eq, desc } from "drizzle-orm";
import { ok, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** 我的航行档案历史版本列表 */
export const GET = handler(async () => {
  const me = await requireUser();
  const dbi = await db();

  const snapshots = await dbi
    .select({
      snapshotId: expeditionPassportSnapshot.passportSnapshotId,
      version: expeditionPassportSnapshot.passportVersionNo,
      honorTitle: expeditionPassportSnapshot.honorTitle,
      starCount: expeditionPassportSnapshot.starCount,
      missionCount: expeditionPassportSnapshot.missionCount,
      comment: expeditionPassportSnapshot.snapshotComment,
      createdAt: expeditionPassportSnapshot.createdAt,
    })
    .from(expeditionPassportSnapshot)
    .where(eq(expeditionPassportSnapshot.userId, me.userId))
    .orderBy(desc(expeditionPassportSnapshot.passportVersionNo));

  return ok({ versions: snapshots, total: snapshots.length });
});