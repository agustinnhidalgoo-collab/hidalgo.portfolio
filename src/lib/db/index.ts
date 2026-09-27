import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

/**
 * Esquema SQL. Se aplica de forma idempotente al primer acceso, así no hace
 * falta correr migraciones a mano en un proyecto de un solo administrador.
 */
const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'draft',
    featured INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    draft TEXT NOT NULL,
    published TEXT,
    published_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    blur TEXT,
    variants TEXT NOT NULL DEFAULT '[]',
    alt TEXT NOT NULL DEFAULT '{"es":"","en":""}',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS projects_order_idx ON projects (sort_order)`,
];

type DB = LibSQLDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __hidalgoClient?: Client;
  __hidalgoDb?: DB;
  __hidalgoReady?: Promise<void>;
};

function createDbClient(): Client {
  const url = process.env.DATABASE_URL || "file:./data/hidalgo.db";
  if (url.startsWith("file:")) {
    const filePath = url.slice("file:".length);
    fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  }
  return createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
}

export async function getDb(): Promise<DB> {
  if (!globalForDb.__hidalgoClient) {
    globalForDb.__hidalgoClient = createDbClient();
    globalForDb.__hidalgoDb = drizzle(globalForDb.__hidalgoClient, { schema });
  }
  if (!globalForDb.__hidalgoReady) {
    const client = globalForDb.__hidalgoClient;
    globalForDb.__hidalgoReady = (async () => {
      for (const sql of MIGRATIONS) await client.execute(sql);
    })().catch((err) => {
      globalForDb.__hidalgoReady = undefined;
      throw err;
    });
  }
  await globalForDb.__hidalgoReady;
  return globalForDb.__hidalgoDb!;
}

export function getRawClient(): Client {
  if (!globalForDb.__hidalgoClient) {
    globalForDb.__hidalgoClient = createDbClient();
    globalForDb.__hidalgoDb = drizzle(globalForDb.__hidalgoClient, { schema });
  }
  return globalForDb.__hidalgoClient;
}

export { schema };
