# Studio Ledger

## Software Documentation

**Product:** Studio Ledger  
**Version:** 2.0  
**Document status:** As-built functional and technical reference  
**Prepared:** 28 July 2026  
**Audience:** Studio owners, operations managers, project managers, finance staff, developers, testers, and system administrators

---

## 1. Document purpose

This document describes the current Studio Ledger application as implemented in
the repository. It combines:

- a functional guide for daily studio operations;
- the business and accounting rules enforced by the product;
- a technical architecture and data model reference;
- local development, testing, deployment, backup, and recovery guidance; and
- known limitations and the recommended product roadmap.

The document is an as-built reference, not an assertion that Studio Ledger is a
certified accounting, tax, legal, or project-planning system. Tax treatment,
contracts, revenue recognition, statutory record retention, and payment terms
must be reviewed for the studio's jurisdiction and business model.

## 2. Executive summary

Studio Ledger is a protected, cloud-backed operations and finance application
for an interior design and execution studio. It connects the commercial,
procurement, delivery, receivable, and payable sides of each project.

The product was created to solve thirteen recurring operational problems:
unallocated project expenses, incomplete vendor-payment history, missing small
expenses, combined vendor invoices spanning multiple sites, weak payment
allocation, unstructured supervisor requests, project delays, budget overruns,
insufficient estimates, difficulty pricing before and after floor planning,
loss-making design-to-execution commercial terms, and delayed client
collections.

Studio Ledger addresses these problems through:

1. project-level cost rollups and forecast-versus-baseline reporting;
2. supervisor material requests with approval and delivery statuses;
3. one vendor invoice containing separately allocated project lines;
4. vendor payments allocated to specific open bill lines;
5. petty-cash submission, approval, and reimbursement;
6. rough pre-design estimates and detailed room-wise BOQs;
7. versioned and locked estimate baselines;
8. milestone ownership, progress, blockers, and overdue indicators;
9. client invoice aging and collection follow-up records;
10. design-fee and execution-credit commercial terms; and
11. deletion, reversal, backup, and concurrency safeguards that preserve
    financial history.

## 3. Product scope

### 3.1 In scope

Studio Ledger currently includes:

- Dashboard and studio-level KPIs
- Project and client records
- Rough estimates
- Detailed BOQs
- Estimate revisions and approved baselines
- Project cost control
- Supervisors
- Material requests
- Multi-project vendor bills
- Vendor bill-line allocations
- Petty cash and small expenses
- Project milestones and delay tracking
- Client invoices and invoice printing
- Receivables and invoice aging
- Collection follow-ups and payment promises
- Vendor expenses and payables
- Client receipts and vendor payments
- Payment reversal
- Vendors and vendor categories
- Design-to-execution commercial terms
- JSON backup and additive restore
- CSV export
- Protected cloud synchronization
- Local recovery cache

### 3.2 Out of scope in the current version

The following are not yet complete product capabilities:

- statutory double-entry general ledger;
- chart of accounts, journals, bank reconciliation, or trial balance;
- GST return preparation, TDS, e-invoicing, or tax filing;
- purchase orders, goods-receipt notes, inventory, or stock valuation;
- receipt and drawing file uploads;
- automated reminders by email, SMS, or messaging applications;
- role-based access control and approval authority limits;
- item-level audit diffs and immutable external audit storage;
- formal credit notes, debit notes, or invoice-adjustment documents;
- critical-path scheduling and resource-capacity planning;
- payroll, timesheets, or contractor attendance;
- CRM lead pipeline and proposal e-signature;
- multi-studio or multi-legal-entity accounting;
- foreign-exchange revaluation; and
- native mobile applications.

## 4. User roles and responsibilities

Studio Ledger does not yet enforce roles in software. Everyone granted access to
the hosted site can use the application. The following roles are operational
responsibilities, not permission boundaries.

