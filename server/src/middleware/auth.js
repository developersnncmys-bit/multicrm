// Authentication: verifies the Bearer token and loads the signed-in user onto req.user.
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/index.js";

export const signToken = (user) => jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export async function protect(req, res, next) {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Please sign in." });
    const { sub } = jwt.verify(token, env.jwtSecret);
    const user = await User.findOne({ id: sub }).lean();
    if (!user || !user.active) return res.status(401).json({ error: "Session expired. Please sign in again." });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Session expired. Please sign in again." });
  }
}
