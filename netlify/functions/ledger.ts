import { getStore } from "@netlify/blobs";
import { createClient } from "@libsql/client";

const LEDGER_KEY = "studio-ledger-main";

interface LedgerRecord {
  data: unknown;
  version: number;
  updatedAt: string;
  updatedBy: string;
}

let localMemoryRecord: LedgerRecord | null = null;

async function getLedgerRecord(): Promise<LedgerRecord | null> {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl) {
    try {
      const client = createClient({
        url: tursoUrl,
        authToken: process.env.TURSO_AUTH_TOKEN
      });
      await client.execute(`CREATE TABLE IF NOT EXISTS ledger_state (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT NOT NULL
      )`);
      const rs = await client.execute({
        sql: "SELECT data, version, updated_at, updated_by FROM ledger_state WHERE id = 'studio-ledger'",
        args: []
      });
      if (rs.rows.length === 0) return null;
      const row = rs.rows[0];
      return {
        data: JSON.parse(String(row.data)),
        version: Number(row.version) || 1,
        updatedAt: String(row.updated_at),
        updatedBy: String(row.updated_by)
      };
    } catch (e) {
      console.error("Turso SQLite fetch error:", e);
    }
  }

  // Netlify Blobs (Built-in global cloud storage on Netlify)
  try {
    const store = getStore("ledger");
    const record = await store.get(LEDGER_KEY, { type: "json" }) as LedgerRecord | null;
    if (record && record.data) return record;
  } catch (e) {
    // Local dev fallback
  }

  return localMemoryRecord;
}

async function saveLedgerRecord(data: unknown, expectedVersion: number, actorName: string): Promise<{ ok: boolean; version: number; error?: string }> {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl) {
    try {
      const client = createClient({
        url: tursoUrl,
        authToken: process.env.TURSO_AUTH_TOKEN
      });
      await client.execute(`CREATE TABLE IF NOT EXISTS ledger_state (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT NOT NULL
      )`);
      const rs = await client.execute({
        sql: "SELECT version FROM ledger_state WHERE id = 'studio-ledger'",
        args: []
      });
      const currentVersion = rs.rows.length > 0 ? Number(rs.rows[0].version) : 0;
      if (currentVersion > 0 && expectedVersion !== 0 && currentVersion !== expectedVersion) {
        return { ok: false, version: currentVersion, error: "Ledger changed in another session" };
      }
      const nextVersion = currentVersion + 1;
      const now = new Date().toISOString();
      const payload = JSON.stringify(data);
      if (currentVersion === 0) {
        await client.execute({
          sql: "INSERT INTO ledger_state (id, data, version, updated_at, updated_by) VALUES ('studio-ledger', ?, 1, ?, ?)",
          args: [payload, now, actorName]
        });
      } else {
        await client.execute({
          sql: "UPDATE ledger_state SET data = ?, version = ?, updated_at = ?, updated_by = ? WHERE id = 'studio-ledger'",
          args: [payload, nextVersion, now, actorName]
        });
      }
      return { ok: true, version: currentVersion === 0 ? 1 : nextVersion };
    } catch (e: any) {
      console.error("Turso SQLite save error:", e);
    }
  }

  // Netlify Blobs (Built-in global cloud storage on Netlify)
  try {
    const store = getStore("ledger");
    const current = await store.get(LEDGER_KEY, { type: "json" }) as LedgerRecord | null;
    const currentVersion = current ? Number(current.version) || 1 : 0;
    if (currentVersion > 0 && expectedVersion !== 0 && currentVersion !== expectedVersion) {
      return { ok: false, version: currentVersion, error: "Ledger changed in another session" };
    }
    const nextVersion = currentVersion === 0 ? 1 : currentVersion + 1;
    const newRecord: LedgerRecord = {
      data,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
      updatedBy: actorName
    };
    await store.setJSON(LEDGER_KEY, newRecord);
    localMemoryRecord = newRecord;
    return { ok: true, version: nextVersion };
  } catch (e: any) {
    // Local dev fallback
    const currentVersion = localMemoryRecord ? localMemoryRecord.version : 0;
    const nextVersion = currentVersion + 1;
    localMemoryRecord = {
      data,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
      updatedBy: actorName
    };
    return { ok: true, version: nextVersion };
  }
}

export default async (request: Request) => {
  const method = request.method.toUpperCase();
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Content-Type": "application/json",
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (method === "GET") {
      const record = await getLedgerRecord();
      if (!record) {
        return new Response(JSON.stringify({ data: null, version: 0 }), {
          status: 200,
          headers: corsHeaders,
        });
      }
      return new Response(JSON.stringify(record), {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (method === "PUT") {
      const body = await request.json() as { data?: unknown; expectedVersion?: number; actorName?: string };
      if (!body.data || typeof body.data !== "object") {
        return new Response(JSON.stringify({ error: "Invalid ledger payload" }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const expected = Number(body.expectedVersion) || 0;
      const actor = body.actorName || "Studio Member";
      const result = await saveLedgerRecord(body.data, expected, actor);

      if (!result.ok) {
        return new Response(JSON.stringify({ error: result.error, version: result.version }), {
          status: 409,
          headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({ ok: true, version: result.version }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
