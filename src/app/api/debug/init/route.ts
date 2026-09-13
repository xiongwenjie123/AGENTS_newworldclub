import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db, dbClient, schema } from "@/lib/db";
import { seedPromptTemplates } from "@/lib/prompt-seed";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const sqlPath = join(process.cwd(), "scripts", "init-db.sql");
    const raw = readFileSync(sqlPath, "utf8");
    const statements = raw
      .split(";\n")
      .map((s) =>
        s
          .split("\n")
          .filter((l) => !l.trim().startsWith("--"))
          .join("\n")
          .trim()
      )
      .filter((s) => s.length > 0);

    const client = await dbClient();
    let applied = 0;
    const isPglite = !process.env.PGDATABASE_URL;
    try {
      for (const stmt of statements) {
        await (client as { query: (s: string) => Promise<unknown> }).query(stmt);
        applied++;
      }
    } finally {
      if (!isPglite && typeof (client as { release?: () => void }).release === "function") {
        (client as { release: () => void }).release();
      }
    }

    const dbi = await db();
    const res: unknown = await dbi.execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );
    const tables = (res as { rows: { table_name: string }[] }).rows.map((r) => r.table_name);

    let promptSeeded: { inserted: number; updated: number; skipped: number } | null = null;
    try {
      promptSeeded = await seedPromptTemplates();
    } catch {
      // 表可能尚未建好，忽略
    }

    return NextResponse.json({ ok: true, applied, tables, promptSeeded });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
