-- 新大陆俱乐部 New World Club —— 业务表初始化（运行时库）
-- 幂等建表：所有 CREATE TABLE IF NOT EXISTS 使用 IF NOT EXISTS，不会清空已有数据

-- 1. sys_user 用户账号主表
CREATE TABLE IF NOT EXISTS sys_user (
  user_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  login_type VARCHAR(20) NOT NULL DEFAULT 'email',
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(32) UNIQUE,
  github_id VARCHAR(128) UNIQUE,
  password_hash VARCHAR(255),
  nickname VARCHAR(64) NOT NULL,
  avatar_url VARCHAR(512),
  civilization_no VARCHAR(32) NOT NULL UNIQUE,
  role VARCHAR(32) NOT NULL DEFAULT 'member',
  profile_completed BOOLEAN NOT NULL DEFAULT false,
  ai_token_balance INTEGER NOT NULL DEFAULT 100,
  in_candidate_pool BOOLEAN NOT NULL DEFAULT false,
  privacy_setting JSONB DEFAULT '{"show_full_seats":false,"authorized_fleets":[],"allow_ai_training":false}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS sys_user_role_idx ON sys_user (role);
CREATE INDEX IF NOT EXISTS sys_user_pool_idx ON sys_user (in_candidate_pool);

-- 2. expedition_question 登舰测试题库表
CREATE TABLE IF NOT EXISTS expedition_question (
  question_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  question_title TEXT NOT NULL,
  question_tag VARCHAR(32) NOT NULL DEFAULT 'explore',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 3. expedition_test_session 登舰测试会话表
CREATE TABLE IF NOT EXISTS expedition_test_session (
  test_session_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL REFERENCES sys_user(user_id),
  session_status VARCHAR(32) NOT NULL DEFAULT 'draft',
  question_list JSONB,
  user_answer_enc TEXT,
  answer_json JSONB,
  llm_raw_response JSONB,
  parse_error_msg TEXT,
  ai_parsed_profile_json JSONB,
  final_eight_dim_json JSONB,
  final_seat_full_score_json JSONB,
  is_passed BOOLEAN NOT NULL DEFAULT false,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS test_session_user_idx ON expedition_test_session (user_id);

-- 4. expedition_passport_snapshot 航行档案快照表（只 insert 不 update）
CREATE TABLE IF NOT EXISTS expedition_passport_snapshot (
  passport_snapshot_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL REFERENCES sys_user(user_id),
  passport_version_no INTEGER NOT NULL,
  snapshot_source_type VARCHAR(32) NOT NULL,
  source_relation_id VARCHAR(36),
  eight_dim_score JSONB NOT NULL DEFAULT '{}'::jsonb,
  cognitive_style_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  seat_full_score JSONB NOT NULL DEFAULT '{}'::jsonb,
  seat_explain_basis JSONB NOT NULL DEFAULT '[]'::jsonb,
  honor_title VARCHAR(32) NOT NULL DEFAULT 'Explorer',
  star_count INTEGER NOT NULL DEFAULT 0,
  apu_credit_sim NUMERIC(12,2) NOT NULL DEFAULT 0,
  mission_count INTEGER NOT NULL DEFAULT 0,
  collaborator_seat_eval_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot_comment TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS passport_user_idx ON expedition_passport_snapshot (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS passport_user_version_idx ON expedition_passport_snapshot (user_id, passport_version_no);

-- 5. mission 航行使命主表
CREATE TABLE IF NOT EXISTS mission (
  mission_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_no VARCHAR(32) NOT NULL UNIQUE,
  mission_name VARCHAR(128) NOT NULL,
  mission_background TEXT,
  mission_goal TEXT NOT NULL,
  mission_tags JSONB DEFAULT '[]'::jsonb,
  must_human_seats JSONB DEFAULT '[]'::jsonb,
  mission_status VARCHAR(32) NOT NULL DEFAULT 'draft',
  current_phase VARCHAR(32),
  creator_user_id VARCHAR(36) NOT NULL REFERENCES sys_user(user_id),
  expect_start_time TIMESTAMPTZ,
  expect_end_time TIMESTAMPTZ,
  final_archive_report_json JSONB,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS mission_creator_idx ON mission (creator_user_id);
CREATE INDEX IF NOT EXISTS mission_status_idx ON mission (mission_status);

-- 6. fleet 舰队表
CREATE TABLE IF NOT EXISTS fleet (
  fleet_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_no VARCHAR(32) NOT NULL UNIQUE,
  mission_id VARCHAR(36) NOT NULL REFERENCES mission(mission_id) ON DELETE CASCADE,
  fleet_commander_user_id VARCHAR(36) NOT NULL REFERENCES sys_user(user_id),
  fleet_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  is_primary BOOLEAN NOT NULL DEFAULT true,
  fleet_generation_log_json JSONB,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS fleet_mission_idx ON fleet (mission_id);

-- 7. fleet_seat_assignment 舰队-21席人员分配表
CREATE TABLE IF NOT EXISTS fleet_seat_assignment (
  assignment_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id VARCHAR(36) NOT NULL REFERENCES fleet(fleet_id) ON DELETE CASCADE,
  seat_name VARCHAR(32) NOT NULL,
  cabin VARCHAR(16) NOT NULL,
  assign_type VARCHAR(16) NOT NULL DEFAULT 'human',
  assigned_user_id VARCHAR(36) REFERENCES sys_user(user_id),
  agent_alias VARCHAR(64),
  match_score INTEGER NOT NULL DEFAULT 0,
  assign_comment TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS seat_assign_fleet_idx ON fleet_seat_assignment (fleet_id);
CREATE INDEX IF NOT EXISTS seat_assign_user_idx ON fleet_seat_assignment (assigned_user_id);

-- 8. mission_phase_output Mission 每阶段产出物表
CREATE TABLE IF NOT EXISTS mission_phase_output (
  output_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id VARCHAR(36) NOT NULL REFERENCES mission(mission_id) ON DELETE CASCADE,
  fleet_id VARCHAR(36) REFERENCES fleet(fleet_id),
  phase_name VARCHAR(32) NOT NULL,
  submit_user_id VARCHAR(36) REFERENCES sys_user(user_id),
  output_title VARCHAR(255),
  output_content_text TEXT,
  attachments_json JSONB DEFAULT '[]'::jsonb,
  phase_status VARCHAR(32) NOT NULL DEFAULT 'draft',
  confirm_user_id VARCHAR(36) REFERENCES sys_user(user_id),
  agent_call_log_id VARCHAR(36),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS phase_output_mission_idx ON mission_phase_output (mission_id);
CREATE INDEX IF NOT EXISTS phase_output_phase_idx ON mission_phase_output (phase_name);

-- 9. ship_intelligence_agent_call_log 舰载智能 Agent 调用日志表
CREATE TABLE IF NOT EXISTS ship_intelligence_agent_call_log (
  call_log_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id VARCHAR(36) REFERENCES mission(mission_id),
  fleet_id VARCHAR(36) REFERENCES fleet(fleet_id),
  agent_name VARCHAR(64) NOT NULL,
  call_trigger_user_id VARCHAR(36) REFERENCES sys_user(user_id),
  user_instruction TEXT,
  agent_input_prompt TEXT,
  llm_model_name VARCHAR(64),
  llm_raw_output TEXT,
  human_operation_type VARCHAR(16),
  human_modify_content TEXT,
  token_consumed_input INTEGER NOT NULL DEFAULT 0,
  token_consumed_output INTEGER NOT NULL DEFAULT 0,
  call_cost_time_ms INTEGER NOT NULL DEFAULT 0,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS agent_log_fleet_idx ON ship_intelligence_agent_call_log (fleet_id);
CREATE INDEX IF NOT EXISTS agent_log_mission_idx ON ship_intelligence_agent_call_log (mission_id);

-- 10. mission_collaborate_feedback Mission 协作反馈表
CREATE TABLE IF NOT EXISTS mission_collaborate_feedback (
  feedback_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id VARCHAR(36) NOT NULL REFERENCES mission(mission_id) ON DELETE CASCADE,
  fleet_id VARCHAR(36) NOT NULL REFERENCES fleet(fleet_id),
  feedback_from_user_id VARCHAR(36) NOT NULL REFERENCES sys_user(user_id),
  feedback_target_user_id VARCHAR(36) NOT NULL REFERENCES sys_user(user_id),
  seat_feedback_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  feedback_summary_text TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS feedback_mission_idx ON mission_collaborate_feedback (mission_id);
CREATE INDEX IF NOT EXISTS feedback_target_idx ON mission_collaborate_feedback (feedback_target_user_id);

-- 11. innovate_trace_export_log 航迹导出记录表
CREATE TABLE IF NOT EXISTS innovate_trace_export_log (
  export_log_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id VARCHAR(36) REFERENCES mission(mission_id),
  export_user_id VARCHAR(36) REFERENCES sys_user(user_id),
  export_format VARCHAR(16) NOT NULL DEFAULT 'json',
  export_content_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trace_export_mission_idx ON innovate_trace_export_log (mission_id);

-- 12. apu_credit_record APU 生产力凭证积分流水表（MVP 模拟）
CREATE TABLE IF NOT EXISTS apu_credit_record (
  credit_record_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL REFERENCES sys_user(user_id),
  mission_id VARCHAR(36) REFERENCES mission(mission_id),
  change_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_after NUMERIC(12,2) NOT NULL DEFAULT 0,
  reason VARCHAR(255),
  evidence_ref VARCHAR(64),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS apu_credit_user_idx ON apu_credit_record (user_id);

-- 13. system_prompt_template 系统 Prompt 模板表
CREATE TABLE IF NOT EXISTS system_prompt_template (
  template_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(64) NOT NULL UNIQUE,
  template_name VARCHAR(128) NOT NULL,
  template_content TEXT NOT NULL,
  version_no INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. system_announcement 系统公告表
CREATE TABLE IF NOT EXISTS system_announcement (
  announcement_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_title VARCHAR(255) NOT NULL,
  announcement_content TEXT NOT NULL,
  notice_level VARCHAR(16) NOT NULL DEFAULT 'info',
  publish_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_by VARCHAR(36) REFERENCES sys_user(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS announcement_publish_idx ON system_announcement (publish_time);

-- 阶段 ID 归一化（旧 -> 新），幂等执行
UPDATE mission_phase_output SET phase_name = 'intel_analysis' WHERE phase_name = 'target_research';
UPDATE mission_phase_output SET phase_name = 'prototype_build' WHERE phase_name IN ('topic_confirm');
UPDATE mission_phase_output SET phase_name = 'trial_voyage' WHERE phase_name = 'test_polish';
UPDATE mission_phase_output SET phase_name = 'maiden_voyage' WHERE phase_name = 'public_preview';
UPDATE mission SET current_phase = 'intel_analysis' WHERE current_phase = 'target_research';
UPDATE mission SET current_phase = 'prototype_build' WHERE current_phase = 'topic_confirm';
UPDATE mission SET current_phase = 'trial_voyage' WHERE current_phase = 'test_polish';
UPDATE mission SET current_phase = 'maiden_voyage' WHERE current_phase = 'public_preview';

-- 放宽人工操作类型列长度（兼容降级标记）
ALTER TABLE ship_intelligence_agent_call_log ALTER COLUMN human_operation_type TYPE VARCHAR(32);
-- ==============================================
-- V2.0 登舰考试（智考）模块 —— 增量新增表（幂等创建，不 DROP，保留考试数据）
-- ==============================================

-- 15. exam_official_question 官方题库表
CREATE TABLE IF NOT EXISTS exam_official_question (
  question_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  question_type VARCHAR(20) NOT NULL DEFAULT 'single',
  options JSONB,
  judge_rule TEXT,
  eight_dim_tags VARCHAR(255) NOT NULL DEFAULT '',
  career21_tags VARCHAR(255) NOT NULL DEFAULT '',
  industry VARCHAR(64) NOT NULL DEFAULT '',
  weight_score INTEGER NOT NULL DEFAULT 5,
  status INTEGER NOT NULL DEFAULT 1,
  created_by VARCHAR(36) REFERENCES sys_user(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exam_q_eight_dim_idx ON exam_official_question (eight_dim_tags);
CREATE INDEX IF NOT EXISTS exam_q_career21_idx ON exam_official_question (career21_tags);
CREATE INDEX IF NOT EXISTS exam_q_status_idx ON exam_official_question (status);
CREATE INDEX IF NOT EXISTS exam_q_industry_idx ON exam_official_question (industry);

-- 16. exam_paper HR生成的企业专属考卷表
CREATE TABLE IF NOT EXISTS exam_paper (
  paper_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(36) NOT NULL REFERENCES sys_user(user_id),
  paper_name VARCHAR(200) NOT NULL,
  demand_json JSONB NOT NULL,
  question_ids JSONB NOT NULL,
  time_limit INTEGER,
  status INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exam_paper_company_idx ON exam_paper (company_id);

-- 17. exam_paper_assign 考卷分发绑定表
CREATE TABLE IF NOT EXISTS exam_paper_assign (
  assign_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id VARCHAR(36) NOT NULL REFERENCES exam_paper(paper_id),
  user_uid VARCHAR(36) NOT NULL REFERENCES sys_user(user_id),
  assign_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  submit_time TIMESTAMPTZ,
  report_id VARCHAR(36),
  status INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exam_assign_uid_idx ON exam_paper_assign (user_uid);
CREATE INDEX IF NOT EXISTS exam_assign_paper_idx ON exam_paper_assign (paper_id);

-- 18. exam_answer_record 应聘者单题作答记录表
CREATE TABLE IF NOT EXISTS exam_answer_record (
  record_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  assign_id VARCHAR(36) NOT NULL REFERENCES exam_paper_assign(assign_id),
  question_id VARCHAR(36) NOT NULL REFERENCES exam_official_question(question_id),
  user_answer TEXT,
  is_draft BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exam_answer_assign_idx ON exam_answer_record (assign_id);

-- 19. exam_report 测评报告结果表
CREATE TABLE IF NOT EXISTS exam_report (
  report_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  assign_id VARCHAR(36) NOT NULL REFERENCES exam_paper_assign(assign_id),
  eight_dim_score JSONB NOT NULL,
  career21_result JSONB NOT NULL,
  risk_tip TEXT,
  final_suggest VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exam_report_assign_idx ON exam_report (assign_id);
-- 20. demo_preset_snapshot 对照演示模式预置档案表（V1.0 C6.4）
CREATE TABLE IF NOT EXISTS demo_preset_snapshot (
  preset_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_label VARCHAR(20) NOT NULL,
  preset_name VARCHAR(100) NOT NULL,
  eight_dim_score JSONB NOT NULL,
  seat_full_score JSONB NOT NULL,
  cognitive_style_tags VARCHAR(200),
  honor_title VARCHAR(50),
  star_count INTEGER DEFAULT 0,
  mission_count INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS demo_preset_label_idx ON demo_preset_snapshot (preset_label);
