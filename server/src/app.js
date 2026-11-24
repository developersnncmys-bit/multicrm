// Express app: middleware → routes → error handling. (server.js starts it.)
import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();
app.disable("x-powered-by");
// Allowed frontends: CLIENT_ORIGIN (comma-separated, "*" wildcards allowed, e.g. https://multicrm-*.vercel.app)
// plus the production admin panel and local dev, so a missing env value never blocks the live site.
const ALWAYS = ["https://multicrm-12.vercel.app", "http://localhost:5180", "http://localhost:5181", "http://localhost:5173"];
const toRegex = (o) => new RegExp(`^${o.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/.]*")}$`);
const patterns = [...env.origins, ...ALWAYS].map(toRegex);
app.use(cors({
  origin: env.origins.includes("*") ? true : (origin, cb) => cb(null, !origin || patterns.some((rx) => rx.test(origin))),
}));
app.use(express.json({ limit: "25mb" })); // big enough for a full backup import

// Friendly answer for the bare URL (the API itself lives under /api)
app.get("/", (_req, res) => res.json({ name: "NNC CRM API", status: "running", health: "/api/health", docs: "See README.md" }));

app.use("/api", routes);
app.use("/api", notFound);
app.use(errorHandler);

export default app;
