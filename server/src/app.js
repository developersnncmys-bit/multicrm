// Express app: middleware → routes → error handling. (server.js starts it.)
import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: env.origins.includes("*") ? true : env.origins }));
app.use(express.json({ limit: "25mb" })); // big enough for a full backup import

// Friendly answer for the bare URL (the API itself lives under /api)
app.get("/", (_req, res) => res.json({ name: "NNC CRM API", status: "running", health: "/api/health", docs: "See README.md" }));

app.use("/api", routes);
app.use("/api", notFound);
app.use(errorHandler);

export default app;
