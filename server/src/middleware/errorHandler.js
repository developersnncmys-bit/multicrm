// Turns any thrown error into a clean JSON response the UI can show.
export const notFound = (req, res) => res.status(404).json({ error: `No API route for ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err.name === "ValidationError") {
    return res.status(400).json({ error: Object.values(err.errors).map((e) => e.message).join(", ") });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "value";
    return res.status(409).json({ error: `That ${field} is already in use.` });
  }
  if (err.type === "entity.too.large") return res.status(413).json({ error: "The upload is too large." });
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
}
