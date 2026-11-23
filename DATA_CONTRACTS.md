# Data contracts (shared shapes)

These are the shapes every screen reads and writes through `useStore()` (`db.<collection>`, `add`, `update`, `remove`, `setSettings`).

Base shapes are in `src/data/seed.js`. Each area adds or enriches data in its own `src/data/seed_<area>.js`, which has the signature `(db) => patch`.

**Rule for screens:** always read collections defensively, e.g. `db.x || []` and `db.settings.y || {}`. Another area's data may not exist yet.

## Sales (seed_sales)

**leads** (extra fields):
- `site`: "web" | "landing" | "crm"
- `landingPage`: string
- `seen`: bool (false = unseen enquiry)
- `services`: string[]
- `budgetMin`, `budgetMax`: number
- `proposalStatus`: "" | "Preparing" | "Sent" | "Negotiation" | "Accepted" | "Rejected"
- `proposalLog`: [{ id, status, comment, at, by }]
- `firstReplyMins`: number | null
- `gstApplicable`: bool
- `gstin`: string

**planTasks** (Today's Plan): [{ id, date, title, type: "New Call" | "Follow-up" | "Payment" | "Proposal" | "Meeting" | "Onboarding" | "Other", priority: "Urgent" | "High" | "Medium" | "Low", phone, leadId, projectId, notes, done, createdAt }]

**templates** (WhatsApp/email): [{ id, name, channel: "WhatsApp" | "Email", subject, body }]
- `body` uses `{name}`, `{service}`, `{amount}`, `{owner}`, `{company}`.

**settings.automation**: { maxReminders, bigAmount, quietDays, daysAfterSend, reviewDays, pauseOnHold, upiId, reviewLink, bankAccountId }

## Delivery (seed_delivery)

**projects** (extra fields):
- `gstRate`, `advanceReceived`, `advanceDate`, `agreedTimelineDays`, `onboardedDate`, `completionDate`
- `developers`: employee ids
- `bant`: { budgetMin, budgetMax, authorityName, authorityRole, need, timeline }
- `cadence`: [{ id, day, title, channel, status: "Pending" | "Closed" | "Rescheduled", due, done }]
- `commLogs`: [{ id, type: "Outbound Call" | "WhatsApp" | "Proposal Sent", summary, at, by }]
- `emailLogs`: [{ id, type, to, subject, body, at, response }]
- `notesList`: [{ id, text, at, by }]
- `stageTimestamps`: { [stage]: iso }

**monthlyServices**: [{ id, projectId, client, types[], name, amount, gstRate, billDay, startDate, endDate, notes, active, payments: [{ id, month: "YYYY-MM", amount, date, mode, ref, note, skipped }] }]

**extras** (additional work): [{ id, projectId, client, title, description, amount, gstRate, requestedOn, status: "Quoted" | "Approved" | "In Progress" | "Done" | "Cancelled", payments: [{ id, amount, date, mode, ref, note }] }]

**integrations**: [{ id, projectId, category, service, mode: "Live" | "Test", status: "Pending" | "In Progress" | "Live" | "Issue" | "Inactive", owner: "Client" | "Agency", url, login, secrets: [{ name, value }], cost, billing: "One-time" | "Monthly" | "Yearly" | "Free", renewal, notes, updatedAt }]

**documents**: [{ id, name, type: "Project Document" | "Invoice" | "Quotation" | "MoM" | "Client Input", projectId, leadId, date, notes, size, fileName, dataUrl? }]

## Finance (seed_finance)

**bankAccounts**: [{ id, label, bank, number, ifsc, branch }]

**invoices**:
- `payments[]` can also have `accountId` and `proofName`.
- Proforma invoices have `type: "Proforma"`.
- A tax invoice converted from a proforma has `proformaId` and `quotedAmount`.

**quotations** (extra fields):
- `revision`: number
- `parentId`
- `negotiation`: [{ id, text, at, by }]
- `serviceCategory`
- `status` also allows "Final" and "Converted"

**paymentFollowups**: [{ id, client, project, city, category, totalValue, received, priority: "HOT" | "WARM" | "WATCH" | "DONE", status: "Pending" | "Partial" | "Paid" | "Followed Up" | "Not Finalised" | "Declined", lastFollowUp, nextAction, deadline, notes }]

**fundTxns**: [{ id, fund: "Operating Buffer" | "Emergency Fund" | "Tax Reserve" | "Growth Fund", type: "Deposit" | "Withdrawal", amount, date, note }]

**settings.financial**: { cogsPct, taxPct, opBufferMonths, emergencyPct, growthPct }

## Owner (seed_owner)

**ownerNotes**: [{ id, text, pinned, at }]

**commitments**: [{ id, leadId, projectId, label, amount, expectedDate, collected }]

**settings.payroll**: { salaryBill, payday }

## Team (seed_team)

**employees** (extra fields):
- Portal: `portalStatus`: "Active" | "Pending" | "Inactive"; `portalRoles`: string[]; `projects`: project ids; `lastSignIn`; `isPlansLead`
- Employment: `employmentType`: "Permanent" | "Probationary"; `shiftStart`, `shiftEnd`, `grace`; `dob`
- Salary: `salaryParts`: { basic, hra, da, special }; `pf`, `esi`, `pt`: bool; `hikes`: [{ id, from, to, date, pct, remarks }]

**salaryRecords**: [{ id, empId, month, gross, deductions, net, status: "Pending" | "Paid", paidOn }]

**messages**: [{ id, thread, from, text, at, read }]
- `thread` is an employee id (1:1) or "group:<name>"; `from` is "admin" or an employee id.

**dayPlans**: [{ id, empId, date, items: [{ text, done, addedAt }] }]

**workLogs**: [{ id, empId, date, projectId, type, summary, link, hours }]

**bugs**: [{ id, projectId, title, severity, status, raisedBy, assignedTo, at }]

**blockers**: [{ id, empId, projectId, text, at, resolved }]

**portalMeetings**: [{ id, empId, client, date, notes, momStatus: "MOM sent" | "MOM written, not sent" | "Notes only" }]

**portalDocs**: [{ id, name, from, to, projectId, at, seen }]

**portalTasks**: [{ id, empId, title, project, due, priority: "High" | "Medium" | "Low", status: "To do" | "Doing" | "Done" }]

**settings.portal**: { needsApproval, companyEmailOnly, devsSeePasswords }

## Admin (seed_admin)

**tasks** (calendar, extra fields):
- `mode`: "Google Meet" | "Office" | "Phone"
- `duration` (minutes)
- `status`: "Upcoming" | "Done" | "No-show" | "Cancelled"
- `outcome`, `summary`, `meetLink`
- `type` also allows "Blocked" and "Payment follow-up"

**seoClients**: [{ id, name, leadId, contact, phone, website, startDate, targets: { backlinks, blogs, gmb, posters }, googleBudget, metaBudget, team: [empIds], active }]

**seoWork**: [{ id, clientId, empId, date, type: "Backlink" | "Blog" | "GMB post" | "Poster" | "Other", title, link, keyword, status: "Live" | "Pending" }]

**adsReports**: [{ id, clientId, platform: "Google" | "Meta", date, spend, clicks, impressions, conversions, wasted, negatives, action, sent }]

**keywords**: [{ id, clientId, keyword, url, history: [{ date, position }], active }]

**credentials** (company vault, extra fields): `pinned`, `tags`: string[]

**users** (extra field): `modules`: { [moduleKey]: "view" | "edit" }. Optional; it overrides the role defaults.

**settings** (extra keys):
- `branches`: [{ name, rent, dueDay, notes }]
- `invoiceSeries`: { proformaPrefix, taxPrefix, fiscalYear, digits }
- `reports`: { schedule, sections[], email }
- `monthlyTargets`: { "YYYY-MM": { revenue, leads, deals, advance } }
- `calendar`: { workFrom, workTo, workDays[], gapMins, alertMins, officeAddress }

## Workspace (config/workspace.js)

**settings.workspace**: { industry: "general" | "agency" | "realestate" | "education" | "healthcare" | "manufacturing", plan: "Starter" | "Growth" | "Enterprise", enabled: moduleKey[], services: string[], sources: string[], setupDone: bool }

- `applyWorkspace()` runs on every store render. It replaces `SERVICES`, `LEAD_SOURCES`, `PROJECT_STAGES` and `PROJECT_STAGE_STYLE` in place.
- Project stages are positional: `[0]` is the first stage, `[5]` is delivered/live, `[6]` is "Completed" and `[7]` is "On Hold". Use `firstStage()`, `liveStage()` and `milestoneTitles()`; never hardcode stage names.
- `canAccess(user, module)` returns false when the module is switched off for the workspace.

## CRM (seed_crm)

**companies**: [{ id, name, city, phone, email, website, gstin, type: "Customer" | "Prospect" | "Partner" | "Vendor", size, ownerId, tags[], address, createdAt }]

**contacts**: [{ id, name, companyId, designation, phone, email, city, ownerId, type, tags[], leadIds[], notes, whatsappOptIn, emailOptIn, createdAt, lastContact }]

**products**: [{ id, name, sku, category, type: "Service" | "Product", unit, price, cost, gst, hsn, stock: number | null, reorder, active, sold, desc }]

**tickets**: [{ id, number, subject, contactId, contactName, company, phone, channel, category, priority: "Urgent" | "High" | "Medium" | "Low", status: "Open" | "In Progress" | "Waiting on Customer" | "Resolved" | "Closed", assigneeId, createdAt, dueAt, resolvedAt, rating, thread: [{ id, from: "customer" | "agent" | "note", by, text, at }] }]

**campaigns**: [{ id, name, channel: "WhatsApp" | "Email" | "SMS", status: "Draft" | "Scheduled" | "Running" | "Paused" | "Completed", audience, audienceSize, sent, delivered, read, clicked, replied, leads, scheduledAt, time, createdBy, cost, message, subject }]

**automations**: [{ id, name, trigger, actions: string[], category, active, runs, lastRun, createdBy }]

**appConnections**: { [appKey]: { connected, account, at } }

**auditLog**: [{ id, action, entity, detail, by, at, ip }]. Write entries with `log(action, entity, detail)` from the store.
