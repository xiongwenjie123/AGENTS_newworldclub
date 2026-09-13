import { db } from "@/lib/db";
import { systemAnnouncement } from "@/storage/database/shared/schema";
import { desc, eq } from "drizzle-orm";
import { ok, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** 公开：获取已发布公告 */
export const GET = handler(async () => {
  const dbi = await db();
  const rows = await dbi
    .select({
      id: systemAnnouncement.announcementId,
      title: systemAnnouncement.announcementTitle,
      content: systemAnnouncement.announcementContent,
      noticeLevel: systemAnnouncement.noticeLevel,
      publishTime: systemAnnouncement.publishTime,
    })
    .from(systemAnnouncement)
    .where(eq(systemAnnouncement.isDeleted, false))
    .orderBy(desc(systemAnnouncement.publishTime))
    .limit(10);
  return ok({ announcements: rows });
});
