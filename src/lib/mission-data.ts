import "server-only";
import { db } from "@/lib/db";
import { mission, fleet, fleetSeatAssignment, sysUser } from "@/storage/database/shared/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";

export async function getMissionDetail(missionId: string) {
  const dbi = await db();
  const rows = await dbi
    .select()
    .from(mission)
    .where(and(eq(mission.missionId, missionId), isNull(mission.deletedAt)))
    .limit(1);
  const m = rows[0];
  if (!m) return null;

  const fleets = await dbi.select().from(fleet).where(eq(fleet.missionId, missionId));
  const fleetData = [];
  for (const f of fleets) {
    const seats = await dbi
      .select()
      .from(fleetSeatAssignment)
      .where(eq(fleetSeatAssignment.fleetId, f.fleetId));
    const userIds = seats.map((s) => s.assignedUserId).filter((x): x is string => !!x);
    const userRows = userIds.length
      ? await dbi.select().from(sysUser).where(inArray(sysUser.userId, userIds))
      : [];
    const userMap = new Map(userRows.map((u) => [u.userId, u.nickname]));

    fleetData.push({
      fleetId: f.fleetId,
      fleetNo: f.fleetNo,
      status: f.fleetStatus,
      isPrimary: f.isPrimary,
      generationLog: f.fleetGenerationLogJson as {
        strategy?: string;
        humanCount?: number;
        agentCount?: number;
        riskLevel?: string;
        riskNote?: string[];
      } | null,
      seats: seats.map((s) => ({
        assignmentId: s.assignmentId,
        seatName: s.seatName,
        cabin: s.cabin,
        type: s.assignType === "agent" ? ("agent" as const) : ("human" as const),
        assignType: s.assignType,
        assignedUserId: s.assignedUserId,
        nickname: s.assignedUserId ? userMap.get(s.assignedUserId) ?? null : null,
        agentAlias: s.agentAlias,
        matchScore: s.matchScore,
        comment: s.assignComment,
      })),
    });
  }

  return {
    missionId: m.missionId,
    missionNo: m.missionNo,
    missionName: m.missionName,
    missionGoal: m.missionGoal,
    missionBackground: m.missionBackground,
    missionTags: m.missionTags,
    mustHumanSeats: m.mustHumanSeats,
    missionStatus: m.missionStatus,
    currentPhase: m.currentPhase,
    creatorUserId: m.creatorUserId,
    isDemo: m.isDemo,
    fleets: fleetData,
  };
}
