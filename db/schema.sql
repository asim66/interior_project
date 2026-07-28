-- Studio Ledger — SQLite schema
--
-- Single-tenant (one studio, no auth/multi-user tables) — mirrors the
-- current localStorage JSON shape in src/shared.js (EMPTY_DATA) as
-- relational tables. Designed to run embedded in the browser (sql.js or
-- wa-sqlite), not a separate backend server.
--
-- IDs stay TEXT and keep the app's existing uid() format (e.g. "prj_abc123")
-- rather than switching to INTEGER AUTOINCREMENT — that way a migration
-- script can copy existing localStorage records straight into rows with
-- their ids unchanged, no FK renumbering pass required.
--
-- Amounts are REAL, matching how the app already treats money (plain
-- rupee/dollar numbers, no minor-unit conversion). If float-precision
-- issues ever show up in totals, the fix is to switch these to INTEGER
-- minor units (paise/cents) and adjust fmt()/invTotal() accordingly —
-- not done here to keep this a drop-in match for current behavior.

PRAGMA foreign_keys = ON;

-- Single-row settings table (id is pinned to 1, no reason for more than
-- one row in a single-tenant app). Replaces EMPTY_DATA.settings.
CREATE TABLE settings (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  studio_name TEXT NOT NULL DEFAULT 'Your Studio',
  address     TEXT NOT NULL DEFAULT '',
  currency    TEXT NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR','USD','EUR','GBP','AED')),
  tax_label   TEXT NOT NULL DEFAULT 'GST',
  tax_rate    REAL NOT NULL DEFAULT 18,
  inv_prefix  TEXT NOT NULL DEFAULT 'INV-',
  inv_seq     INTEGER NOT NULL DEFAULT 1
);
INSERT INTO settings (id) VALUES (1);

-- The user-managed vendor category list from Settings ("manage them in
-- Settings"). Kept as its own table so the list has an order and can be
-- edited without touching every vendor row.
--
-- vendors.category is NOT a foreign key into this table on purpose: the
-- app already lets a vendor carry a category that isn't in the configured
-- list (getVendorCategories() merges configured + in-use categories), and
-- enforcing a strict FK here would break that. Category text is validated
-- app-side, same as EXP_CATS/VEN_CATS today.
CREATE TABLE vendor_categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE projects (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  client       TEXT NOT NULL DEFAULT '',
  client_email TEXT NOT NULL DEFAULT '',
  client_phone TEXT NOT NULL DEFAULT '',
  address      TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('lead','active','on-hold','completed')),
  budget       REAL NOT NULL DEFAULT 0,
  start_date   TEXT NOT NULL,          -- ISO date, "YYYY-MM-DD" — stored as text like today
  notes        TEXT NOT NULL DEFAULT '',
  design_fee   REAL NOT NULL DEFAULT 0,
  execution_credit REAL NOT NULL DEFAULT 0,
  credit_expiry TEXT,
  minimum_execution_value REAL NOT NULL DEFAULT 0,
  conversion_status TEXT NOT NULL DEFAULT 'design-stage'
);

