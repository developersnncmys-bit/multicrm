// Authorisation: the same role → module rules the frontend uses, enforced on the server.
import { ROLES } from "../config/roles.js";

export const isAdmin = (user) => user?.role === "Admin";

// Can this user see (write=false) or change (write=true) a module?
export function canAccess(user, module, write = false) {
  if (!module) return true;
  if (isAdmin(user)) return true;
  if (user.modules && typeof user.modules === "object") return write ? user.modules[module] === "edit" : !!user.modules[module];
  return (ROLES[user.role] || []).includes(module);
}

export const adminOnly = (req, res, next) => (isAdmin(req.user) ? next() : res.status(403).json({ error: "Only an Admin can do this." }));

// Route guard: requireModule("expenses") — reads need view access, writes need edit access
export const requireModule = (module) => (req, res, next) => {
  const write = req.method !== "GET";
  if (canAccess(req.user, module, write)) return next();
  res.status(403).json({ error: "You don't have permission for this module." });
};
