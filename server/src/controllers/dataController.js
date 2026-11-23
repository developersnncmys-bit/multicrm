// GET /api/bootstrap — everything the signed-in user may see, in one call (the UI keeps it in memory)
// POST /api/admin/import — replace ALL data (load sample data / restore a backup). Admin only.
import { RESOURCES, KeyValue, KV_STORES, User } from "../models/index.js";
import { canAccess } from "../middleware/permission.js";
import { asyncHandler, toClient, fromClient } from "../utils/helpers.js";

export const bootstrap = asyncHandler(async (req, res) => {
  const out = {};
  await Promise.all(Object.entries(RESOURCES).map(async ([name, { model, module }]) => {
    // Everyone needs the user list (names, avatars); other lists follow module access
    if (name !== "users" && !canAccess(req.user, module)) { out[name] = []; return; }
    const docs = await model.find().sort({ _ord: 1 }).lean();
    out[name] = docs.map(toClient);
  }));
  for (const k of KV_STORES) out[k] = await KeyValue.read(k);
  res.json(out);
});

export const importAll = asyncHandler(async (req, res) => {
  const data = req.body || {};
  const me = req.user;
  const report = {};

  for (const [name, { model }] of Object.entries(RESOURCES)) {
    let list = Array.isArray(data[name]) ? data[name].map(fromClient) : [];
    if (name === "users") {
      // Keep the signed-in admin exactly as is (password included) so they stay logged in
      list = list.filter((u) => u.id !== me.id && String(u.email || "").toLowerCase() !== me.email);
      const docs = await Promise.all(list.map(async ({ password, ...u }, i) => ({ ...u, email: String(u.email || "").toLowerCase(), passwordHash: password ? await User.hash(password) : undefined, _ord: i + 1 })));
      await User.deleteMany({ id: { $ne: me.id } });
      if (docs.length) await User.insertMany(docs, { ordered: false });
      report.users = docs.length + 1;
      continue;
    }
    await model.deleteMany({});
    // Sample data is trusted; skip per-field validation for speed on large imports
    if (list.length) await model.insertMany(list.map((d, i) => ({ ...d, _ord: i })), { ordered: false, lean: true });
    report[name] = list.length;
  }
  for (const k of KV_STORES) await KeyValue.replace(k, data[k] && typeof data[k] === "object" ? data[k] : {});
  res.json({ ok: true, imported: report });
});