| Role | Primary responsibilities in Studio Ledger |
|---|---|
| Studio owner / director | Approve estimates, review profitability, monitor collections, decide commercial terms |
| Operations manager | Maintain projects, supervisors, procurement flow, milestones, and exceptions |
| Project supervisor | Submit material requests and small expenses; report progress and blockers |
| Procurement coordinator | Convert approved requests into vendor bills and allocate bill lines to projects |
| Finance / accounts | Issue invoices, record receipts, allocate vendor payments, monitor AR/AP, export records |
| Project manager | Maintain schedule, baseline, forecast, actual cost, and project completion status |
| System administrator | Control site access, deployment, backup practices, and recovery |

Recommended practice is to nominate one owner for each workflow and restrict
hosted-site membership until role-based controls are implemented.

## 5. Navigation and module reference

### 5.1 Dashboard

The Dashboard provides the management view of the studio:

- total invoiced value;
- cash received;
- accounts receivable;
- recorded project costs;
- cash paid out;
- accounts payable;
- active and at-risk projects;
- monthly cash movement; and
- project summaries.

Dashboard cash values and accounting balances are intentionally separate. An
unallocated receipt increases cash received but does not reduce a client's
invoice balance. An unallocated vendor payment increases cash paid out but does
not reduce a bill's payable balance.

### 5.2 Projects

A project records:

- project name;
- client name and contact details;
- site address;
- status;
- working budget;
- start date;
- notes; and
- design-to-execution commercial terms.

The project detail view consolidates invoices, receipts, expenses, payments,
petty expenses, material requests, schedule milestones, receivable, payable,
and cost-control information.

A project with financial or operational history cannot be deleted. This
includes invoices, expenses, payments, requests, petty expenses, estimates,
milestones, collection activities, and vendor bill allocations.

### 5.3 Estimation and cost control

#### Rough estimate

Use a rough estimate before a measured floor plan is available. It records:

- area;
- base execution rate;
- finish level;
- contingency percentage;
- design fee;
- assumptions;
- exclusions; and
- notes.

The application displays a working range of approximately minus 15 percent to
plus 15 percent around the calculated rough estimate. This range is a
commercial guide and is not a contractual tolerance.

#### Detailed BOQ

Use a detailed estimate after the floor plan and measurable scope are
available. Each BOQ line records:

- room or area;
- description;
- category;
- quantity;
- unit;
- material rate;
- labour rate; and
- markup percentage.

Contingency and design fee are added at estimate level.

#### Version control

Estimates have a type, version, date, and status:

- **Draft:** editable and available for approval.
- **Approved:** locked as the current project baseline.
- **Superseded:** preserved historical baseline replaced by a later approved
  version.

Users create a new revision instead of editing an approved baseline.

#### Cost control

For each project, Studio Ledger compares:

- the approved estimate, or project budget if no approved estimate exists;
- actual recorded vendor expenses;
- approved or reimbursed petty expenses;
- open material-request commitments;
- forecast cost; and
- remaining or negative variance.

Material-request value already converted into a vendor bill is removed from
the open-request commitment to prevent double counting.

### 5.4 Procurement

Procurement contains three connected workflows: material requests, vendor
bills, and petty cash.

#### Material requests

A request belongs to one project and one supervisor. It includes a request
number, priority, required-by date, notes, and one or more item lines.

Request statuses are:

1. Submitted
2. Approved
3. Ordered
4. Part-delivered
5. Delivered
6. Rejected

Submitted and rejected requests can be edited. Once approved, a request is
treated as an operational record and is locked from ordinary editing.

#### Combined vendor invoices

One vendor bill can contain multiple lines for different projects. Every line
stores its own:

- project;
- optional originating material request;
- description;
- expense category;
- quantity;
- unit;
- rate; and
- tax rate.

Saving a vendor bill creates or updates the corresponding project expense lines.
The combination of vendor and vendor invoice number must be unique.

Bill-derived expenses cannot be edited or deleted from the standalone Expenses
module. They must be managed through Procurement so the vendor invoice and
project allocations stay synchronized.

#### Vendor payment allocation

