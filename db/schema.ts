import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const ledgerState=sqliteTable("ledger_state",{
  id:text("id").primaryKey(),
  data:text("data").notNull(),
  version:integer("version").notNull().default(1),
  updatedAt:text("updated_at").notNull(),
  updatedBy:text("updated_by").notNull(),
});

export const ledgerAudit=sqliteTable("ledger_audit",{
  id:integer("id").primaryKey({autoIncrement:true}),
  ledgerId:text("ledger_id").notNull(),
  version:integer("version").notNull(),
  action:text("action").notNull(),
  actorEmail:text("actor_email").notNull(),
  createdAt:text("created_at").notNull(),
});
