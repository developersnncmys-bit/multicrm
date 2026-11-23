// All API routes, mounted under /api
import { Router } from "express";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import { resourceRouter } from "./resourceRoutes.js";
import { RESOURCES } from "../models/index.js";
import { protect } from "../middleware/auth.js";
import { adminOnly } from "../middleware/permission.js";
import { bootstrap, importAll } from "../controllers/dataController.js";
import { getSettings, updateSettings, setAttendance, setAppConnection } from "../controllers/settingsController.js";
import { markAllRead } from "../controllers/notificationController.js";

const router = Router();

router.get("/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

router.use("/auth", authRoutes);
router.use("/users", userRoutes);

// Whole-workspace data
router.get("/bootstrap", protect, bootstrap);
router.post("/admin/import", protect, adminOnly, importAll);

// Key/value stores
router.get("/settings", protect, getSettings);
router.put("/settings/:section", protect, updateSettings);
router.put("/attendance", protect, setAttendance);
router.put("/app-connections/:key", protect, adminOnly, setAppConnection);

// Special actions (before the generic resource routes)
router.post("/notifications/read-all", protect, markAllRead);

// One REST router per resource: /api/leads, /api/invoices, /api/tickets …
for (const [name, { model, module }] of Object.entries(RESOURCES)) {
  if (name === "users") continue; // has its own controller
  router.use(`/${name}`, resourceRouter(model, module));
}

export default router;
