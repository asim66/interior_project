# Studio Ledger

A cloud-backed project operations and finance tool for an interior design studio — estimates,
BOQs, site requests, procurement, multi-project vendor bills, petty cash,
schedules, invoices, collections, expenses, vendors and payments in one place.
It runs as a protected React/Next application with synchronized storage and a
local recovery cache.

## Requirements

- [Node.js](https://nodejs.org) 22.13 or newer (includes `npm`)

## Getting started

```bash
npm install      # install dependencies (first time only)
npm run dev      # start the dev server, then open the URL it prints
```

To create a production build:

```bash
npm run build    # outputs the Cloudflare-compatible application into dist/
npm run preview  # serve the built site locally to check it
```

## Where your data lives

The hosted app synchronizes the ledger through its authenticated API into a
Cloudflare D1 database. A browser cache is retained only as a recovery copy.
The API uses optimistic versions to detect concurrent changes instead of
silently overwriting another session.

Use **Settings → Download backup** for portable JSON backups. Imported backups
are merged additively so existing financial history cannot be erased.

## Deploying

The repository is configured for OpenAI Sites with a D1 binding named `DB`.
The production build contains the server worker, static assets, hosting
metadata, and database migrations.

## Project structure

```
studio-ledger/
├─ app/                    protected page, metadata and ledger API
├─ drizzle/                cloud database migrations
├─ package.json            scripts & dependencies
├─ vite.config.ts          vinext/Cloudflare build config
├─ worker/                 production worker entry
└─ src/
   ├─ main.jsx             entry point (mounts <App/>)
   ├─ App.jsx              layout, navigation, shared state, auto-save
   ├─ shared.js            helpers, currency/date utils, storage, constants,
   │                       rollup() and sample data
   ├─ styles.css           all styling (design tokens at the top)
   └─ components/
      ├─ ui.jsx            Modal, Field, Empty, Confirm, StatusPill
      ├─ Dashboard.jsx     KPIs, cash-flow chart, project overview
      ├─ Projects.jsx      Projects list, ProjectForm, ProjectDetail
      ├─ Estimates.jsx     rough estimates, detailed BOQs, revisions, cost control
      ├─ Procurement.jsx   material requests, vendor bills, petty cash, allocations
      ├─ Schedule.jsx      milestones, owners, progress, blockers and delays
      ├─ Invoices.jsx      Invoices, InvoiceForm, printable InvoicePreview
      ├─ Collections.jsx   receivable aging, follow-ups, design/execution terms
      ├─ Expenses.jsx      Expenses list + ExpenseForm
      ├─ Vendors.jsx       Vendors list + VendorForm
      ├─ Payments.jsx      Payments ledger (received/made) + PaymentForm
      └─ Settings.jsx      studio details, vendor categories, CSV export, JSON backup/restore
```

## Common edits

- **Colors & fonts:** the `:root` design tokens at the top of `src/styles.css`.
- **Vendor categories:** manage them in Settings.
- **Expense categories and payment methods:** `EXP_CATS`, `METHODS` in `src/shared.js`.
- **Invoice math (tax, discount, totals):** `invTotal` in `src/shared.js`.
- **Currencies:** `curSym` in `src/shared.js`.

## Operating workflows

- **Before floor planning:** create a rough area-and-package estimate with
  assumptions, exclusions, design fee and contingency.
- **After floor planning:** create a measured room-wise BOQ and approve it as the
  project cost baseline.
- **Site purchasing:** supervisors submit project-specific material requests;
  approved requests flow into vendor bills.
- **Combined vendor invoices:** one invoice can contain multiple lines allocated
  to different projects while retaining one vendor invoice number.
- **Vendor payments:** allocate one payment across several open bill lines and
  preserve any remainder as an unapplied vendor advance.
- **Small expenses:** submit petty cash with supervisor, project, receipt
  reference, approval and reimbursement status.
- **Delivery control:** assign milestone owners, planned dates, progress and
  blocker reasons.
- **Collections:** track overdue balances, payment promises, disputes and
  design-to-execution commercial terms.
