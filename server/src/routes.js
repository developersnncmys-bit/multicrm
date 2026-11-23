// REST API. One generic CRUD for every collection keeps it 1:1 with the frontend store:
//   add(col, rec)        → POST   /api/c/:col
//   update(col, id, p)   → PATCH  /api/c/:col/:id
//   remove(col, id)      → DELETE /api/c/:col/:id
//   setSettings(sec, v)  → PUT    /api/kv/settings/:section
//   setAttendance(k, v)  → PUT    /api/kv/attendance
//   setAppConnection     → PUT    /api/kv/appConnections/:key
import { Router } from "express";
import { COLLECTIONS, KV, ADMIN_SETTINGS } from "./config.js";
import { col, clean, withHashedPassword } from "./db.js";
import { login, requireAuth, canAccess, isAdmin, adminOnly } from "./auth.js";

const r = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const strip = ({ _id, _ord, passwordHash, ...rest } = {}) => rest; // client can't set internals
const kvGet = async (name) => (await col("kv").findOne({ _id: name }))?.value ?? {};
const kvSet = (name, value) => col("kv").updateOne({ _id: name }, { $set: { value } }, { upsert: true });

r.get("/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ── Auth ──────────────────────────────────────────────
r.post("/auth/login", wrap(async (req, res) => {
  const out = await login(req.body?.email, req.body?.password);
  if (out.error) return res.status(401).json(out);
  res.json(out);
}));
r.get("/auth/me", requireAuth, (req, res) => res.json({ user: clean(req.user) }));
r.post("/auth/change-password", requireAuth, wrap(async (req, res) => {
  const { current, next } = req.body || {};
  const ok = (await login(req.user.email, current)).token;
  if (!ok) return res.status(400).json({ error: "Current password is wrong" });
  if (String(next || "").length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });
  const { passwordHash } = await withHashedPassword({ password: next });
  await col("users").updateOne({ id: req.user.id }, { $set: { passwordHash } });
  res.json({ ok: true });
}));

// ── Everything the signed-in user may see, in one call ──
r.get("/bootstrap", requireAuth, wrap(async (req, res) => {
  const out = {};
  await Promise.all(Object.entries(COLLECTIONS).map(async ([name, module]) => {
    // Everyone needs the user list (names, avatars); other lists follow module access
    if (name !== "users" && !canAccess(req.user, module)) { out[name] = []; return; }
    const docs = await col(name).find({}).sort({ _ord: 1 }).toArray();
    out[name] = docs.map(clean);
  }));
  for (const k of KV) out[k] = await kvGet(k);
  res.json(out);
}));

// ── Generic collection CRUD ───────────────────────────
const guard = (write) => (req, res, next) => {
  const name = req.params.col;
  if (!(name in COLLECTIONS)) return res.status(404).json({ error: `Unknown collection “${name}”` });
  if (name === "users" && write && !isAdmin(req.user) && !(req.method === "PATCH" && req.params.id === req.user.id)) return res.status(403).json({ error: "Only an Admin can manage users." });
  if (!canAccess(req.user, COLLECTIONS[name], write) && name !== "users") return res.status(403).json({ error: "You don't have permission to change this." });
  next();
};

r.post("/c/notifications/read-all", requireAuth, wrap(async (_req, res) => {
  await col("notifications").updateMany({}, { $set: { read: true } });
  res.json({ ok: true });
}));

r.post("/c/:col", requireAuth, guard(true), wrap(async (req, res) => {
  let rec = strip(req.body);
  if (!rec.id) return res.status(400).json({ error: "Record needs an id" });
  if (req.params.col === "users") {
    if (!rec.email) return res.status(400).json({ error: "Email is required" });
    rec = await withHashedPassword({ ...rec, email: String(rec.email).toLowerCase() });
  }
  await col(req.params.col).insertOne({ ...rec, _ord: -Date.now() }); // newest first, like the UI
  res.status(201).json(clean(rec));
}));

r.patch("/c/:col/:id", requireAuth, guard(true), wrap(async (req, res) => {
  let patch = strip(req.body);
  delete patch.id;
  if (req.params.col === "users") {
    if (!isAdmin(req.user)) { delete patch.role; delete patch.modules; delete patch.active; } // can't promote yourself
    if (patch.email) patch.email = String(patch.email).toLowerCase();
    patch = await withHashedPassword(patch);
  }
  if (!Object.keys(patch).length) return res.json({ ok: true });
  const out = await col(req.params.col).findOneAndUpdate({ id: req.params.id }, { $set: patch }, { returnDocument: "after" });
  if (!out) return res.status(404).json({ error: "Not found" });
  res.json(clean(out));
}));

r.delete("/c/:col/:id", requireAuth, guard(true), wrap(async (req, res) => {
  if (req.params.col === "users" && req.params.id === req.user.id) return res.status(400).json({ error: "You can't delete your own account." });
  const { deletedCount } = await col(req.params.col).deleteOne({ id: req.params.id });
  res.json({ ok: !!deletedCount });
}));

// ── Key/value stores ──────────────────────────────────
r.put("/kv/settings/:section", requireAuth, wrap(async (req, res) => {
  const { section } = req.params;
  if (ADMIN_SETTINGS.includes(section) && !isAdmin(req.user)) return res.status(403).json({ error: "Only an Admin can change this setting." });
  await col("kv").updateOne({ _id: "settings" }, { $set: { [`value.${section}`]: req.body?.value } }, { upsert: true });
  res.json({ ok: true });
}));
r.put("/kv/attendance", requireAuth, wrap(async (req, res) => {
  if (!canAccess(req.user, "team", true)) return res.status(403).json({ error: "No access to attendance." });
  const key = String(req.body?.key || "").replace(/\./g, "_");
  const op = req.body?.value == null ? { $unset: { [`value.${key}`]: "" } } : { $set: { [`value.${key}`]: req.body.value } };
  await col("kv").updateOne({ _id: "attendance" }, op, { upsert: true });
  res.json({ ok: true });
}));
r.put("/kv/appConnections/:key", requireAuth, adminOnly, wrap(async (req, res) => {
  await col("kv").updateOne({ _id: "appConnections" }, { $set: { [`value.${req.params.key}`]: req.body?.value } }, { upsert: true });
  res.json({ ok: true });
}));

// ── Admin: replace all data (load sample data / restore a backup) ──
r.post("/admin/import", requireAuth, adminOnly, wrap(async (req, res) => {
  const data = req.body || {};
  const me = req.user; // keep the signed-in admin's own login working after the import
  for (const name of Object.keys(COLLECTIONS)) {
    const list = Array.isArray(data[name]) ? data[name] : [];
    let docs = await Promise.all(list.map(async (rec, i) => ({ ...(name === "users" ? await withHashedPassword({ ...strip(rec), email: String(rec.email || "").toLowerCase() }) : strip(rec)), _ord: i })));
    if (name === "users") {
      docs = docs.filter((u) => u.id !== me.id && u.email !== me.email);
      docs.unshift({ ...me, _id: undefined, _ord: -1 });
      docs = docs.map(({ _id, ...d }) => d);
    }
    await col(name).deleteMany({});
    if (docs.length) await col(name).insertMany(docs, { ordered: false });
  }
  for (const k of KV) await kvSet(k, data[k] && typeof data[k] === "object" ? data[k] : {});
  res.json({ ok: true });
}));

export default r;
