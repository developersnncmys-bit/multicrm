// JWT auth + role/module permissions (same rules as the frontend's canAccess).
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { col, clean } from "./db.js";
import { ROLES } from "../../src/config/constants.js";

export const sign = (user) => jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: "7d" });

export async function login(email, password) {
  const user = await col("users").findOne({ email: String(email || "").trim().toLowerCase() });
  if (!user || !user.passwordHash || !(await bcrypt.compare(String(password || ""), user.passwordHash))) return { error: "Invalid email or password" };
  if (!user.active) return { error: "This account is deactivated. Contact your admin." };
  return { token: sign(user), user: clean(user) };
}

// Express middleware: requires a valid Bearer token and an active user
export async function requireAuth(req, res, next) {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const { sub } = jwt.verify(token, config.jwtSecret);
    const user = await col("users").findOne({ id: sub });
    if (!user || !user.active) return res.status(401).json({ error: "Session expired. Please sign in again." });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Please sign in." });
  }
}

export const isAdmin = (u) => u?.role === "Admin";
export function canAccess(user, module, write = false) {
  if (!module) return true;
  if (isAdmin(user)) return true;
  if (user.modules && typeof user.modules === "object") return write ? user.modules[module] === "edit" : !!user.modules[module];
  return (ROLES[user.role] || []).includes(module);
}
export const adminOnly = (req, res, next) => (isAdmin(req.user) ? next() : res.status(403).json({ error: "Only an Admin can do this." }));
