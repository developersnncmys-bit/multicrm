// Vercel entry: every request is sent here (see vercel.json).
// Locally you don't use this file — run `npm run dev` (src/server.js) instead.
import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: `Database connection failed: ${e.message}` }));
  }
  return app(req, res);
}
