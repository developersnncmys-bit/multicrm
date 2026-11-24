// Small shared helpers for controllers.

// Lets async controllers throw; errors go to the error handler
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Error with an HTTP status, e.g. throw httpError(404, "Not found")
export const httpError = (status, message) => Object.assign(new Error(message), { status });

// What the browser receives: no Mongo internals, never a password hash
export const toClient = (doc) => {
  if (!doc) return doc;
  const { _id, _ord, passwordHash, ...rest } = typeof doc.toObject === "function" ? doc.toObject() : doc;
  // A user's login password is never sent. (Other records may have a "password" field on purpose — e.g. the credential vault.)
  if ("role" in rest) delete rest.password;
  return rest;
};

// What we accept from the browser: it can't set internal fields
export const fromClient = (body = {}) => {
  const { _id, _ord, passwordHash, ...rest } = body;
  return rest;
};
