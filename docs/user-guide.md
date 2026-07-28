# Studio Ledger

## User Guide

**Version:** 2.0  
**Prepared:** 28 July 2026  
**For:** Studio owners, project managers, site supervisors, procurement teams, and finance staff

Studio Ledger brings project delivery and studio finances into one working record. Use this guide to set up the workspace, follow daily workflows, understand the numbers, correct mistakes safely, and close projects without losing history.

> IMPORTANT — Studio Ledger is an operations and finance control tool. It is not a statutory accounting, tax-filing, payroll, inventory, or bank-reconciliation system. Continue to use your approved accounting and compliance processes.

\pagebreak

# Contents

1. Start here
2. Understand the workspace
3. Complete the initial setup
4. Create and manage projects
5. Prepare estimates and control cost
6. Run procurement
7. Control the project schedule
8. Invoice clients
9. Record collections
10. Manage expenses and vendors
11. Record and reverse payments
12. Use the dashboard and project statement
13. Manage settings, exports, and backups
14. Correct records safely
15. Recommended operating routines
16. Troubleshooting
17. Status and terminology reference

> QUICK START — If this is a new workspace, complete Settings, add supervisors and vendors, create the first project, then prepare an estimate or project budget before recording costs.

\pagebreak

# 1. Start here

## 1.1 What Studio Ledger manages

Studio Ledger connects the commercial and operational records for an interior design or execution studio:

- projects, clients, budgets, and commercial terms;
- rough estimates and detailed room-wise bills of quantities (BOQs);
- supervisors, material requests, vendor bills, and petty cash;
- project milestones, progress, blockers, and delays;
- client invoices, receipts, aging, and collection follow-ups;
- vendor expenses, payables, and allocated payments; and
- data exports, JSON backups, and additive restore.

## 1.2 Sign in and open the application

1. Open the Studio Ledger site supplied by your administrator.
2. Sign in with the account that has access to the hosted site.
3. Wait for the workspace to load and confirm the studio name appears in the sidebar.
4. If a synchronization warning appears, stop entering data and follow the guidance in Troubleshooting.

In local preview or training environments, the application may use a local-preview identity. Do not treat local preview as the production record.

## 1.3 Screen layout

The left navigation opens the main modules. The active module is highlighted. Forms open in a dialog over the current page. Use **Cancel**, the close icon, or the **Escape** key to close a form without saving.

| Navigation item | Primary use |
|---|---|
| Dashboard | Studio KPIs, cash movement, risk, and recent activity |
| Projects | Project/client master records and consolidated project statements |
| Estimates | Rough estimates, detailed BOQs, revisions, and budget health |
| Procurement | Material requests, vendor bills, petty cash, supervisors, and bill payment allocation |
| Schedule | Milestones, ownership, progress, blockers, and completion |
| Invoices | Draft, issue, view, print, and collect client invoices |
| Collections | Open balances, aging, follow-ups, promises, and commercial terms |
| Expenses | Standalone project/vendor costs and payable status |
| Vendors | Supplier and contractor records with balances |
| Payments | Client receipts, vendor payments, and reversals |
| Settings | Studio defaults, categories, exports, backup, and reset |

## 1.4 Before entering live data

- Agree who owns projects, procurement, finance, and backup activities.
- Use one consistent naming convention for projects, vendors, invoice numbers, and references.
- Confirm the default currency, tax label, tax rate, and invoice prefix.
- Decide when an estimate becomes an approved baseline.
- Decide who may approve material requests and petty expenses.
- Keep source documents—contracts, supplier invoices, receipts, and bank confirmations—outside Studio Ledger using your approved filing system.

# 2. Understand the workspace

## 2.1 Cash is not the same as receivable or payable

Studio Ledger deliberately separates cash movement from invoice and bill balances.

- **Cash received** includes active client receipts, whether allocated or not.
- **Accounts receivable** reduces only when a receipt is linked to a client invoice.
- **Cash paid out** includes active vendor payments, whether allocated or not.
- **Accounts payable** reduces only when a payment is linked to an expense or vendor-bill line.

> IMPORTANT — An unallocated advance changes cash, but it does not settle an invoice or bill. Allocate money only when the supporting document is known.

