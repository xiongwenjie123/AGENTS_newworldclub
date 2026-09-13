import {
  pgTable,
  serial,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  numeric,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// 宽松 JSON 列类型（仅本文件使用一次 any，避免到处收窄）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyJson = any;
const objJson = (name: string) => jsonb(name).$type<AnyJson>();

const ts = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "string" }).notNull().defaultNow();

// 0. 健康检查
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

// 1. sys_user 用户账号主表
export const sysUser = pgTable(
  "sys_user",
  {
    userId: varchar("user_id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    loginType: varchar("login_type", { length: 20 }).notNull().default("email"),
    email: varchar("email", { length: 255 }).unique(),
    phone: varchar("phone", { length: 32 }).unique(),
    githubId: varchar("github_id", { length: 128 }).unique(),
    passwordHash: varchar("password_hash", { length: 255 }),
    nickname: varchar("nickname", { length: 64 }).notNull(),
    avatarUrl: varchar("avatar_url", { length: 512 }),
    civilizationNo: varchar("civilization_no", { length: 32 }).notNull().unique(),
    role: varchar("role", { length: 32 }).notNull().default("member"),
    profileCompleted: boolean("profile_completed").notNull().default(false),
    aiTokenBalance: integer("ai_token_balance").notNull().default(100),
    inCandidatePool: boolean("in_candidate_pool").notNull().default(false),
    privacySetting: objJson("privacy_setting"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [index("sys_user_role_idx").on(t.role), index("sys_user_pool_idx").on(t.inCandidatePool)]
);

// 2. expedition_question 登舰测试题库表
export const expeditionQuestion = pgTable("expedition_question", {
  questionId: varchar("question_id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  questionTitle: text("question_title").notNull(),
  questionTag: varchar("question_tag", { length: 32 }).notNull().default("explore"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
});

// 3. expedition_test_session 登舰测试会话表
export const expeditionTestSession = pgTable("expedition_test_session", {
  testSessionId: varchar("test_session_id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => sysUser.userId),
  sessionStatus: varchar("session_status", { length: 32 }).notNull().default("draft"),
  questionList: objJson("question_list"),
  userAnswerEnc: text("user_answer_enc"),
  answerJson: objJson("answer_json"),
  llmRawResponse: objJson("llm_raw_response"),
  parseErrorMsg: text("parse_error_msg"),
  aiParsedProfileJson: objJson("ai_parsed_profile_json"),
  finalEightDimJson: objJson("final_eight_dim_json"),
  finalSeatFullScoreJson: objJson("final_seat_full_score_json"),
  isPassed: boolean("is_passed").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
});

// 4. expedition_passport_snapshot 航行档案快照表（只 insert 不 update）
export const expeditionPassportSnapshot = pgTable(
  "expedition_passport_snapshot",
  {
    passportSnapshotId: varchar("passport_snapshot_id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => sysUser.userId),
    passportVersionNo: integer("passport_version_no").notNull(),
    snapshotSourceType: varchar("snapshot_source_type", { length: 32 }).notNull(),
    sourceRelationId: varchar("source_relation_id", { length: 36 }),
    eightDimScore: objJson("eight_dim_score").notNull(),
    cognitiveStyleTags: objJson("cognitive_style_tags").notNull(),
    seatFullScore: objJson("seat_full_score").notNull(),
    seatExplainBasis: objJson("seat_explain_basis").notNull(),
    honorTitle: varchar("honor_title", { length: 32 }).notNull().default("Explorer"),
    starCount: integer("star_count").notNull().default(0),
    apuCreditSim: numeric("apu_credit_sim", { precision: 12, scale: 2 }).notNull().default("0"),
    missionCount: integer("mission_count").notNull().default(0),
    collaboratorSeatEvalJson: objJson("collaborator_seat_eval_json").notNull(),
    snapshotComment: text("snapshot_comment"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [
    index("passport_user_idx").on(t.userId),
    uniqueIndex("passport_user_version_idx").on(t.userId, t.passportVersionNo),
  ]
);

// 5. mission 航行使命主表
export const mission = pgTable(
  "mission",
  {
    missionId: varchar("mission_id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    missionNo: varchar("mission_no", { length: 32 }).notNull().unique(),
    missionName: varchar("mission_name", { length: 128 }).notNull(),
    missionBackground: text("mission_background"),
    missionGoal: text("mission_goal").notNull(),
    missionTags: objJson("mission_tags"),
    mustHumanSeats: objJson("must_human_seats"),
    missionStatus: varchar("mission_status", { length: 32 }).notNull().default("draft"),
    currentPhase: varchar("current_phase", { length: 32 }),
    creatorUserId: varchar("creator_user_id", { length: 36 })
      .notNull()
      .references(() => sysUser.userId),
    expectStartTime: timestamp("expect_start_time", { withTimezone: true, mode: "string" }),
    expectEndTime: timestamp("expect_end_time", { withTimezone: true, mode: "string" }),
    finalArchiveReportJson: objJson("final_archive_report_json"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [
    index("mission_creator_idx").on(t.creatorUserId),
    index("mission_status_idx").on(t.missionStatus),
  ]
);

// 6. fleet 舰队表
export const fleet = pgTable(
  "fleet",
  {
    fleetId: varchar("fleet_id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    fleetNo: varchar("fleet_no", { length: 32 }).notNull().unique(),
    missionId: varchar("mission_id", { length: 36 })
      .notNull()
      .references(() => mission.missionId, { onDelete: "cascade" }),
    fleetCommanderUserId: varchar("fleet_commander_user_id", { length: 36 })
      .notNull()
      .references(() => sysUser.userId),
    fleetStatus: varchar("fleet_status", { length: 32 }).notNull().default("pending"),
    isPrimary: boolean("is_primary").notNull().default(true),
    fleetGenerationLogJson: objJson("fleet_generation_log_json"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [index("fleet_mission_idx").on(t.missionId)]
);

// 7. fleet_seat_assignment 舰队-21席人员分配表
export const fleetSeatAssignment = pgTable(
  "fleet_seat_assignment",
  {
    assignmentId: varchar("assignment_id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    fleetId: varchar("fleet_id", { length: 36 })
      .notNull()
      .references(() => fleet.fleetId, { onDelete: "cascade" }),
    seatName: varchar("seat_name", { length: 32 }).notNull(),
    cabin: varchar("cabin", { length: 16 }).notNull(),
    assignType: varchar("assign_type", { length: 16 }).notNull().default("human"),
    assignedUserId: varchar("assigned_user_id", { length: 36 }).references(() => sysUser.userId),
    agentAlias: varchar("agent_alias", { length: 64 }),
    matchScore: integer("match_score").notNull().default(0),
    assignComment: text("assign_comment"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [
    index("seat_assign_fleet_idx").on(t.fleetId),
    index("seat_assign_user_idx").on(t.assignedUserId),
  ]
);

// 8. mission_phase_output Mission 每阶段产出物表
export const missionPhaseOutput = pgTable(
  "mission_phase_output",
  {
    outputId: varchar("output_id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    missionId: varchar("mission_id", { length: 36 })
      .notNull()
      .references(() => mission.missionId, { onDelete: "cascade" }),
    fleetId: varchar("fleet_id", { length: 36 }).references(() => fleet.fleetId),
    phaseName: varchar("phase_name", { length: 32 }).notNull(),
    submitUserId: varchar("submit_user_id", { length: 36 }).references(() => sysUser.userId),
    outputTitle: varchar("output_title", { length: 255 }),
    outputContentText: text("output_content_text"),
    attachmentsJson: objJson("attachments_json"),
    phaseStatus: varchar("phase_status", { length: 32 }).notNull().default("draft"),
    confirmUserId: varchar("confirm_user_id", { length: 36 }).references(() => sysUser.userId),
    agentCallLogId: varchar("agent_call_log_id", { length: 36 }),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [
    index("phase_output_mission_idx").on(t.missionId),
    index("phase_output_phase_idx").on(t.phaseName),
  ]
);

// 9. ship_intelligence_agent_call_log 舰载智能 Agent 调用日志表
export const shipIntelligenceAgentCallLog = pgTable(
  "ship_intelligence_agent_call_log",
  {
    callLogId: varchar("call_log_id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    missionId: varchar("mission_id", { length: 36 }).references(() => mission.missionId),
    fleetId: varchar("fleet_id", { length: 36 }).references(() => fleet.fleetId),
    agentName: varchar("agent_name", { length: 64 }).notNull(),
    callTriggerUserId: varchar("call_trigger_user_id", { length: 36 }).references(
      () => sysUser.userId
    ),
    userInstruction: text("user_instruction"),
    agentInputPrompt: text("agent_input_prompt"),
    llmModelName: varchar("llm_model_name", { length: 64 }),
    llmRawOutput: text("llm_raw_output"),
    humanOperationType: varchar("human_operation_type", { length: 32 }),
    humanModifyContent: text("human_modify_content"),
    tokenConsumedInput: integer("token_consumed_input").notNull().default(0),
    tokenConsumedOutput: integer("token_consumed_output").notNull().default(0),
    callCostTimeMs: integer("call_cost_time_ms").notNull().default(0),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [
    index("agent_log_fleet_idx").on(t.fleetId),
    index("agent_log_mission_idx").on(t.missionId),
  ]
);

// 10. mission_collaborate_feedback Mission 协作反馈表
export const missionCollaborateFeedback = pgTable(
  "mission_collaborate_feedback",
  {
    feedbackId: varchar("feedback_id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    missionId: varchar("mission_id", { length: 36 })
      .notNull()
      .references(() => mission.missionId, { onDelete: "cascade" }),
    fleetId: varchar("fleet_id", { length: 36 })
      .notNull()
      .references(() => fleet.fleetId),
    feedbackFromUserId: varchar("feedback_from_user_id", { length: 36 })
      .notNull()
      .references(() => sysUser.userId),
    feedbackTargetUserId: varchar("feedback_target_user_id", { length: 36 })
      .notNull()
      .references(() => sysUser.userId),
    seatFeedbackJson: objJson("seat_feedback_json").notNull(),
    feedbackSummaryText: text("feedback_summary_text"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [
    index("feedback_mission_idx").on(t.missionId),
    index("feedback_target_idx").on(t.feedbackTargetUserId),
  ]
);

// 11. innovate_trace_export_log 航迹导出记录表
export const innovateTraceExportLog = pgTable(
  "innovate_trace_export_log",
  {
    exportLogId: varchar("export_log_id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    missionId: varchar("mission_id", { length: 36 }).references(() => mission.missionId),
    exportUserId: varchar("export_user_id", { length: 36 }).references(() => sysUser.userId),
    exportFormat: varchar("export_format", { length: 16 }).notNull().default("json"),
    exportContentJson: objJson("export_content_json"),
    createdAt: ts("created_at"),
  },
  (t) => [index("trace_export_mission_idx").on(t.missionId)]
);

// 12. apu_credit_record APU 生产力凭证积分流水表（MVP 模拟）
export const apuCreditRecord = pgTable(
  "apu_credit_record",
  {
    creditRecordId: varchar("credit_record_id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => sysUser.userId),
    missionId: varchar("mission_id", { length: 36 }).references(() => mission.missionId),
    changeAmount: numeric("change_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    balanceAfter: numeric("balance_after", { precision: 12, scale: 2 }).notNull().default("0"),
    reason: varchar("reason", { length: 255 }),
    evidenceRef: varchar("evidence_ref", { length: 64 }),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: ts("created_at"),
  },
  (t) => [index("apu_credit_user_idx").on(t.userId)]
);

// 13. system_prompt_template 系统 Prompt 模板表
export const systemPromptTemplate = pgTable("system_prompt_template", {
  templateId: varchar("template_id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  templateKey: varchar("template_key", { length: 64 }).notNull().unique(),
  templateName: varchar("template_name", { length: 128 }).notNull(),
  templateContent: text("template_content").notNull(),
  versionNo: integer("version_no").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

// 14. system_announcement 系统公告表
export const systemAnnouncement = pgTable(
  "system_announcement",
  {
    announcementId: varchar("announcement_id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    announcementTitle: varchar("announcement_title", { length: 255 }).notNull(),
    announcementContent: text("announcement_content").notNull(),
    noticeLevel: varchar("notice_level", { length: 16 }).notNull().default("info"),
    publishTime: timestamp("publish_time", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdBy: varchar("created_by", { length: 36 }).references(() => sysUser.userId),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [index("announcement_publish_idx").on(t.publishTime)]
);

// 业务表类型导出
export type SysUser = typeof sysUser.$inferSelect;
export type PassportSnapshot = typeof expeditionPassportSnapshot.$inferSelect;
export type Mission = typeof mission.$inferSelect;
export type Fleet = typeof fleet.$inferSelect;
export type FleetSeatAssignment = typeof fleetSeatAssignment.$inferSelect;
export type MissionPhaseOutput = typeof missionPhaseOutput.$inferSelect;
export type AgentCallLog = typeof shipIntelligenceAgentCallLog.$inferSelect;
// ==============================================
// V2.0 登舰考试（智考）模块 —— 增量新增表（不修改 V1.0 表）
// ==============================================

// 15. exam_official_question 官方题库表
export const examOfficialQuestion = pgTable(
  "exam_official_question",
  {
    questionId: varchar("question_id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    questionType: varchar("question_type", { length: 20 }).notNull().default("single"),
    options: objJson("options"),
    judgeRule: text("judge_rule"),
    eightDimTags: varchar("eight_dim_tags", { length: 255 }).notNull().default(""),
    career21Tags: varchar("career21_tags", { length: 255 }).notNull().default(""),
    industry: varchar("industry", { length: 64 }).notNull().default(""),
    weightScore: integer("weight_score").notNull().default(5),
    status: integer("status").notNull().default(1),
    createdBy: varchar("created_by", { length: 36 }).references(() => sysUser.userId),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
  },
  (t) => [
    index("exam_q_eight_dim_idx").on(t.eightDimTags),
    index("exam_q_career21_idx").on(t.career21Tags),
    index("exam_q_status_idx").on(t.status),
    index("exam_q_industry_idx").on(t.industry),
  ]
);

// 16. exam_paper HR生成的企业专属考卷表
export const examPaper = pgTable(
  "exam_paper",
  {
    paperId: varchar("paper_id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyId: varchar("company_id", { length: 36 })
      .notNull()
      .references(() => sysUser.userId),
    paperName: varchar("paper_name", { length: 200 }).notNull(),
    demandJson: objJson("demand_json").notNull(),
    questionIds: objJson("question_ids").notNull(),
    timeLimit: integer("time_limit"),
    status: integer("status").notNull().default(1),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
  },
  (t) => [index("exam_paper_company_idx").on(t.companyId)]
);

// 17. exam_paper_assign 考卷分发绑定表
export const examPaperAssign = pgTable(
  "exam_paper_assign",
  {
    assignId: varchar("assign_id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    paperId: varchar("paper_id", { length: 36 })
      .notNull()
      .references(() => examPaper.paperId),
    userUid: varchar("user_uid", { length: 36 })
      .notNull()
      .references(() => sysUser.userId),
    assignTime: timestamp("assign_time", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    submitTime: timestamp("submit_time", { withTimezone: true, mode: "string" }),
    reportId: varchar("report_id", { length: 36 }),
    status: integer("status").notNull().default(0),
    createdAt: ts("created_at"),
  },
  (t) => [
    index("exam_assign_uid_idx").on(t.userUid),
    index("exam_assign_paper_idx").on(t.paperId),
  ]
);

// 18. exam_answer_record 应聘者单题作答记录表
export const examAnswerRecord = pgTable(
  "exam_answer_record",
  {
    recordId: varchar("record_id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    assignId: varchar("assign_id", { length: 36 })
      .notNull()
      .references(() => examPaperAssign.assignId),
    questionId: varchar("question_id", { length: 36 })
      .notNull()
      .references(() => examOfficialQuestion.questionId),
    userAnswer: text("user_answer"),
    isDraft: boolean("is_draft").notNull().default(true),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
  },
  (t) => [index("exam_answer_assign_idx").on(t.assignId)]
);

// 19. exam_report 测评报告结果表
export const examReport = pgTable(
  "exam_report",
  {
    reportId: varchar("report_id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    assignId: varchar("assign_id", { length: 36 })
      .notNull()
      .references(() => examPaperAssign.assignId),
    eightDimScore: objJson("eight_dim_score").notNull(),
    career21Result: objJson("career21_result").notNull(),
    riskTip: text("risk_tip"),
    finalSuggest: varchar("final_suggest", { length: 500 }),
    createdAt: ts("created_at"),
  },
  (t) => [index("exam_report_assign_idx").on(t.assignId)]
);

// V2.0 类型导出
export type ExamOfficialQuestion = typeof examOfficialQuestion.$inferSelect;
export type ExamPaper = typeof examPaper.$inferSelect;
export type ExamPaperAssign = typeof examPaperAssign.$inferSelect;
export type ExamAnswerRecord = typeof examAnswerRecord.$inferSelect;
export type ExamReport = typeof examReport.$inferSelect;
// 20. demo_preset_snapshot 对照演示模式预置档案表（V1.0 C6.4）
export const demoPresetSnapshot = pgTable(
  "demo_preset_snapshot",
  {
    presetId: varchar("preset_id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    presetLabel: varchar("preset_label", { length: 20 }).notNull(),
    presetName: varchar("preset_name", { length: 100 }).notNull(),
    eightDimScore: objJson("eight_dim_score").notNull(),
    seatFullScore: objJson("seat_full_score").notNull(),
    cognitiveStyleTags: varchar("cognitive_style_tags", { length: 200 }),
    honorTitle: varchar("honor_title", { length: 50 }),
    starCount: integer("star_count").default(0),
    missionCount: integer("mission_count").default(0),
    description: text("description"),
    createdAt: ts("created_at"),
  },
  (t) => [uniqueIndex("demo_preset_label_idx").on(t.presetLabel)]
);

export type DemoPresetSnapshot = typeof demoPresetSnapshot.$inferSelect;
