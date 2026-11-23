# NNC CRM: UI Prototype

A white-label CRM you can set up for any client: agencies, real estate, education, clinics, manufacturers or professional services. It is built with **React 18, Vite, Tailwind CSS, Recharts and lucide-react**.

The app runs in two modes:
- **Demo mode** (default): no backend; data lives in the browser's localStorage.
- **Live mode**: set `VITE_API_URL` and the app signs in and saves everything to MongoDB through the Node.js API in `server/`.

## Backend (Node.js + MongoDB)

```bash
npm run server:install          # first time
cp server/.env.example server/.env   # then fill in MONGODB_URI, JWT_SECRET, ADMIN_EMAIL/PASSWORD
npm run server                  # API on http://localhost:5000/api
echo VITE_API_URL=http://localhost:5000/api > .env.local
npm run dev                     # restart the frontend after creating .env.local
```

- On first start the server creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- Sign in, then use **Settings → Data & Backup → Reset demo data** to load sample data into MongoDB, or **Import data** to restore a JSON backup.
- **Auth:** JWT (7 days), bcrypt-hashed passwords. Password hashes are never sent to the browser.
- **Permissions:** the same role/module rules as the UI, enforced on the server. A user without access to a module can't read or change its data, and only an Admin can manage users, company, bank or invoice settings.
- **API** (all under `/api`; every route except login needs `Authorization: Bearer <token>`):
  - `POST /auth/login` · `GET /auth/me` · `POST /auth/change-password`
  - `GET|POST /users` · `GET|PATCH|DELETE /users/:id`
  - `GET|POST /<resource>` · `GET|PATCH|DELETE /<resource>/:id` for every resource: `leads`, `contacts`, `companies`, `quotations`, `invoices`, `projects`, `tasks`, `expenses`, `employees`, `tickets`, `products`, `campaigns`, and the rest listed in `server/src/models/index.js`
  - `GET /bootstrap` · `POST /admin/import`
  - `GET /settings` · `PUT /settings/:section` · `PUT /attendance` · `PUT /app-connections/:key` · `POST /notifications/read-all`

### Server structure

```
server/src/
  server.js            entry: connect DB, start listening
  app.js               express app: cors, json, routes, errors
  config/              env.js (reads .env), db.js (Mongoose + first admin), roles.js
  models/              User, Lead, Contact, Company, Document (Quotation/Invoice), Project,
                       Operations (Task, Expense, Employee, Ticket, Product, Campaign),
                       KeyValue (settings/attendance/app connections), base.js, index.js (registry)
  controllers/         authController, userController, crudController (generic CRUD),
                       dataController (bootstrap/import), settingsController, notificationController
  routes/              authRoutes, userRoutes, resourceRoutes (REST per resource), index.js
  middleware/          auth.js (JWT protect), permission.js (role/module rules), errorHandler.js
  utils/helpers.js     asyncHandler, httpError, toClient/fromClient
```

To add a new module: create a model in `models/`, register it in `models/index.js` with its module key. Its REST routes are created automatically.
- **MongoDB Atlas → Network Access** must allow the IP of wherever the API runs. For a hosted API (Render, Railway and similar), add that host's IP or `0.0.0.0/0`.

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

## Industry presets

The setup wizard and the Settings → Workspace & Modules screen were removed. All standard modules are always on. The agency add-ons (SEO & Ads Delivery and Client Project Vault) are off.

The business type defaults to **Professional Services**. To ship a build for another industry, change the default in `defaultWorkspace()` in `src/config/workspace.js`.

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