## 2.2 Actual cost, commitment, and forecast

- **Actual cost** is recorded vendor expenses plus approved or reimbursed petty expenses.
- **Open requests** are the remaining estimated value of material requests not delivered or rejected.
- **Forecast** is actual cost plus open-request commitment.
- **Variance** is the approved baseline or project budget minus forecast.

Bill value already linked to a material request is removed from that request’s open commitment so it is not counted twice.

## 2.3 Records that become locked

Studio Ledger protects financial history:

- issued invoices are locked;
- approved estimates are locked;
- bill-derived expenses are managed from Procurement;
- expenses with payment history are locked;
- projects and vendors with history cannot be deleted; and
- payments are reversed rather than deleted.

This design preserves the original transaction trail. Plan corrections before posting.

## 2.4 Operational roles

The current product does not enforce module-level permissions. These are recommended responsibilities:

| Role | Recommended responsibilities |
|---|---|
| Studio owner/director | Approve baselines, review profitability, collections, and commercial terms |
| Project manager | Maintain projects, estimates, forecasts, milestones, and completion |
| Site supervisor | Submit material requests and small expenses; report progress and blockers |
| Procurement coordinator | Maintain vendors, convert requests to vendor bills, and verify project allocations |
| Finance/accounts | Issue invoices, post receipts and payments, monitor AR/AP, export, and back up |
| Workspace administrator | Control site access and coordinate recovery or conflict handling |

# 3. Complete the initial setup

## 3.1 Configure studio and invoice defaults

1. Open **Settings**.
2. Under **Studio & invoicing**, enter the studio name.
3. Enter the address and contact details exactly as they should appear on invoices.
4. Select the currency.
5. Enter the tax label, such as GST or VAT, and the default percentage.
6. Enter the invoice number prefix.
7. Check the preview of the next invoice number.
8. Select **Save settings**.

Changing defaults affects new records. Review existing documents separately.

## 3.2 Configure vendor categories

Use categories that support useful vendor searches and reporting.

1. In **Settings**, find **Vendor categories**.
2. Enter a category name and select **Add**.
3. To rename a category, select **Edit**, change the name, and select **Save**.
4. Delete an unused category only when the delete control is enabled.
5. Use **Restore defaults** to add the standard categories back without removing categories already in use.

Renaming a category also updates vendors using that category. Categories assigned to vendors cannot be deleted.

## 3.3 Add supervisors

1. Open **Procurement**.
2. Select **Manage supervisors**.
3. Enter the supervisor’s name and phone number.
4. Select **Add supervisor**.
5. Repeat for each person who submits site requests, small expenses, or owns milestones.
6. Select **Done**.

## 3.4 Add vendors

1. Open **Vendors** and select **New vendor**.
2. Enter the vendor name.
3. Select a category.
4. Add the contact person, phone, email, and useful notes.
5. Select **Add vendor**.

Use one vendor record per legal or operational supplier. Avoid duplicates caused by spelling differences.

## 3.5 Create the first project

1. Open **Projects** and select **New project**.
2. Enter a clear project name.
3. Add the client name and contact details.
4. Enter the site address.
5. Select the project status.
6. Enter a working budget if an approved estimate does not yet exist.
7. Add the start date and notes.
8. Select **Add project**.

Recommended name format: `Client surname — scope or site`, for example, `Mehta Residence — Full Home`.

# 4. Create and manage projects

## 4.1 Project statuses

Use statuses consistently across the studio.

| Status | Use when |
|---|---|
| Lead | The opportunity is being qualified |
| Active | Design or execution work is underway |
| On hold | Work is paused but the project remains open |
| Completed | Delivery and operational close-out are complete |

## 4.2 Edit a project

1. Open **Projects**.
2. Find the project by name or client.
3. Select **Edit**.
4. Update the required fields.
5. Select **Save changes**.

Do not repurpose an existing project record for a different client or site.

## 4.3 Open the project statement

Select **Open statement** on a project. The statement consolidates:

- project health and baseline;
- invoiced, received, receivable, cost, paid-out, payable, and profit figures;
- cost control and forecast;
- invoices and receipts;
- expenses, vendor payments, and petty expenses;
- material requests; and
- milestones.

