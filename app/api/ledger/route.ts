import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic="force-dynamic";
const LEDGER_ID="studio-ledger";

async function ensureSchema(){
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS ledger_state (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS ledger_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ledger_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      action TEXT NOT NULL,
      actor_email TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS ledger_audit_ledger_idx ON ledger_audit(ledger_id, version)")
  ]);
}

async function actorEmail(){
  const user=await getChatGPTUser();
  if(user)return user.email;
  if(process.env.NODE_ENV!=="production")return "local-preview@studio-ledger";
  return null;
}

export async function GET(){
  const actor=await actorEmail();
  if(!actor)return NextResponse.json({error:"Authentication required"},{status:401});
  await ensureSchema();
  const row=await env.DB.prepare("SELECT data, version, updated_at, updated_by FROM ledger_state WHERE id = ?")
    .bind(LEDGER_ID).first<{data:string;version:number;updated_at:string;updated_by:string}>();
  return NextResponse.json(row?{
    data:JSON.parse(row.data),version:row.version,updatedAt:row.updated_at,updatedBy:row.updated_by
  }:{data:null,version:0});
}

export async function PUT(request:Request){
  const actor=await actorEmail();
  if(!actor)return NextResponse.json({error:"Authentication required"},{status:401});
  const body=await request.json() as {data?:unknown;expectedVersion?:number};
  if(!body.data||typeof body.data!=="object")return NextResponse.json({error:"Invalid ledger payload"},{status:400});
  const expected=Number(body.expectedVersion)||0;
  await ensureSchema();
  const payload=JSON.stringify(body.data);
  const result=await env.DB.prepare(`INSERT INTO ledger_state (id, data, version, updated_at, updated_by)
    VALUES (?, ?, 1, CURRENT_TIMESTAMP, ?)
    ON CONFLICT(id) DO UPDATE SET
      data = excluded.data,
      version = ledger_state.version + 1,
      updated_at = CURRENT_TIMESTAMP,
      updated_by = excluded.updated_by
    WHERE ledger_state.version = ?`)
    .bind(LEDGER_ID,payload,actor,expected).run();
  if((result.meta.changes||0)===0){
    const current=await env.DB.prepare("SELECT version FROM ledger_state WHERE id = ?").bind(LEDGER_ID).first<{version:number}>();
    return NextResponse.json({error:"Ledger changed in another session",version:current?.version||0},{status:409});
  }
  const current=await env.DB.prepare("SELECT version FROM ledger_state WHERE id = ?").bind(LEDGER_ID).first<{version:number}>();
  const version=current?.version||1;
  await env.DB.prepare("INSERT INTO ledger_audit (ledger_id, version, action, actor_email) VALUES (?, ?, ?, ?)")
    .bind(LEDGER_ID,version,expected===0?"created":"updated",actor).run();
  return NextResponse.json({ok:true,version});
}
