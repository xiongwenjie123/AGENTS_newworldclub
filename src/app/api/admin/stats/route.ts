import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  sysUser,
  expeditionTestSession,
  expeditionPassportSnapshot,
  mission,
  fleet,
  fleetSeatAssignment,
  shipIntelligenceAgentCallLog,
  systemPromptTemplate,
  systemAnnouncement,
} from "@/storage/database/shared/schema";
import { eq, sql, desc } from "drizzle-orm";
import { ok, handler } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** 治理者：平台运营总览统计 */
export const GET = handler(async () => {
  await requireUser(["platform_admin","club_operator","club_governor"]);
  const dbi = await db();

  const [userCount] = await dbi.select({ n: sql<string>`count(*)` }).from(sysUser);
  const [testCount] = await dbi.select({ n: sql<string>`count(*)` }).from(expeditionTestSession);
  const [passedCount] = await dbi
    .select({ n: sql<string>`count(*)` })
    .from(expeditionTestSession)
    .where(eq(expeditionTestSession.isPassed, true));
  const [passportCount] = await dbi.select({ n: sql<string>`count(*)` }).from(expeditionPassportSnapshot);
  const [missionCount] = await dbi.select({ n: sql<string>`count(*)` }).from(mission);
  const [fleetCount] = await dbi.select({ n: sql<string>`count(*)` }).from(fleet);
  const [agentAssignCount] = await dbi
    .select({ n: sql<string>`count(*)` })
    .from(fleetSeatAssignment)
    .where(eq(fleetSeatAssignment.assignType, "agent"));
  const [agentCallCount] = await dbi.select({ n: sql<string>`count(*)` }).from(shipIntelligenceAgentCallLog);
  const [confirmedAgentCount] = await dbi
    .select({ n: sql<string>`count(*)` })
    .from(shipIntelligenceAgentCallLog)
    .where(eq(shipIntelligenceAgentCallLog.humanOperationType, "confirmed"));
  const [rejectedAgentCount] = await dbi
    .select({ n: sql<string>`count(*)` })
    .from(shipIntelligenceAgentCallLog)
    .where(eq(shipIntelligenceAgentCallLog.humanOperationType, "rejected"));
  const [promptCount] = await dbi.select({ n: sql<string>`count(*)` }).from(systemPromptTemplate);

  // 三舱角色分布
  const cabinDist = await dbi
    .select({ cabin: fleetSeatAssignment.cabin, n: sql<string>`count(*)` })
    .from(fleetSeatAssignment)
    .where(eq(fleetSeatAssignment.assignType, "human"))
    .groupBy(fleetSeatAssignment.cabin);

  // 最近使命
  const recentMissions = await dbi
    .select({
      missionId: mission.missionId,
      missionName: mission.missionName,
      status: mission.missionStatus,
      createdAt: mission.createdAt,
    })
    .from(mission)
    .orderBy(desc(mission.createdAt))
    .limit(8);

  const [latestAnnouncement] = await dbi
    .select({ title: systemAnnouncement.announcementTitle, content: systemAnnouncement.announcementContent })
    .from(systemAnnouncement)
    .orderBy(desc(systemAnnouncement.publishTime))
    .limit(1);

  return ok({
    stats: {
      userCount: Number(userCount?.n ?? 0),
      testCount: Number(testCount?.n ?? 0),
      passedCount: Number(passedCount?.n ?? 0),
      passportCount: Number(passportCount?.n ?? 0),
      missionCount: Number(missionCount?.n ?? 0),
      fleetCount: Number(fleetCount?.n ?? 0),
      agentAssignCount: Number(agentAssignCount?.n ?? 0),
      agentCallCount: Number(agentCallCount?.n ?? 0),
      confirmedAgentCount: Number(confirmedAgentCount?.n ?? 0),
      rejectedAgentCount: Number(rejectedAgentCount?.n ?? 0),
      promptCount: Number(promptCount?.n ?? 0),
      cabinDistribution: cabinDist.map((c) => ({ cabin: c.cabin, n: Number(c.n) })),
    },
    recentMissions,
    latestAnnouncement: latestAnnouncement ?? null,
  });
});