Use the statement before client reviews, weekly project meetings, vendor-payment runs, and project close-out.

## 4.4 Delete a project

A project can be deleted only when it has no financial or operational history. If deletion is blocked, retain the record and change its status instead. Protected history includes estimates, invoices, expenses, payments, material requests, vendor-bill allocations, petty expenses, milestones, and collection activities.

# 5. Prepare estimates and control cost

## 5.1 Choose the estimate type

| Estimate | Best time to use | Basis |
|---|---|---|
| Rough estimate | Before measured plans and detailed scope | Approximate area × package rate |
| Detailed BOQ | After measurements and scope development | Room-wise quantities, material, labour, and markup |

## 5.2 Create a rough estimate

1. Create the project first.
2. Open **Estimates** and select **Rough estimate**.
3. Select the project and confirm the version and date.
4. Enter the approximate area.
5. Select the finish package.
6. Enter the execution package rate per square foot.
7. Enter the design fee and contingency percentage.
8. Record assumptions and exclusions.
9. Select **Save estimate**.
10. Review the displayed total and working range.

Treat the displayed ±15% range as a planning guide, not a contractual tolerance. State the underlying assumptions when sharing it.

## 5.3 Create a detailed BOQ

1. Open **Estimates** and select **Detailed BOQ**.
2. Select the project and confirm the version and date.
3. For each line, enter the room/zone, description, category, quantity, unit, material rate, labour rate, and markup.
4. Select **Add BOQ line** for additional work items.
5. Enter the design fee and contingency percentage.
6. Record assumptions and exclusions.
7. Select **Save estimate**.
8. Review the calculated total before approval.

Use separate lines when project ownership, specification, unit, or cost basis differs.

## 5.4 Approve a baseline

1. Review the draft estimate with the responsible commercial and project owners.
2. Confirm scope, quantities, rates, markup, contingency, design fee, assumptions, and exclusions.
3. Select **Approve baseline**.

The approved version becomes locked. A previously approved estimate of the same type becomes superseded.

> IMPORTANT — Approval is a control point. Do not approve an incomplete draft merely to populate the dashboard.

## 5.5 Create a revision

1. Find the relevant estimate.
2. Select **New revision**.
3. Update the copied scope and rates.
4. Save it as a draft.
5. Review and approve the revision when authorized.

Never overwrite an approved baseline to represent a scope change.

## 5.6 Read budget health

| Indicator | Meaning |
|---|---|
| On track | Forecast is no more than 85% of baseline |
| At risk | Forecast is above 85% but not over baseline |
| Over budget | Forecast exceeds baseline |
| No baseline | No approved estimate and no usable project budget |

Investigate negative variance by reviewing unplanned expenses, petty cash, open requests, changed rates, and missing client variations.

# 6. Run procurement

Procurement contains material requests, vendor bills, petty cash, supervisor management, and vendor payment allocation.

## 6.1 Submit a material request

1. Open **Procurement** and choose the material-request view.
2. Select **New material request**.
3. Select the project and supervisor.
4. Confirm the request date, required-by date, and priority.
5. Add each item’s description, category, quantity, unit, and estimated rate.
6. Add notes or specification details.
7. Select **Submit request**.

Use one request per project. Do not combine requirements from multiple sites.

## 6.2 Review and update a request

Follow the sequence below:

1. **Submitted** — supervisor has requested the items.
2. **Approved** — authorized reviewer accepts the need and estimate.
3. **Ordered** — procurement has placed the order; linked vendor bills can move an approved request here automatically.
4. **Part-delivered** — only part of the requirement has arrived.
5. **Delivered** — the requirement is complete and no longer an open commitment.
6. **Rejected** — the request will not proceed.

Submitted and rejected requests can be edited. Approved operational records are protected from ordinary editing.

## 6.3 Create a vendor bill

Use a vendor bill when recording a supplier invoice, especially when one invoice covers multiple projects.

