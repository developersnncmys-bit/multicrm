// POST /api/notifications/read-all
import { RESOURCES } from "../models/index.js";
import { asyncHandler } from "../utils/helpers.js";

export const markAllRead = asyncHandler(async (_req, res) => {
  await RESOURCES.notifications.model.updateMany({}, { $set: { read: true } });
  res.json({ ok: true });
});
