# NNC CRM — Backend API

Node.js + Express + MongoDB (Mongoose) API used by the NNC CRM admin panel and mobile app.

## Run locally

```bash
npm install
cp .env.example .env     # then fill in MONGODB_URI, JWT_SECRET, …
npm run dev              # http://localhost:5000/api
```

Check it works: open `http://localhost:5000/api/health`.

## Deploy on Vercel

1. In Vercel, click **Add New → Project** and import this repository. Leave the framework preset as **Other**, and leave the build settings empty.
2. In **Environment Variables**, add:

   | Name | Value |
   |---|---|
   | `MONGODB_URI` | your MongoDB Atlas connection string |
   | `DB_NAME` | `nnc_crm` |
   | `JWT_SECRET` | a long random string |
   | `CLIENT_ORIGIN` | your frontend URL(s), comma-separated, e.g. `https://your-crm.vercel.app` |
   | `ADMIN_EMAIL` / `ADMIN_PASSWORD` | first admin login (only used when there are no users yet) |

3. Click **Deploy**. Your API will be at `https://<project>.vercel.app/api` (test `/api/health`).
4. In **MongoDB Atlas → Network Access**, allow `0.0.0.0/0`. Vercel doesn't use fixed IP addresses.
5. Point the frontend at the API by setting `VITE_API_URL=https://<project>.vercel.app/api` in the frontend's Vercel project. In the mobile app, enter the same address under **Server settings**.

`api/index.js` is the Vercel entry point and `vercel.json` sends every request to it. `src/server.js` is only used when running locally.

## Structure

```
api/index.js            Vercel serverless entry
src/app.js              Express app (middleware → routes → errors)
src/server.js           Local entry (connect DB, listen on PORT)
src/config/             env, MongoDB connection, roles & permissions
src/models/             Mongoose models (User, Lead, Invoice, … + flexible collections)
src/controllers/        auth, users, generic CRUD, bootstrap/import, settings
src/routes/             /api/auth, /api/users, /api/<resource>, /api/bootstrap, /api/settings …
src/middleware/         JWT auth, role permissions, error handler
```

## Main endpoints

- `POST /api/auth/login` → `{ token, user, access }`
- `GET /api/auth/me`
- `GET /api/bootstrap` (everything the signed-in user may see)
- `GET | POST /api/<resource>` and `GET | PATCH | DELETE /api/<resource>/:id`. Resources include leads, contacts, companies, quotations, invoices, projects, tasks, expenses, employees, tickets, products, campaigns, credentials and more.
- `PUT /api/settings/:section`, `PUT /api/attendance`, `POST /api/notifications/read-all`
- `POST /api/admin/import` (admin only, replaces all data)