1. Ensure the vendor and projects exist.
2. Open **Procurement** and choose vendor bills.
3. Select **New vendor bill**.
4. Select the vendor.
5. Enter the supplier invoice number, invoice date, due date, and notes.
6. For every line, select the correct project.
7. Link the originating material request where applicable.
8. Enter description, category, quantity, unit, rate, and tax.
9. Select **Add project line** for additional allocations.
10. Check the line totals and overall invoice total.
11. Save the vendor bill.

The vendor-and-invoice-number combination must be unique. Saving creates matching project expense lines automatically.

> IMPORTANT — Verify project allocation before saving. Bill-derived expenses must later be maintained through the vendor bill, not the standalone Expenses module.

## 6.4 Record a multi-project vendor invoice

For one supplier invoice covering several sites:

1. Create one vendor-bill header.
2. Add separate lines for each project and cost category.
3. Split shared costs using an agreed basis and document that basis in the notes.
4. Confirm that the total of all lines matches the supplier invoice.
5. Save once.

Do not create duplicate vendor bills for the same supplier invoice merely to separate projects.

## 6.5 Pay a vendor and allocate the payment

1. Open the vendor bill or vendor-payment allocation action.
2. Enter the actual total payment, date, method, and bank/transaction reference.
3. Select **Auto-allocate oldest** or enter allocation amounts manually.
4. Confirm no allocation exceeds the open line balance.
5. Review **Allocated** and **Unapplied** totals.
6. Select **Record payment**.

Any unallocated remainder becomes a vendor advance. Allocate it later when the correct bill is known.

## 6.6 Submit and process petty cash

To submit:

1. Open the petty-cash view and select **Submit small expense**.
2. Select the project and person who paid or submitted it.
3. Enter description, amount, date, category, payment method, receipt/voucher reference, and notes.
4. Select **Submit for approval**.

To process:

1. Review the evidence and business purpose.
2. Approve or reject the item.
3. Approved items increase actual project cost and payable.
4. After reimbursement is actually paid, mark it reimbursed.

| Petty status | Financial effect |
|---|---|
| Submitted | No actual cost or payable |
| Approved | Included in actual cost and payable |
| Rejected | Excluded from cost and payable |
| Reimbursed | Included in actual cost and paid-out cash; removed from payable |

# 7. Control the project schedule

## 7.1 Create a milestone

1. Open **Schedule** and select **Milestone**.
2. Select the project.
3. Enter a specific deliverable.
4. Assign an owner if available.
5. Select the status.
6. Enter planned start and finish dates.
7. Enter progress between 0 and 100%.
8. Record the current blocker or delay reason.
9. Add notes and select **Save milestone**.

Write outcomes, not activities—for example, `Kitchen carcasses installed` instead of `Kitchen work`.

## 7.2 Maintain milestone health

- **Not started** — work has not begun.
- **In progress** — active work is underway.
- **Blocked** — work cannot progress; always record the reason.
- **Completed** — the deliverable is finished.
- **Overdue** — calculated when a non-completed milestone is past its planned finish date.

Update progress and blockers during the weekly project review. Use **Complete** only when the acceptance condition is met.

# 8. Invoice clients

## 8.1 Prepare invoice defaults first

Before the first invoice, confirm the studio name, invoice address/contact, currency, tax label, tax rate, prefix, and next sequence in **Settings**.

## 8.2 Create a draft invoice

1. Open **Invoices** and select **New invoice**.
2. Select the project.
3. Confirm the unique invoice number.
4. Keep the status as **Draft** while reviewing.
5. Enter invoice and due dates.
6. Add descriptions, positive quantities, and rates for each line.
7. Enter any flat discount and tax percentage.
8. Add payment terms, bank details, or a client note.
9. Review subtotal, discount, tax, and total.
10. Select **Create invoice**.

The discount cannot exceed the subtotal, and the tax rate cannot be negative.

## 8.3 Issue and print an invoice

1. Review the draft carefully.
2. Edit it while it is still a draft if required.
3. Change the status to **Sent** and save, or record a receipt from the invoice action if appropriate.
4. Select **View**.
5. Select **Print / Save PDF** and use the browser print dialog.

Issued invoices are locked. Confirm client, scope, due date, tax, and total before changing the status to Sent.

## 8.4 Understand invoice statuses