A single payment can be allocated across multiple open lines for the same
vendor. Studio Ledger creates a payment batch and one allocation record per bill
line. Any remainder is recorded as an unapplied vendor advance.

Reversing one payment line from a batch reverses the whole active batch, which
preserves the original payment trail and prevents a partial reversal from
misstating the bank transaction.

#### Petty cash

Small expenses record:

- project;
- supervisor;
- date;
- description;
- category;
- amount;
- payment method;
- receipt or voucher reference; and
- notes.

Petty-expense statuses are submitted, approved, rejected, and reimbursed.
Submitted items do not affect project actual cost until approved. Approved
items increase project cost and accounts payable. Reimbursed items remain in
project cost and move from payable to paid-out cash.

### 5.5 Schedule

Each project milestone records:

- milestone name;
- project;
- owner;
- planned start and end;
- actual completion date;
- status;
- progress percentage;
- blocker; and
- notes.

Milestone statuses are not started, in progress, blocked, and completed.
Blocked work is highlighted explicitly. Non-completed work with a planned end
earlier than the current local date is marked overdue.

The module is suitable for milestone control. It is not a full critical-path or
resource-loaded project scheduling engine.

### 5.6 Client invoices

An invoice contains a unique number, project, date, due date, status, line
items, tax rate, discount, and notes.

Invoice statuses stored in data are draft and sent. Paid, partial, and overdue
are derived at runtime from invoice value, allocated active receipts, due date,
and current date.

Only draft invoices can be edited or deleted. Issued invoices are locked.
Invoices with any payment or collection history cannot be deleted.

The current version does not create formal credit notes. If an issued invoice
requires correction, finance should preserve the existing record, document the
reason externally, and follow an approved adjustment process until credit-note
support is added.

### 5.7 Collections

Collections displays open client invoices, aging, overdue amounts, and logged
follow-up activity.

An activity can be:

- reminder;
- payment promise;
- dispute; or
- note.

Activities are linked to both invoice and project. Promise dates are stored
when relevant. Collection history prevents deletion of the related invoice.

### 5.8 Design-to-execution commercial terms

Each project can record:

- standalone design fee;
- credit available if execution is awarded to the studio;
- credit expiry;
- minimum execution value; and
- conversion status.

Recommended commercial policy:

1. price design as a profitable standalone service;
2. state that execution credit is conditional and time-limited;
3. set a minimum execution value;
4. define which design deliverables are released at each payment stage;
5. state that drawings and intellectual-property usage depend on the signed
   agreement; and
6. obtain legal and tax review before using the terms in contracts.

### 5.9 Expenses and payables

The Expenses module records standalone vendor or project costs with date, due
date, project, vendor, category, description, and amount.

Payment status is calculated from active payments linked to the expense:
open, due, overdue, partial, or paid.

A standalone expense with payment history is locked from editing and deletion.
A bill-derived expense is managed only through Procurement.

### 5.10 Vendors

Vendors have name, category, contact details, and notes. Categories can be
added, renamed, removed when unused, or restored to defaults.

A vendor with expense, payment, or vendor-bill history cannot be deleted.

### 5.11 Payments

Payments are split into:

- client receipts; and
- vendor payments.

Payments are append-only financial records. They cannot be physically deleted
or edited after posting. Corrections use reversal, which adds a reversal
timestamp while retaining the original amount, reference, date, and links.

When a payment is linked to an invoice or bill, its amount cannot exceed the
current open balance. Excess money must be recorded as an unlinked client
advance or vendor advance.

### 5.12 Settings, export, and backup

Settings controls studio identity, invoice defaults, currency, tax label, tax
rate, invoice sequence, and vendor categories.

Users can export major datasets as CSV and the entire ledger as JSON.

Backup import is additive. Existing records are retained, and imported records
whose IDs do not exist are appended. The import process does not replace or
erase current financial history.

The reset control is disabled when financial or operational history exists.

## 6. End-to-end operating workflows

### 6.1 New project and pre-design estimate

