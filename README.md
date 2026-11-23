# NNC CRM: UI Prototype

A white-label CRM you can set up for any client: agencies, real estate, education, clinics, manufacturers or professional services. It is built with **React 18, Vite, Tailwind CSS, Recharts and lucide-react**.

This version is **frontend only**. All data is demo data stored in the browser's localStorage, so every screen works end-to-end without a backend.

## Run it

```bash
npm install      # first time only
npm run dev      # opens http://localhost:5180
npm run build    # production build in /dist
```

## Demo logins

| Role | Email | Password |
|---|---|---|
| Admin (all modules) | admin@nnc.in | admin123 |
| Sales Manager | kiran@nnc.in | demo123 |
| Accountant | sowmya@nnc.in | demo123 |
| Sales Executive | divya@nnc.in | demo123 |
| Project Manager | rakesh@nnc.in | demo123 |
| Support Agent | meena@nnc.in | demo123 |

The sidebar and page access change with the role you log in as.

Credential Vault demo PIN: **1234**

To get back the original demo data, use **Settings → Data & Backup → Reset demo data**.

## Setting it up for a new client

Log in as Admin. A **"Set up this workspace"** banner opens a 4-step wizard:

1. **Business type.** This sets the words used (Projects → Bookings / Admissions / Treatments / Orders), the 8 delivery stages, milestones, services and lead sources.
2. **Company.** Name, contact details, GSTIN and brand colour.
3. **Plan & modules.** Starter, Growth or Enterprise switches on a set of modules. You can then switch each module on or off individually.
4. **Finish.** Optionally load sample data for that industry, which is useful for demos.

Everything can be changed later in **Settings → Workspace & Modules**, including the client's own list of services and lead sources. A module that is switched off disappears from the menu, search, quick-create and dashboard for every user, and its URL shows a "switched off" screen.

| Industry | What gets tracked | Delivery stages |
|---|---|---|
| Professional Services | Projects | Onboarded → Discovery → Planning → In Progress → Review → Delivered |
| Digital / IT Agency | Projects | Onboarded → Requirement Gathering → Design → Development → Testing → Live |
| Real Estate & Builders | Bookings | Site Visit Scheduled → Site Visit Done → Unit Blocked → Booking → Agreement → Registration |
| Education & Coaching | Admissions | Counselling → Demo Class → Application → Documents → Fee Paid → Enrolled |
| Clinics & Healthcare | Treatments | Appointment Booked → Consulted → Treatment Plan → In Treatment → Review Visit → Recovered |
| Manufacturing & B2B | Orders | Order Confirmed → Material Planning → Production → Quality Check → Packing → Dispatched |

All industries end with **Completed** and **On Hold**. Industry presets live in `src/config/workspace.js`. To add a new industry, add one entry to `INDUSTRIES` and one to `SEED_FLAVOR`.

Agency-only modules (**SEO & Ads Delivery** and **Client Project Vault**) are add-ons and are off for other industries by default.

## Modules

**Added for multi-client use:**

- **Contacts & Companies**: one record per customer, prospect, partner or vendor, with linked leads, invoices and tickets, and WhatsApp/email consent flags.
- **Products & Price List**: catalogue with HSN/SAC, GST rate, cost and margin, stock and reorder levels.
- **Support Tickets**: SLA by priority (4/8/24/48 h), assignment, customer thread and internal notes, CSAT, SLA-breach view.
- **Campaigns**: WhatsApp/SMS/email broadcasts with an audience builder (consent-aware), preview, scheduling and a sent → delivered → read → replied funnel.
- **Automations**: "When X → do Y" rules (lead assignment, follow-ups, overdue reminders, SLA escalation, review requests).
- **Apps & Integrations**: connect WhatsApp API, Gmail, Razorpay, Tally, GST e-invoice, IndiaMART, 99acres, Practo, Meta/Google lead forms, webhooks.
- **Audit Log**: who changed what and when, with sensitive actions highlighted; CSV export.
- **Support Agent** role.

**Existing modules:**

- **Dashboard**: revenue vs target, KPIs, today's tasks and follow-ups, pipeline, lead sources, top performers, payments due, project status.
- **Leads**: filters, stage tabs, bulk actions, CSV export, a lead drawer with activity timeline, follow-ups, and Call/WhatsApp/Email buttons.
- **Pipeline**: drag-and-drop Kanban board with a weighted forecast.
- **Calendar & Tasks**: month view and agenda, follow-ups, invoice due dates.
- **Quotations**: GST quotation builder, print/PDF, WhatsApp share, convert to invoice.
- **Invoices**: tax and proforma invoices, CGST/SGST/IGST, part payments, reminders.
- **Payments**: receivables ageing, payment history, recurring retainers (SEO/AMC).
- **Projects**: delivery board, milestones, team, linked invoices.
- **Expenses**: categories, branches, charts.
- **Reports & P&L**: P&L, sales funnel, leaderboard, branch reports, GST summary.
- **Team & Attendance**: daily marking, monthly register, employees, payroll and payslips.
- **Credential Vault**: PIN lock, reveal/copy passwords, password generator.
- **Users & Roles**: role-based access matrix.
- **Settings**: company profile, bank details, invoice numbering and terms, targets, brand colour, dark mode, backup and reset.

Other features: Ctrl+K global search, a notifications bell, a "Create" quick menu, dark mode, six brand colours, a collapsible sidebar, and layouts that work on mobile.

## Rebranding for a customer

Edit `src/config/brand.js` (product name, company, default colour) and `public/favicon.svg`. Users can also change their company details and colour in Settings.

## Connecting a backend later

All reads and writes go through `src/store/store.jsx` (`add`, `update`, `remove`, `setSettings`, `setAttendance`). To connect an API, replace those functions with calls to it. The data shapes are in `src/data/seed.js`.