| Status | How it is determined |
|---|---|
| Draft | Stored as a draft; excluded from receivable |
| Sent | Issued, unpaid, and not overdue |
| Partial | At least one active receipt is allocated but balance remains |
| Paid | Allocated active receipts settle the full total |
| Overdue | Unpaid issued invoice is past its due date |

## 8.5 Record a receipt from an invoice

1. Select **Record payment** beside the invoice.
2. Confirm the project and invoice.
3. Enter the amount, date, method, reference, and notes.
4. Save the receipt.

The allocated amount cannot exceed the open invoice balance. Record excess cash as an unlinked client advance.

# 9. Record collections

## 9.1 Review open balances

Open **Collections** to see issued invoices with remaining balances, aging, overdue amounts, and follow-up history.

Use this page for the weekly collection review. Focus on overdue final payments, broken promises, disputed invoices, and projects approaching handover.

## 9.2 Log a follow-up

1. Find the open invoice.
2. Select **Log follow-up**.
3. Choose the activity type: reminder, payment promise, dispute/hold, or collection note.
4. Enter the activity date.
5. For a promise, enter the promised payment date.
6. Record the conversation and next action.
7. Select **Save follow-up**.

Write objective notes: contact method, person contacted, response, commitment, owner, and next date.

## 9.3 Record design-to-execution terms

1. In **Collections**, find the project’s commercial-terms card.
2. Select **Set terms**.
3. Enter the standalone design fee.
4. Enter any conditional execution credit.
5. Set the credit expiry and minimum execution value.
6. Select the conversion status.
7. Summarize the agreed terms.
8. Select **Save terms**.

Use these fields as an operational summary. The signed contract remains the governing document.

# 10. Manage expenses and vendors

## 10.1 Create a standalone expense

Use **Expenses** for a cost that is not generated from a vendor bill.

1. Select **New expense**.
2. Enter the date and due date.
3. Select the project and vendor where applicable.
4. Select the category.
5. Enter a clear description and amount.
6. Save the expense.

Do not recreate a vendor-bill line as a standalone expense; that would double-count cost and payable.

## 10.2 Understand expense statuses

| Status | Meaning |
|---|---|
| Open | Unpaid and not yet due |
| Due | Due today |
| Overdue | Past due with an open balance |
| Partial | At least one active payment is allocated and balance remains |
| Paid | Allocated active payments settle the expense |

## 10.3 Edit or delete an expense

A standalone expense may be edited or deleted only before payment history exists. A bill-derived expense must be changed from its parent vendor bill in **Procurement**.

## 10.4 Review vendors

The Vendors page shows bills, paid value, balance, and due value for each supplier or contractor. Use search to find a vendor by name or category.

Edit contact information when it changes. A vendor with expenses, payments, or vendor bills cannot be deleted.

# 11. Record and reverse payments

## 11.1 Record a client receipt

1. Open **Payments**.
2. Choose **Received**.
3. Select **Record receipt**.
4. Select the project.
5. Link the invoice when known.
6. Enter amount, date, method, reference, and notes.
7. Save.

Linking the receipt reduces that invoice’s receivable. Leaving the invoice blank records an advance or unallocated receipt.

## 11.2 Record a vendor payment

For a simple standalone expense:

1. Open **Payments** and choose **Made**.
2. Select **Record payment**.
3. Select the project, vendor, and bill/expense.
4. Enter amount, date, method, reference, and notes.
5. Save.

For one payment covering several vendor-bill lines, use the allocation workflow in **Procurement**.

## 11.3 Reverse an incorrect payment

1. Find the payment in **Payments**.
2. Confirm the amount, date, reference, and linked document.
3. Select **Reverse**.
4. Read the confirmation and confirm.
5. Post a new correct payment if required.

The original remains visible as **Reversed** and no longer affects balances. Reversing one line in an allocated vendor-payment batch reverses the whole active batch.

> IMPORTANT — Never use reversal merely to hide a valid transaction. Document the correction reason in the replacement payment notes or supporting records.

# 12. Use the dashboard and project statement

## 12.1 Read dashboard KPIs