1. Create the project and client record.
2. Record a profitable standalone design fee.
3. Define conditional execution-credit terms.
4. Create a rough estimate using area, rate, finish level, contingency,
   assumptions, and exclusions.
5. Share the working range with clear non-contractual language.
6. Create the design and planning milestones.

### 6.2 Detailed estimate after floor planning

1. Create a detailed BOQ revision.
2. Enter measured room-wise lines.
3. Separate material, labour, and markup inputs.
4. Add contingency and design fee.
5. Review assumptions, exclusions, scope boundaries, and validity period.
6. Approve the version as the project baseline.
7. Create a new revision for later scope changes; do not overwrite the
   approved baseline.

### 6.3 Site material purchasing

1. Supervisor submits a project-specific material request.
2. Operations reviews quantity, required date, specification, and estimate.
3. Approve or reject the request.
4. Procurement orders approved items.
5. Convert the request into a vendor bill when invoiced.
6. Allocate each bill line to the correct project.
7. Update delivery status to part-delivered or delivered.
8. Monitor the open commitment in project cost control.

### 6.4 One vendor invoice for multiple projects

1. Open Procurement and create one vendor bill.
2. Select the vendor and enter the supplier's invoice number.
3. Add one or more lines for each project.
4. Connect lines to originating requests when applicable.
5. Verify quantity, rate, tax, category, and project.
6. Save once; Studio Ledger creates the project expense lines.
7. Allocate later payments across the open lines.

### 6.5 Petty cash

1. Supervisor records the expense promptly.
2. Add the receipt or voucher reference.
3. Manager approves or rejects it.
4. Finance reimburses approved items.
5. Mark the item reimbursed only after money is paid.

### 6.6 Vendor payment

1. Open the relevant vendor bill.
2. Enter the actual bank or cash payment.
3. Auto-allocate oldest open items or allocate manually.
4. Confirm allocated total does not exceed the payment.
5. Record the transaction reference.
6. Record any excess as an unapplied advance.
7. Reverse the batch if the bank transaction was posted incorrectly.

### 6.7 Client billing and collection

1. Create and review a draft invoice.
2. Issue the invoice by moving it to sent.
3. Record each client receipt.
4. Link the receipt to the invoice to reduce receivable.
5. Record excess receipts as unlinked client advances.
6. Monitor aging and overdue invoices.
7. Log reminders, promises, disputes, and notes.
8. Escalate delayed final payments according to the signed contract.

### 6.8 Project completion

1. Review incomplete and blocked milestones.
2. Confirm all vendor invoices and petty expenses are recorded.
3. Confirm open material requests are delivered or rejected.
4. Compare final actual cost with the approved estimate.
5. Issue the final client invoice.
6. Resolve open receivables and payables.
7. Complete milestones and mark the project completed.
8. Retain the ledger records; do not delete the project.

## 7. Financial and forecasting logic

### 7.1 Invoice calculation

For each invoice:

```text
Subtotal = sum(round(quantity x rate, 2))
Discount = min(subtotal, max(discount, 0))
Taxable value = max(subtotal - discount, 0)
Tax = round(taxable value x max(tax rate, 0) / 100, 2)
Invoice total = round(taxable value + tax, 2)
```

### 7.2 Accounts receivable

Only non-draft invoices are included.

```text
Invoice balance = max(invoice total - active receipts allocated to invoice, 0)
Accounts receivable = sum(invoice balances)
```

Unallocated receipts do not reduce accounts receivable.

### 7.3 Accounts payable

```text
Expense balance = max(expense amount - active payments allocated to expense, 0)
Accounts payable =
    sum(expense balances)
    + sum(approved petty expenses not yet reimbursed)
```

Unallocated vendor payments do not reduce accounts payable.

### 7.4 Rough estimate

```text
Execution estimate = area x base rate
Contingency = execution estimate x contingency percentage
Rough estimate total = execution estimate + contingency + design fee
```

### 7.5 Detailed BOQ