CREATE TABLE vendors (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  contact  TEXT NOT NULL DEFAULT '',
  phone    TEXT NOT NULL DEFAULT '',
  email    TEXT NOT NULL DEFAULT '',
  notes    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE supervisors (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  phone    TEXT NOT NULL DEFAULT '',
  email    TEXT NOT NULL DEFAULT '',
  role     TEXT NOT NULL DEFAULT 'Site supervisor',
  active   INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);

CREATE TABLE material_requests (
  id            TEXT PRIMARY KEY,
  number        TEXT NOT NULL UNIQUE,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  supervisor_id TEXT NOT NULL REFERENCES supervisors(id) ON DELETE RESTRICT,
  request_date  TEXT NOT NULL,
  required_by   TEXT,
  priority      TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','urgent','critical')),
  status        TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','approved','ordered','part-delivered','delivered','rejected')),
  notes         TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_material_requests_project ON material_requests(project_id);
CREATE INDEX idx_material_requests_supervisor ON material_requests(supervisor_id);

CREATE TABLE material_request_items (
  id                TEXT PRIMARY KEY,
  material_request_id TEXT NOT NULL REFERENCES material_requests(id) ON DELETE CASCADE,
  description       TEXT NOT NULL,
  category          TEXT NOT NULL,
  qty               REAL NOT NULL,
  unit              TEXT NOT NULL DEFAULT 'nos',
  estimated_rate    REAL NOT NULL DEFAULT 0
);

CREATE TABLE vendor_bills (
  id             TEXT PRIMARY KEY,
  vendor_id      TEXT NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL,
  bill_date      TEXT NOT NULL,
  due_date       TEXT,
  notes          TEXT NOT NULL DEFAULT '',
  UNIQUE (vendor_id, invoice_number)
);
CREATE INDEX idx_vendor_bills_vendor ON vendor_bills(vendor_id);

-- project_id / vendor_id are both optional in the app's ExpenseForm
-- ("— None —" is a valid choice for either). Once linked, referenced
-- projects and vendors cannot be deleted; the app requires users to
-- preserve financial history rather than create detached records.
CREATE TABLE expenses (
  id          TEXT PRIMARY KEY,
  project_id  TEXT REFERENCES projects(id) ON DELETE RESTRICT,
  vendor_id   TEXT REFERENCES vendors(id) ON DELETE RESTRICT,
  bill_id     TEXT REFERENCES vendor_bills(id) ON DELETE RESTRICT,
  category    TEXT NOT NULL,           -- EXP_CATS enum lives in app code, not enforced here (same as today)
  description TEXT NOT NULL DEFAULT '',
  amount      REAL NOT NULL DEFAULT 0,
  date        TEXT NOT NULL,
  due_date    TEXT
);
CREATE INDEX idx_expenses_project ON expenses(project_id);
CREATE INDEX idx_expenses_vendor  ON expenses(vendor_id);
CREATE INDEX idx_expenses_bill    ON expenses(bill_id);

CREATE TABLE vendor_bill_lines (
  id                  TEXT PRIMARY KEY,
  vendor_bill_id      TEXT NOT NULL REFERENCES vendor_bills(id) ON DELETE RESTRICT,
  expense_id          TEXT NOT NULL UNIQUE REFERENCES expenses(id) ON DELETE RESTRICT,
  project_id          TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  material_request_id TEXT REFERENCES material_requests(id) ON DELETE RESTRICT,
  description         TEXT NOT NULL,
  category            TEXT NOT NULL,
  qty                 REAL NOT NULL,
  unit                TEXT NOT NULL DEFAULT 'nos',
  rate                REAL NOT NULL,
  tax_rate            REAL NOT NULL DEFAULT 0
);
CREATE INDEX idx_vendor_bill_lines_bill ON vendor_bill_lines(vendor_bill_id);
CREATE INDEX idx_vendor_bill_lines_project ON vendor_bill_lines(project_id);

CREATE TABLE petty_expenses (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  supervisor_id TEXT NOT NULL REFERENCES supervisors(id) ON DELETE RESTRICT,
  expense_date  TEXT NOT NULL,
  description   TEXT NOT NULL,
  category      TEXT NOT NULL,
  amount        REAL NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  receipt_ref   TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','approved','rejected','reimbursed')),
  notes         TEXT NOT NULL DEFAULT '',
  approved_at   TEXT,
  reimbursed_at TEXT
);
CREATE INDEX idx_petty_expenses_project ON petty_expenses(project_id);
CREATE INDEX idx_petty_expenses_supervisor ON petty_expenses(supervisor_id);

-- project_id is NOT NULL: InvoiceForm.save() refuses to save without a
-- project (`if(!f.projectId){return;}` in Invoices.jsx), so an invoice
-- with no project is never a real app state. Issued financial history
-- must not disappear when a project is deleted, so the FK is restrictive.
--
-- status only ever stores 'draft'/'sent' in the app; paid/partial/overdue
-- are derived from payments_received at read time (see invStatus() in
-- shared.js) and are NOT stored here — keep that as a query, not a column,
-- or it will drift out of sync with payments.
CREATE TABLE invoices (
  id         TEXT PRIMARY KEY,
  number     TEXT NOT NULL UNIQUE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  date       TEXT NOT NULL,
  due_date   TEXT,
  status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent')),
  tax_rate   REAL NOT NULL DEFAULT 0,
  discount   REAL NOT NULL DEFAULT 0,
  notes      TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_invoices_project ON invoices(project_id);

-- inv.items[] becomes its own table. position preserves display order
-- (the JS array order today).
CREATE TABLE invoice_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  qty         REAL NOT NULL DEFAULT 1,
  rate        REAL NOT NULL DEFAULT 0
);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

-- project_id and invoice_id are both optional in PaymentForm (a receipt
-- can be logged "— Unlinked —" to any invoice). Once linked, restrictive
-- FKs prevent deletion of referenced history. Payments are reversed with
-- reversed_at instead of being physically deleted.
CREATE TABLE payments_received (
  id         TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE RESTRICT,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE RESTRICT,
  amount     REAL NOT NULL,
  date       TEXT NOT NULL,
  method     TEXT NOT NULL DEFAULT 'Bank transfer',  -- METHODS enum in app code, not enforced here
  reference  TEXT NOT NULL DEFAULT '',
  notes      TEXT NOT NULL DEFAULT '',
  reversed_at TEXT
);
CREATE INDEX idx_payments_received_project ON payments_received(project_id);
CREATE INDEX idx_payments_received_invoice ON payments_received(invoice_id);

-- Same optionality story as expenses: project_id, vendor_id, expense_id
-- are all optional in PaymentForm ("— None —" / "— Unlinked —"). Once
-- linked, restrictive FKs preserve the referenced records. Payments are
-- reversed with reversed_at rather than physically deleted.
CREATE TABLE payments_made (
  id         TEXT PRIMARY KEY,
  batch_id   TEXT,
  project_id TEXT REFERENCES projects(id) ON DELETE RESTRICT,
  vendor_id  TEXT REFERENCES vendors(id) ON DELETE RESTRICT,
  expense_id TEXT REFERENCES expenses(id) ON DELETE RESTRICT,
  amount     REAL NOT NULL,
  date       TEXT NOT NULL,
  method     TEXT NOT NULL DEFAULT 'Bank transfer',
  reference  TEXT NOT NULL DEFAULT '',
  notes      TEXT NOT NULL DEFAULT '',
  reversed_at TEXT
);
CREATE INDEX idx_payments_made_project ON payments_made(project_id);
CREATE INDEX idx_payments_made_vendor  ON payments_made(vendor_id);
CREATE INDEX idx_payments_made_expense ON payments_made(expense_id);

CREATE TABLE estimates (
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  estimate_type   TEXT NOT NULL CHECK (estimate_type IN ('rough','detailed')),
  version         INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','superseded')),
  estimate_date   TEXT NOT NULL,
  area            REAL NOT NULL DEFAULT 0,
  finish_level    TEXT NOT NULL DEFAULT 'standard',
  base_rate       REAL NOT NULL DEFAULT 0,
  design_fee      REAL NOT NULL DEFAULT 0,
  contingency_pct REAL NOT NULL DEFAULT 0,
  assumptions     TEXT NOT NULL DEFAULT '',
  exclusions      TEXT NOT NULL DEFAULT '',
  notes           TEXT NOT NULL DEFAULT '',
  approved_at     TEXT,
  UNIQUE (project_id, estimate_type, version)
);
CREATE INDEX idx_estimates_project ON estimates(project_id);

CREATE TABLE estimate_lines (
  id            TEXT PRIMARY KEY,
  estimate_id   TEXT NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  room          TEXT NOT NULL DEFAULT 'General',
  description   TEXT NOT NULL,
  category      TEXT NOT NULL,
  qty           REAL NOT NULL,
  unit          TEXT NOT NULL DEFAULT 'nos',
  material_rate REAL NOT NULL DEFAULT 0,
  labour_rate   REAL NOT NULL DEFAULT 0,
  markup_pct    REAL NOT NULL DEFAULT 0
);
CREATE INDEX idx_estimate_lines_estimate ON estimate_lines(estimate_id);

CREATE TABLE milestones (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  owner_id      TEXT REFERENCES supervisors(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  planned_start TEXT,
  planned_end   TEXT NOT NULL,
  actual_end    TEXT,
  status        TEXT NOT NULL DEFAULT 'not-started'
    CHECK (status IN ('not-started','in-progress','blocked','completed')),
  progress      REAL NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  blocker       TEXT NOT NULL DEFAULT '',
  notes         TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_milestones_project ON milestones(project_id);
CREATE INDEX idx_milestones_owner ON milestones(owner_id);

CREATE TABLE collection_activities (
  id           TEXT PRIMARY KEY,
  invoice_id   TEXT NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  activity_date TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('reminder','promise','dispute','note')),
  promise_date TEXT,
  note         TEXT NOT NULL
);
CREATE INDEX idx_collection_activities_invoice ON collection_activities(invoice_id);
CREATE INDEX idx_collection_activities_project ON collection_activities(project_id);

-- Seed the default vendor category list (VEN_CATS in shared.js) so a
-- fresh database matches what a fresh localStorage EMPTY_DATA gives today.
INSERT INTO vendor_categories (name, sort_order) VALUES
  ('Supplier', 0), ('Carpenter', 1), ('Electrician', 2), ('Plumber', 3),
  ('Painter', 4), ('Fabricator', 5), ('Furniture', 6), ('Lighting', 7),
  ('Textiles', 8), ('Flooring', 9), ('Contractor', 10), ('Freelancer', 11),
  ('Other', 12);