- **Invoiced** — total issued client invoices.
- **Received** — active client cash received.
- **Receivable** — issued invoice balances after allocated receipts.
- **Project costs** — expenses plus approved/reimbursed petty expenses.
- **Paid out** — active vendor payments plus reimbursed petty expenses.
- **Payable** — open expense balances plus approved petty expenses.
- **At risk** — projects with forecast or delivery concerns.

The six-month cash-flow chart shows incoming and outgoing cash by month. Recent activity helps confirm that expected transactions were recorded.

## 12.2 Investigate differences

| Observation | Check |
|---|---|
| Received rises but receivable does not fall | Receipt may be unallocated |
| Paid out rises but payable does not fall | Vendor payment may be unallocated |
| Actual cost rises before payment | Expense or approved petty item was recorded |
| Forecast is higher than actual | Open material requests remain |
| Project appears over budget | Review baseline, expenses, petty items, request commitments, and scope changes |

## 12.3 Use the project statement for review

Before a project meeting:

1. Open the project statement.
2. Review cost control and variance.
3. Check outstanding client invoices and receipts.
4. Review vendor costs, payments, and payables.
5. Check open requests and delayed milestones.
6. Agree actions, owners, and dates.

# 13. Manage settings, exports, and backups

## 13.1 Export CSV files

1. Open **Settings**.
2. Go to **Export & backup**.
3. Select the dataset to export.
4. Save the downloaded CSV in the approved reporting location.

CSV exports are useful for analysis and handoff. They are not a complete restorable backup.

## 13.2 Download a full backup

1. Open **Settings**.
2. Select **Download backup**.
3. Confirm a JSON file downloads.
4. Store it in a restricted, backed-up location.
5. Include the date in your backup register.

Recommended practice: take a backup before a major import or correction exercise and at least weekly during active operations.

## 13.3 Merge a backup

1. Take a new backup of the current workspace first.
2. Select **Merge backup**.
3. Choose a valid Studio Ledger JSON backup.
4. Wait for the confirmation message.
5. Review record counts and important balances.

Merge is additive: current records remain, and imported records with new IDs are appended. It does not overwrite duplicate IDs or erase existing history.

> CAUTION — An additive merge is not a rollback. If you need disaster recovery, coordinate with the workspace administrator and validate the result before resuming entry.

## 13.4 Reset the workspace

Reset is intended only for an empty or disposable workspace. It is disabled after protected financial or operational history exists. Do not depend on reset as a correction method.

# 14. Correct records safely

Use the correction route that matches the record.

| Record | Safe correction |
|---|---|
| Draft invoice | Edit or delete before history exists |
| Issued invoice | Preserve it; follow the studio’s approved adjustment/credit-note process |
| Draft estimate | Edit |
| Approved estimate | Create a new revision |
| Standalone unpaid expense | Edit or delete |
| Bill-derived expense | Edit the parent vendor bill |
| Posted payment | Reverse, then post the correct payment |
| Project/vendor with history | Retain and change status/details; do not delete |
| Backup import | Take a current backup, then merge and verify |

Before correcting a financial record:

1. Identify the source document and correct intended value.
2. Check whether the record is linked to another module.
3. Confirm whether the period has already been reported externally.
4. Take a backup for a material correction exercise.
5. Use edit, revision, or reversal as required.
6. Recheck Dashboard, the project statement, AR/AP, and the related document.
7. Record the reason outside the application if required by policy.

# 15. Recommended operating routines

## 15.1 Daily — site and transaction entry

- Submit material requests before ordering.
- Record supplier invoices and project allocations promptly.
- Submit petty expenses with references.
- Record client receipts and vendor payments from bank evidence.
- Add new blockers and update urgent milestones.

## 15.2 Weekly — project control

1. Review Dashboard risk and recent activity.
2. Open each active project statement.
3. Review actual, open requests, forecast, and variance.
4. Close delivered or rejected requests.
5. Update milestones, progress, and blockers.
6. Review open client balances and log follow-ups.
7. Review due vendor balances and planned payments.

## 15.3 Monthly — finance and governance

- Reconcile Studio Ledger cash entries to the bank record outside the application.
- Review unallocated client and vendor advances.
- Export datasets needed for accounting.
- Review overdue receivables and payables.
- Confirm completed projects have no unresolved requests or milestones.
- Download and register a full backup.
- Review access to the hosted site.

