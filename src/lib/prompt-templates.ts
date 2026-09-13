import "server-only";
import { db } from "@/lib/db";
import { systemPromptTemplate } from "@/storage/database/shared/schema";
import { eq, and } from "drizzle-orm";

interface TemplateRow {
  templateContent: string;
  versionNo: number;
}

const cache = new Map<string, TemplateRow>();

/** 从数据库加载 Prompt 模板，带内存缓存；DB 不可用时返回 null 由调用方走硬编码兜底 */
export async function loadTemplate(templateKey: string): Promise<string | null> {
  if (cache.has(templateKey)) {
    return cache.get(templateKey)!.templateContent;
  }
  try {
    const dbi = await db();
    const rows = await dbi
      .select({ templateContent: systemPromptTemplate.templateContent, versionNo: systemPromptTemplate.versionNo })
      .from(systemPromptTemplate)
      .where(and(eq(systemPromptTemplate.templateKey, templateKey), eq(systemPromptTemplate.isActive, true)))
      .limit(1);
    if (rows.length === 0) return null;
    cache.set(templateKey, rows[0]);
    return rows[0].templateContent;
  } catch {
    return null;
  }
}

/** 加载模板并填充占位符 {{key}} → value */
export async function loadTemplateFilled(
  templateKey: string,
  vars: Record<string, string | number>
): Promise<string | null> {
  const tpl = await loadTemplate(templateKey);
  if (tpl === null) return null;
  let result = tpl;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, String(val));
  }
  return result;
}

/** 清除模板缓存（调试/管理用） */
export function clearTemplateCache() {
  cache.clear();
}