For each line:

```text
Line base cost = quantity x (material rate + labour rate)
Line value = line base cost + (line base cost x markup percentage)
```

At estimate level:

```text
BOQ subtotal = sum(line values)
Estimate total = BOQ subtotal
               + (BOQ subtotal x contingency percentage)
               + design fee
```

### 7.6 Project cost forecast

```text
Baseline = latest approved estimate; otherwise project budget
Actual cost = project expenses + approved/reimbursed petty expenses
Open request commitment =
    remaining estimated value of non-delivered, non-rejected requests
    after subtracting bill value already linked to each request
Forecast cost = actual cost + open request commitment
Variance = baseline - forecast cost
```

### 7.7 Cash versus accrual-style balances

Studio Ledger intentionally keeps:

- **cash received** separate from accounts receivable;
- **cash paid out** separate from accounts payable; and
- **recorded cost** separate from paid-out cash.

This prevents an unallocated advance from silently settling the wrong invoice
or bill.

## 8. Record integrity and correction policy

Studio Ledger applies the following rules:

- projects with history cannot be deleted;
- vendors with history cannot be deleted;
- only draft invoices without history can be deleted;
- issued invoices are locked;
- paid expenses are locked;
- vendor-bill expense lines are managed through the parent vendor bill;
- paid vendor bills cannot be edited or deleted;
- payments are reversed, not deleted;
- vendor payment batches reverse as a batch;
- approved estimate baselines are locked;
- additive backup import cannot erase current history; and
- workspace reset is unavailable once protected history exists.

These controls improve historical integrity but do not replace a certified
immutable audit ledger. The cloud audit table records who changed the whole
ledger version and when; it does not store a field-level before-and-after diff.

## 9. System architecture

### 9.1 Architecture overview

```text
Authenticated user
      |
      v
Vinext / Next application
      |
      +--> React client interface
      |      |
      |      +--> shared domain calculations and normalization
      |      +--> browser recovery cache
      |
      +--> /api/ledger
             |
             +--> optimistic version check
             +--> Cloudflare D1 ledger_state
             +--> Cloudflare D1 ledger_audit
```

### 9.2 Technology stack

| Layer | Technology |
|---|---|
| User interface | React 19 |
| Application framework | Next 16 application model via vinext |
| Build tooling | Vite 8 and vinext |
| Hosting runtime | Cloudflare Workers-compatible output |
| Cloud database | Cloudflare D1 |
| Schema tooling | Drizzle ORM / Drizzle Kit |
| Authentication | Sign in with ChatGPT headers supplied by the hosting environment |
| Styling | Repository-native CSS |
| Automated tests | Node built-in test runner |

### 9.3 Front-end organization

`src/App.jsx` owns the common application state, navigation, toast messages, and
mutation helpers. Domain modules are separated under `src/components`.

`src/shared.js` is the central domain layer. It contains:

- schema normalization and migrations;
- storage loading and saving;
- currency and date functions;
- invoice, AR, AP, payment, estimate, cost, and milestone calculations;
- record-history guards;
- additive backup merge; and
- sample data.

### 9.4 Persistence model

The production D1 database stores the current application ledger as JSON in one
`ledger_state` row. Each successful update increments a version number.
`ledger_audit` stores the version, action, actor email, and timestamp.

The detailed relational schema in `db/schema.sql` is a design blueprint for a
future normalized persistence layer. It is not the current production storage
model. The active deployment migration creates `ledger_state` and
`ledger_audit`.

### 9.5 Synchronization

The client loads `/api/ledger` without caching. The client sends updates with
its expected version.

- If the expected version matches, the server saves and increments the version.
- If another session already changed the ledger, the server returns HTTP 409.
- The client retains a local recovery copy and displays a sync warning.

The current version detects conflicts but does not provide an interactive
record-by-record conflict-resolution screen.

## 10. API reference

### 10.1 GET `/api/ledger`

Purpose: retrieve the current ledger.

Successful response:

```json
{
  "data": {},
  "version": 3,
  "updatedAt": "2026-07-28 10:00:00",
  "updatedBy": "user@example.com"
}
```

A new workspace returns:

```json
{
  "data": null,
  "version": 0
}
```

Possible errors:

- `401 Authentication required`
- `500` for an unexpected database or data-parsing failure

### 10.2 PUT `/api/ledger`

Purpose: replace the current ledger document when the caller's version is
current.

Request:

```json
{
  "data": {},
  "expectedVersion": 3
}
```

Successful response:

```json
{
  "ok": true,
  "version": 4
}
```

Possible errors:

- `400 Invalid ledger payload`
- `401 Authentication required`
- `409 Ledger changed in another session`
- `500` for an unexpected database failure

## 11. Logical data model

The client ledger contains the following primary collections.

| Collection | Purpose | Important relationships |
|---|---|---|
| projects | Project, client, budget, and commercial terms | Parent for estimates, requests, invoices, expenses, milestones |
| vendors | Suppliers and contractors | Parent for vendor bills, expenses, and payments |
| supervisors | Site owners and request submitters | Referenced by requests, petty expenses, milestones |
| estimates | Rough estimates and detailed BOQs | Belongs to project; contains estimate lines |
| materialRequests | Site demand and approval flow | Belongs to project and supervisor; may feed bill lines |
| vendorBills | Supplier invoice header | Belongs to vendor; contains project allocation lines |
| expenses | Project/vendor cost and payable unit | May be generated from vendor bill line |
| pettyExpenses | Small expense approval and reimbursement | Belongs to project and supervisor |
| milestones | Delivery plan and blocker tracking | Belongs to project; optionally supervisor-owned |
| invoices | Client billing document | Belongs to project; contains invoice items |
| paymentsReceived | Client cash record | Optionally linked to project and invoice |
| paymentsMade | Vendor cash record | Optionally linked to project, vendor, and expense; may share batch |
| collectionActivities | Follow-up history | Belongs to invoice and project |
| settings | Studio identity and defaults | Single settings object |

### 11.1 Relationship summary

```text
Project
  +-- Estimates
  +-- Material requests ---- optional link ---- Vendor bill line
  +-- Petty expenses
  +-- Milestones
  +-- Invoices ------------ Payments received
  +-- Expenses ------------ Payments made
  +-- Collection activities

Vendor
  +-- Vendor bills
        +-- Vendor bill lines
              +-- Project
              +-- Generated expense
              +-- Optional material request
```

## 12. Authentication and security

### 12.1 Authentication

Production requests rely on authenticated-user headers supplied by the hosting
environment. Unauthenticated production users are redirected to Sign in with
ChatGPT. Local development uses a clearly identified local-preview user.

### 12.2 Authorization

Authorization is site-level in the current version. The application does not
enforce separate owner, supervisor, procurement, or finance permissions.

### 12.3 Data protection controls

Implemented controls include:

- authenticated production access;
- private hosting capability;
- D1 database binding managed by the hosting platform;
- optimistic version checks;
- financial record locking and reversal;
- local recovery cache;
- additive backup merge; and
- actor email in version audit rows.

### 12.4 Security recommendations

Before broad production rollout:

1. keep the site owner-only or use a minimal allowlist;
2. implement role-based authorization;
3. validate and limit API payload size;
4. add request-level schema validation;
5. add field-level audit diffs or immutable event storage;
6. define retention and backup policies;
7. add monitoring and alerting;
8. conduct dependency and security scanning with explicit approval;
9. test restoration from backups; and
10. conduct an external security review before storing sensitive client or
    vendor documents.

## 13. Local development

### 13.1 Requirements

- Node.js 22.13 or later
- npm

### 13.2 Install and run

```bash
npm install
npm run dev
```

The development server normally opens at:

```text
http://localhost:3000/
```

Local development uses a local D1-compatible database and the local-preview
identity.

### 13.3 Automated tests

```bash
npm test
```

### 13.4 Production build

