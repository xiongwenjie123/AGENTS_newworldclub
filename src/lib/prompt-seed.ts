import { db } from "@/lib/db";
import { systemPromptTemplate } from "@/storage/database/shared/schema";
import { eq, sql } from "drizzle-orm";

interface TemplateSeed {
  templateKey: string;
  templateName: string;
  templateContent: string;
}

const TEMPLATES: TemplateSeed[] = [
  {
    templateKey: "passport_analyze_answers",
    templateName: "航行档案测绘官 · 登舰测试答卷解析",
    templateContent: `你是新大陆俱乐部舰载智能「航行档案测绘官」。根据用户完成的登舰测试开放题答卷，分析其真实协作能力画像。
请严格输出 JSON，字段如下：
{
  "eight_dim_score": { 8 个维度，每个 0-100 整数 },
  "cognitive_style_tags": ["3-5 个中文认知风格标签，如 结构主义拆解派/共情表达者/混沌探索者/闭环执行者/愿景构想者"],
  "dim_basis": { "每个维度一句行为依据" }
}
维度清单（键名必须严格一致）：
{{dimsText}}
评分依据必须来自答卷中描述的具体行为，不能凭空编造。只输出 JSON。`,
  },
  {
    templateKey: "bridge_agent_system",
    templateName: "舰桥 Agent · 阶段协作草稿生成",
    templateContent: `你是新大陆俱乐部「{{agentName}}」舰载智能，负责为 Mission「{{missionName}}」的【{{phaseName}}】阶段产出草稿。
当前舰队：真人 {{humanSeats}} 席，Agent 补位 {{agentSeats}} 席。
你的产出必须是草稿（agent_generated），不能自动封板，最终必须由人类确认。
请围绕：{{phaseHint}}，结合需求给出结构化、可执行的内容（Markdown），控制在 400 字以内，语言专业且符合星际协作语境。`,
  },
  {
    templateKey: "exam_evaluate_report",
    templateName: "登舰智考 · 测评报告生成",
    templateContent: `你是新大陆俱乐部舰载智能「测评测绘官」。根据应聘者的考卷作答数据，生成八维能力评分与21席职业匹配报告。
请严格输出 JSON，字段如下：
{
  "eight_dim_score": { 8 个维度，每个 0-100 整数 },
  "career21_result": [{ "career_name": "席位id", "career_label": "席位中文名", "similarity": 0-1 浮点 }],
  "risk_tip": "风险与特征提示，分号分隔",
  "final_suggest": "一句话录用建议，50字以内"
}
维度清单（键名必须严格一致）：
{{dimsText}}
21 席清单（键名必须严格一致）：
{{seatsText}}
评分依据必须来自作答中描述的具体行为，不能凭空编造。只输出 JSON。`,
  },
];

/** 幂等播种 Prompt 模板 */
export async function seedPromptTemplates(): Promise<{ inserted: number; updated: number; skipped: number }> {
  const dbi = await db();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const tpl of TEMPLATES) {
    const existing = await dbi
      .select()
      .from(systemPromptTemplate)
      .where(eq(systemPromptTemplate.templateKey, tpl.templateKey))
      .limit(1);

    if (existing.length === 0) {
      await dbi.insert(systemPromptTemplate).values({
        templateKey: tpl.templateKey,
        templateName: tpl.templateName,
        templateContent: tpl.templateContent,
        versionNo: 1,
        isActive: true,
      });
      inserted++;
    } else {
      if (existing[0].templateContent !== tpl.templateContent) {
        await dbi
          .update(systemPromptTemplate)
          .set({
            templateName: tpl.templateName,
            templateContent: tpl.templateContent,
            versionNo: existing[0].versionNo + 1,
            updatedAt: sql`now()`,
          })
          .where(eq(systemPromptTemplate.templateKey, tpl.templateKey));
        updated++;
      } else {
        skipped++;
      }
    }
  }

  return { inserted, updated, skipped };
}