## 15.4 Project close-out

1. Confirm all vendor invoices and petty expenses are recorded.
2. Mark requests delivered or rejected.
3. Complete milestones and document remaining defects externally.
4. Compare final actual and forecast against the approved baseline.
5. Issue the final client invoice.
6. Resolve receivable and payable balances.
7. Mark the project completed.
8. Retain the project and history.

# 16. Troubleshooting

| Problem | Likely cause | Action |
|---|---|---|
| New invoice button is disabled | No project exists | Create the project first |
| Cannot edit an invoice | Invoice is issued or has history | Preserve it and use the approved adjustment process |
| Cannot delete a project or vendor | Linked history exists | Retain the record and update status/details |
| Expense cannot be edited | It came from a vendor bill or has payment history | Edit the vendor bill or use a payment reversal |
| Receipt did not reduce receivable | It is not linked to the invoice | Review the receipt and allocation; reverse/repost if necessary |
| Vendor payment did not reduce payable | It is unallocated | Allocate through the correct bill workflow |
| Forecast looks too high | A request remains open or is not linked to the bill | Check request status and bill-line link |
| Forecast looks too low | Costs or open requests are missing | Record the documents and review project assignment |
| Invoice number already exists | Duplicate number | Use the next approved unique number |
| Backup file cannot be read | Invalid or damaged JSON | Use a known Studio Ledger backup and do not modify it manually |
| Sync warning or conflicting change | Another session saved a newer version | Stop entry, refresh/reload as directed, compare recent changes, and coordinate with the other user |
| Print output is incomplete | Browser print settings | Use the invoice View action, choose the correct printer/PDF target, and check scale/margins |

If a balance still appears wrong:

1. Filter Payments by project.
2. Check whether relevant payments are active or reversed.
3. Confirm each receipt or payment is linked to the intended invoice/expense.
4. Check for duplicate standalone expenses and vendor-bill lines.
5. Review petty-expense statuses.
6. Review material-request status and vendor-bill links.
7. Compare the project statement with source documents.

# 17. Status and terminology reference

## 17.1 Material request statuses

| Status | Meaning |
|---|---|
| Submitted | Awaiting review |
| Approved | Authorized and included as open commitment |
| Ordered | Purchase placed or linked to vendor bill |
| Part-delivered | Part of the request remains open |
| Delivered | Complete; excluded from open commitment |
| Rejected | Will not proceed; excluded from open commitment |

## 17.2 Estimate statuses

| Status | Meaning |
|---|---|
| Draft | Editable working version |
| Approved | Locked baseline used for cost control |
| Superseded | Historical baseline replaced by a newer approved version |

## 17.3 Payment statuses

| Status | Meaning |
|---|---|
| Posted | Active and included in cash/balance calculations |
| Reversed | Preserved in history but excluded from calculations |

## 17.4 Key terms

| Term | Definition |
|---|---|
| Accounts receivable (AR) | Open value of issued client invoices after allocated active receipts |
| Accounts payable (AP) | Open expenses after allocated active payments, plus approved unreimbursed petty expenses |
| Actual cost | Vendor expenses plus approved/reimbursed petty expenses |
| Baseline | Latest approved estimate; otherwise the project budget |
| BOQ | Bill of quantities: measured room-wise cost lines |
| Forecast | Actual cost plus remaining open-request commitment |
| Unallocated advance | Cash recorded without settlement of a specific invoice or expense |
| Variance | Baseline minus forecast; negative means forecast exceeds baseline |

## 17.5 Final user checklist

- The right project, vendor, and dates are selected.
- References match the source document or bank transaction.
- Client receipts are allocated only to the intended invoice.
- Vendor payments are allocated only to the intended expense lines.
- Supplier invoices spanning projects are split by line, not duplicated.
- Petty expenses are approved before they affect cost.
- Requests are closed when delivered or rejected.
- Approved estimates are revised, not overwritten.
- Incorrect payments are reversed, not deleted.
- Backups are downloaded and stored regularly.

---

**Document owner:** Studio Ledger product owner  
**Review cadence:** After each material product release and at least quarterly  
**Support route:** Contact the workspace administrator or designated Studio Ledger process owner