```bash
npm run build
```

The build produces a Cloudflare Workers-compatible application under `dist`,
including server output, client assets, hosting metadata, and D1 migrations.

## 14. Testing strategy and current coverage

The automated domain tests cover:

- allocated versus unallocated receipts;
- draft invoice exclusion from AR;
- allocated versus unallocated vendor payments;
- project cash rollups versus AR/AP;
- project-level AR/AP scope;
- payment reversal;
- preservation of reversed history;
- orphan-reference normalization;
- multi-project vendor bill totals;
- rough and detailed estimate formulas;
- project cost forecast;
- prevention of request/bill double counting;
- local accounting date and money rounding;
- additive backup merge; and
- blocked and overdue milestone health.

The current suite contains 15 passing tests.

Recommended additional tests:

- component and form validation tests;
- API authentication and payload tests;
- D1 optimistic-concurrency integration tests;
- browser-based end-to-end workflows;
- migration tests for every schema version;
- export/import round trips;
- large-ledger performance;
- accessibility checks;
- permission tests after RBAC; and
- disaster-recovery exercises.

## 15. Backup and recovery

### 15.1 Routine backup

1. Open Settings.
2. Download the full JSON backup.
3. Store it in an access-controlled location.
4. Use dated retention, such as daily for seven days and monthly for one year,
   subject to legal requirements.
5. Periodically verify that the file can be parsed and merged into a test
   environment.

### 15.2 Recovery from JSON

1. Confirm the target workspace.
2. Export the current workspace before recovery.
3. Use **Merge backup**.
4. Verify project, invoice, expense, payment, request, and estimate counts.
5. Review AR, AP, and cost-control totals.

The merge is ID-based and additive. It will not overwrite a current record that
has the same ID. This preserves current history but is not a complete
field-level reconciliation tool.

### 15.3 Synchronization conflict

If the application displays a sync warning:

1. stop entering data in additional sessions;
2. download a JSON backup from the affected session;
3. refresh to load the current cloud version;
4. merge the backup;
5. verify the affected records and totals; and
6. continue from one active session until conflict-resolution tooling is added.

## 16. Operational controls and recommended cadence

### Daily

- Supervisors submit material requests and petty expenses.
- Procurement reviews urgent and critical requests.
- Finance records receipts and vendor payments.
- Project managers update blockers and milestone progress.

### Weekly

- Review overdue client invoices and promises.
- Review overdue vendor bills.
- Review unallocated client and vendor advances.
- Compare forecast cost with approved baseline.
- Review blocked and overdue milestones.
- Export a backup.

### Monthly

- Reconcile Studio Ledger cash records with bank statements externally.
- Review project margins and estimate variance.
- Review unused or expired design execution credits.
- Close completed projects operationally without deleting them.
- Archive a month-end backup.

## 17. Known limitations and risk register

| Area | Current limitation | Business risk | Recommended action |
|---|---|---|---|
| Authorization | All site users have the same application capability | Unauthorized approvals or financial changes | Add RBAC and approval limits |
| Accounting | No double-entry ledger or bank reconciliation | Not suitable as statutory books | Integrate with certified accounting software |
| Audit | Version-level audit only | Cannot prove field-level change history | Store immutable item-level events/diffs |
| Persistence | Whole ledger saved as one JSON document | Conflict and scaling risk | Migrate to normalized transactional tables |
| Conflict handling | Detects 409 but does not merge interactively | Work may need manual reconciliation | Add record-level conflict resolution |
| Documents | Receipt and drawing references are text only | Evidence can be lost or separated | Add R2 uploads and retention |
| Invoice correction | No credit/debit note workflow | Manual adjustments may be inconsistent | Implement formal adjustment documents |
| Procurement | No PO, GRN, inventory, or three-way match | Quantity and delivery controls remain manual | Add PO-to-GRN-to-bill matching |
| Scheduling | Milestones only | No critical path or capacity forecast | Add dependencies and resource planning |
| Notifications | No automated reminders | Collections and approvals rely on discipline | Add email/SMS/Slack workflows |
| Tax | Generic tax fields | Compliance may be incorrect | Obtain jurisdiction-specific tax review |
| Security | Dependency audit not completed in this work session | Unknown third-party package risk | Run approved audit and remediation cycle |

