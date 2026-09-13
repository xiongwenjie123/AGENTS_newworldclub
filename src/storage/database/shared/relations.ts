import { relations } from "drizzle-orm/relations";
import {
  sysUser,
  expeditionQuestion,
  expeditionTestSession,
  expeditionPassportSnapshot,
  mission,
  fleet,
  fleetSeatAssignment,
  missionPhaseOutput,
  shipIntelligenceAgentCallLog,
  missionCollaborateFeedback,
  apuCreditRecord,
  examOfficialQuestion,
  examPaper,
  examPaperAssign,
  examAnswerRecord,
  examReport,
} from "./schema";

export const sysUserRelations = relations(sysUser, ({ many }) => ({
  passportSnapshots: many(expeditionPassportSnapshot),
  testSessions: many(expeditionTestSession),
  missions: many(mission),
  apuCredits: many(apuCreditRecord),
}));

export const expeditionPassportSnapshotRelations = relations(expeditionPassportSnapshot, ({ one }) => ({
  user: one(sysUser, { fields: [expeditionPassportSnapshot.userId], references: [sysUser.userId] }),
}));

export const expeditionTestSessionRelations = relations(expeditionTestSession, ({ one }) => ({
  user: one(sysUser, { fields: [expeditionTestSession.userId], references: [sysUser.userId] }),
}));

export const missionRelations = relations(mission, ({ one, many }) => ({
  commander: one(sysUser, { fields: [mission.creatorUserId], references: [sysUser.userId] }),
  fleets: many(fleet),
  phaseOutputs: many(missionPhaseOutput),
  feedbacks: many(missionCollaborateFeedback),
}));

export const fleetRelations = relations(fleet, ({ one, many }) => ({
  mission: one(mission, { fields: [fleet.missionId], references: [mission.missionId] }),
  seatAssignments: many(fleetSeatAssignment),
}));

export const fleetSeatAssignmentRelations = relations(fleetSeatAssignment, ({ one }) => ({
  fleet: one(fleet, { fields: [fleetSeatAssignment.fleetId], references: [fleet.fleetId] }),
  user: one(sysUser, { fields: [fleetSeatAssignment.assignedUserId], references: [sysUser.userId] }),
}));

export const missionPhaseOutputRelations = relations(missionPhaseOutput, ({ one }) => ({
  mission: one(mission, { fields: [missionPhaseOutput.missionId], references: [mission.missionId] }),
}));

export const missionCollaborateFeedbackRelations = relations(missionCollaborateFeedback, ({ one }) => ({
  mission: one(mission, { fields: [missionCollaborateFeedback.missionId], references: [mission.missionId] }),
  fromUser: one(sysUser, { fields: [missionCollaborateFeedback.feedbackFromUserId], references: [sysUser.userId] }),
}));

export const shipIntelligenceAgentCallLogRelations = relations(shipIntelligenceAgentCallLog, ({ one }) => ({
  mission: one(mission, { fields: [shipIntelligenceAgentCallLog.missionId], references: [mission.missionId] }),
}));

export const apuCreditRecordRelations = relations(apuCreditRecord, ({ one }) => ({
  user: one(sysUser, { fields: [apuCreditRecord.userId], references: [sysUser.userId] }),
}));

export const examPaperRelations = relations(examPaper, ({ one, many }) => ({
  company: one(sysUser, { fields: [examPaper.companyId], references: [sysUser.userId] }),
  assignments: many(examPaperAssign),
}));

export const examPaperAssignRelations = relations(examPaperAssign, ({ one, many }) => ({
  paper: one(examPaper, { fields: [examPaperAssign.paperId], references: [examPaper.paperId] }),
  candidate: one(sysUser, { fields: [examPaperAssign.userUid], references: [sysUser.userId] }),
  answerRecords: many(examAnswerRecord),
  report: one(examReport),
}));

export const examAnswerRecordRelations = relations(examAnswerRecord, ({ one }) => ({
  assign: one(examPaperAssign, { fields: [examAnswerRecord.assignId], references: [examPaperAssign.assignId] }),
  question: one(examOfficialQuestion, { fields: [examAnswerRecord.questionId], references: [examOfficialQuestion.questionId] }),
}));

export const examReportRelations = relations(examReport, ({ one }) => ({
  assign: one(examPaperAssign, { fields: [examReport.assignId], references: [examPaperAssign.assignId] }),
}));

export const examOfficialQuestionRelations = relations(examOfficialQuestion, ({ one }) => ({
  creator: one(sysUser, { fields: [examOfficialQuestion.createdBy], references: [sysUser.userId] }),
}));
