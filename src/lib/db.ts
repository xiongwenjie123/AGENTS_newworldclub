import "server-only";
import * as schema from "@/storage/database/shared/schema";

export type DB = import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema>;

let dbPromise: Promise<DB> | null = null;
let pgliteInstance: any = null;
let pglitePromise: Promise<any> | null = null;

async function getPglite(): Promise<any> {
  if (!pglitePromise) {
    pglitePromise = (async () => {
      const { PGlite } = await import("@electric-sql/pglite");
      const pglite = new PGlite("memory://");
      await pglite.waitReady;
      pgliteInstance = pglite;
      return pglite;
    })();
  }
  return pglitePromise;
}

async function createPgliteDb(): Promise<DB> {
  const { drizzle } = await import("drizzle-orm/pglite");
  const pglite = await getPglite();
  const drizzleDb = drizzle(pglite, { schema });
  return drizzleDb as unknown as DB;
}

async function createSdkDb(): Promise<DB> {
  const { getDb } = await import("coze-coding-dev-sdk");
  return getDb(schema) as Promise<DB>;
}

export async function db(): Promise<DB> {
  if (!dbPromise) {
    const hasDbUrl = !!process.env.PGDATABASE_URL;
    dbPromise = hasDbUrl ? createSdkDb() : createPgliteDb();
  }
  return dbPromise;
}

export async function dbClient() {
  if (!process.env.PGDATABASE_URL) {
    return getPglite();
  }
  const { getClient } = await import("coze-coding-dev-sdk");
  return getClient();
}

export { schema };
