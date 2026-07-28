CREATE TABLE `ledger_state` (
  `id` text PRIMARY KEY NOT NULL,
  `data` text NOT NULL,
  `version` integer DEFAULT 1 NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ledger_audit` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `ledger_id` text NOT NULL,
  `version` integer NOT NULL,
  `action` text NOT NULL,
  `actor_email` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ledger_audit_ledger_idx` ON `ledger_audit` (`ledger_id`,`version`);
