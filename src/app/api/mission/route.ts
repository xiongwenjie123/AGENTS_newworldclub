import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { mission } from "@/storage/database/shared/schema";
import { requireUser } from "@/lib/auth";
import { eq, desc, isNull } from "drizzle-orm";
import { ok, fail, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** Mission 列表 */
export const GET = handler(async () => {
  const dbi = await db();
  const rows = await dbi
    .select()
    .from(mission)
    .where(isNull(mission.deletedAt))
    .orderBy(desc(mission.createdAt))
    .limit(50);

  const list = rows.map((m) => ({
    missionId: m.missionId,
    missionNo: m.missionNo,
    missionName: m.missionName,
    missionGoal: m.missionGoal,
    missionBackground: m.missionBackground,
    missionTags: m.missionTags,
    mustHumanSeats: m.mustHumanSeats,
    missionStatus: m.missionStatus,
    currentPhase: m.currentPhase,
    isDemo: m.isDemo,
    createdAt: m.createdAt,
  }));

  return ok({ missions: list });
});

const createSchema = z.object({
  missionName: z.string().min(2, "请填写使命名称"),
  missionGoal: z.string().min(2, "请填写使命目标"),
  missionBackground: z.string().optional(),
  missionTags: z.array(z.string()).optional(),
  mustHumanSeats: z.array(z.string()).optional(),
});

/** 创建 Mission（舰长权限） */
export const POST = handler(async (req: NextRequest) => {
  const me = await requireUser();
  if (me.role !== "fleet_commander" && me.role !== "platform_admin" && me.role !== "member") {
    return fail("无权创建使命", 403);
  }
  const body = createSchema.safeParse(await req.json());
  if (!body.success) return fail(body.error.issues[0]?.message ?? "参数错误");

  const dbi = await db();
  const missionNo = `MISSION-${Date.now().toString(36).toUpperCase()}`;
  const inserted = await dbi
    .insert(mission)
    .values({
      missionNo: missionNo,
      missionName: body.data.missionName,
      missionGoal: body.data.missionGoal,
      missionBackground: body.data.missionBackground ?? "",
      missionTags: body.data.missionTags ?? [],
      mustHumanSeats: body.data.mustHumanSeats ?? ["fleet_commander", "star_dock_keeper", "engine_chief"],
      missionStatus: "draft",
      currentPhase: "intel_analysis",
      creatorUserId: me.userId,
      isDemo: false,
    })
    .returning({ missionId: mission.missionId });

  return ok({ missionId: inserted[0].missionId, missionNo });
});