## 18. Recommended roadmap

### Phase 1: Production governance

- Role-based access control
- Approval identity and authority limits
- API schema validation and payload limits
- Automated backups and restore testing
- Monitoring, error logging, and security review

### Phase 2: Transactional persistence

- Migrate from one JSON ledger row to normalized D1 tables
- Use database transactions for bills, expense lines, and payment allocations
- Implement item-level audit events
- Add record timestamps and actors
- Add conflict-resolution user experience

### Phase 3: Commercial and accounting depth

- Credit notes and debit notes
- Client and vendor advance application
- Bank reconciliation
- Tax-specific reports and accounting-system integration
- Retention and close-period controls

### Phase 4: Procurement and delivery

- Purchase orders
- Goods-receipt notes
- Three-way match
- Attachments and receipt images
- Material inventory and wastage
- Schedule dependencies and resource capacity

### Phase 5: Automation and analytics

- Approval and collection notifications
- Client portal
- Supervisor mobile experience
- Estimate variance by room, category, and vendor
- Vendor performance and lead-time reporting
- Project completion and profitability benchmarks

## 19. Acceptance checklist

Before treating a deployment as ready for studio use, confirm:

- production access is restricted to approved users;
- studio name, address, currency, tax label, rate, and invoice sequence are set;
- supervisors and vendor categories are configured;
- one test project has completed the rough-estimate workflow;
- one detailed BOQ has been approved and revised;
- one multi-project vendor bill has been entered and allocated;
- one payment batch has been recorded and reversed in a test environment;
- one petty expense has moved through approval and reimbursement;
- one invoice has been issued, partially paid, and collected;
- backup export and additive merge have been tested;
- AR, AP, cost forecast, and cash totals have been independently checked;
- users understand that issued financial records are corrected by reversal or
  controlled adjustment, not deletion; and
- a named person owns weekly backup and exception review.

## 20. Glossary

| Term | Meaning |
|---|---|
| AR | Accounts receivable: client invoice balances still due |
| AP | Accounts payable: vendor expense balances and approved petty reimbursements still due |
| BOQ | Bill of quantities: measured estimate lines by room, item, quantity, and rate |
| Baseline | Approved estimate used to compare forecast and actual cost |
| Commitment | Approved or ordered request value expected to become cost |
| D1 | Cloudflare's SQL database used by the hosted application |
| Expense line | Project cost record and unit against which vendor payment is allocated |
| GRN | Goods-receipt note; recommended future delivery-control document |
| Material request | Site demand raised by a supervisor for a specific project |
| Payment allocation | Link between cash movement and the invoice or expense it settles |
| Petty expense | Small site expense requiring approval and possible reimbursement |
| Reversal | Non-destructive cancellation of a posted payment |
| Vendor bill | Supplier invoice header containing one or more project allocation lines |

## 21. Repository reference

Key implementation surfaces:

- `src/App.jsx`: application composition and shared state
- `src/shared.js`: domain rules, normalization, calculations, and persistence
- `src/components/`: functional modules
- `app/api/ledger/route.ts`: authenticated cloud ledger API
- `app/chatgpt-auth.ts`: hosted identity integration
- `drizzle/0000_studio_ledger_cloud.sql`: active D1 migration
- `db/schema.sql`: future normalized relational blueprint
- `worker/index.ts`: Cloudflare worker entry
- `test/shared.test.js`: automated domain tests
- `.openai/hosting.json`: logical Sites resource bindings

---

**Document owner:** Studio Ledger product owner  
**Review cadence:** Review after each material release and at least quarterly  
**Change policy:** Update this document whenever business rules, persistence,
authentication, financial correction controls, or deployment procedures change.
