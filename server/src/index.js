// NNC CRM API server
import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { connect } from "./db.js";
import routes from "./routes.js";

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: config.origins.includes("*") ? true : config.origins }));
app.use(express.json({ limit: "25mb" })); // big enough for a full backup import
app.use("/api", routes);
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err?.code === 11000) return res.status(409).json({ error: "That record already exists (duplicate id or email)." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

connect()
  .then(() => app.listen(config.port, () => console.log(`NNC CRM API → http://localhost:${config.port}/api  (db: ${config.dbName})`)))
  .catch((e) => { console.error("Could not connect to MongoDB:", e.message); process.exit(1); });
