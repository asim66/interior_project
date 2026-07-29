import { createClient } from "@libsql/client";

const LEDGER_ID = "studio-ledger";

function getClient() {
  const url = process.env.TURSO_DATABASE_URL || "file:.wrangler/studio_ledger.db";
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
  return createClient({ url, authToken });
}

async function ensureSchema(client: ReturnType<typeof getClient>) {
  await client.batch([
    `CREATE TABLE IF NOT EXISTS ledger_state (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS ledger_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ledger_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      action TEXT NOT NULL,
      actor_email TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS ledger_audit_ledger_idx ON ledger_audit(ledger_id, version)`
  ], "write");
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
    const client = getClient();
    await ensureSchema(client);

    if (method === "GET") {
      const rs = await client.execute({
        sql: "SELECT data, version, updated_at, updated_by FROM ledger_state WHERE id = ?",
        args: [LEDGER_ID]
      });

      if (rs.rows.length === 0) {
        return new Response(JSON.stringify({ data: null, version: 0 }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      const row = rs.rows[0];
      const dataStr = String(row.data);
      const data = dataStr ? JSON.parse(dataStr) : null;

      return new Response(JSON.stringify({
        data,
        version: Number(row.version) || 1,
        updatedAt: String(row.updated_at),
        updatedBy: String(row.updated_by)
      }), {
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
      const payload = JSON.stringify(body.data);

      // Check current version
      const checkRs = await client.execute({
        sql: "SELECT version FROM ledger_state WHERE id = ?",
        args: [LEDGER_ID]
      });

      const currentVersion = checkRs.rows.length > 0 ? Number(checkRs.rows[0].version) : 0;

      if (currentVersion > 0 && expected !== 0 && currentVersion !== expected) {
        return new Response(JSON.stringify({
          error: "Ledger changed in another session",
          version: currentVersion
        }), {
          status: 409,
          headers: corsHeaders,
        });
      }

      const nextVersion = currentVersion + 1;
      const now = new Date().toISOString();

      if (currentVersion === 0) {
        await client.execute({
          sql: "INSERT INTO ledger_state (id, data, version, updated_at, updated_by) VALUES (?, ?, ?, ?, ?)",
          args: [LEDGER_ID, payload, 1, now, actor]
        });
      } else {
        await client.execute({
          sql: "UPDATE ledger_state SET data = ?, version = ?, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?",
          args: [payload, nextVersion, now, actor, LEDGER_ID, currentVersion]
        });
      }

      await client.execute({
        sql: "INSERT INTO ledger_audit (ledger_id, version, action, actor_email) VALUES (?, ?, ?, ?)",
        args: [LEDGER_ID, nextVersion, currentVersion === 0 ? "created" : "updated", actor]
      });

      return new Response(JSON.stringify({ ok: true, version: nextVersion }), {
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
