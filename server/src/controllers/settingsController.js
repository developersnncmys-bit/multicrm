// PUT /api/settings/:section · PUT /api/attendance · PUT /api/app-connections/:key
import { KeyValue } from "../models/index.js";
import { ADMIN_SETTINGS } from "../config/roles.js";
import { isAdmin, canAccess } from "../middleware/permission.js";
import { asyncHandler, httpError } from "../utils/helpers.js";

const safeKey = (k) => String(k || "").replace(/[.$]/g, "_"); // Mongo field names can't contain . or $

export const getSettings = asyncHandler(async (_req, res) => res.json(await KeyValue.read("settings")));

export const updateSettings = asyncHandler(async (req, res) => {
  const section = safeKey(req.params.section);
  if (ADMIN_SETTINGS.includes(section) && !isAdmin(req.user)) throw httpError(403, "Only an Admin can change this setting.");
  await KeyValue.setPath("settings", section, req.body?.value ?? null);
  res.json({ ok: true });
});

export const setAttendance = asyncHandler(async (req, res) => {
  if (!canAccess(req.user, "team", true)) throw httpError(403, "No access to attendance.");
  const key = safeKey(req.body?.key);
  if (!key) throw httpError(400, "Missing attendance key");
  await KeyValue.setPath("attendance", key, req.body?.value ?? undefined); // null → remove the mark
  res.json({ ok: true });
});

export const setAppConnection = asyncHandler(async (req, res) => {
  await KeyValue.setPath("appConnections", safeKey(req.params.key), req.body?.value ?? null);
  res.json({ ok: true });
});
