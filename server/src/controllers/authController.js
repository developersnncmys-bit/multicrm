// POST /api/auth/login · GET /api/auth/me · POST /api/auth/change-password
import { User } from "../models/index.js";
import { signToken } from "../middleware/auth.js";
import { accessMap } from "../middleware/permission.js";
import { asyncHandler, httpError, toClient } from "../utils/helpers.js";

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw httpError(400, "Enter your email and password");
  const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select("+passwordHash");
  if (!user || !(await user.checkPassword(password))) throw httpError(401, "Invalid email or password");
  if (!user.active) throw httpError(403, "This account is deactivated. Contact your admin.");
  res.json({ token: signToken(user), user: toClient(user), access: accessMap(user) });
});

export const me = (req, res) => res.json({ user: toClient(req.user), access: accessMap(req.user) });

export const changePassword = asyncHandler(async (req, res) => {
  const { current, next } = req.body || {};
  const user = await User.findOne({ id: req.user.id }).select("+passwordHash");
  if (!(await user.checkPassword(current))) throw httpError(400, "Current password is wrong");
  await user.setPassword(next);
  await user.save();
  res.json({ ok: true });
});
