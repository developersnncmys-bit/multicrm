// Generic controller used by every CRM resource (leads, invoices, tickets…).
// makeCrudController(Model) → { list, getOne, create, update, remove }
import { asyncHandler, httpError, toClient, fromClient } from "../utils/helpers.js";

export function makeCrudController(Model) {
  return {
    // GET /api/:resource  — optional ?q=text search on name/title, ?limit=
    list: asyncHandler(async (req, res) => {
      const filter = {};
      if (req.query.q) {
        const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = [{ name: rx }, { title: rx }, { number: rx }, { subject: rx }];
      }
      const limit = Math.min(Number(req.query.limit) || 0, 1000);
      const docs = await Model.find(filter).sort({ _ord: 1 }).limit(limit).lean();
      res.json(docs.map(toClient));
    }),

    // GET /api/:resource/:id
    getOne: asyncHandler(async (req, res) => {
      const doc = await Model.findOne({ id: req.params.id }).lean();
      if (!doc) throw httpError(404, "Not found");
      res.json(toClient(doc));
    }),

    // POST /api/:resource
    create: asyncHandler(async (req, res) => {
      const data = fromClient(req.body);
      if (!data.id) throw httpError(400, "Record needs an id");
      const doc = await Model.create(data);
      res.status(201).json(toClient(doc));
    }),

    // PATCH /api/:resource/:id — only the fields sent are changed
    update: asyncHandler(async (req, res) => {
      const { id, ...patch } = fromClient(req.body);
      if (!Object.keys(patch).length) return res.json({ ok: true });
      const doc = await Model.findOneAndUpdate({ id: req.params.id }, { $set: patch }, { new: true, runValidators: true, lean: true });
      if (!doc) throw httpError(404, "Not found");
      res.json(toClient(doc));
    }),

    // DELETE /api/:resource/:id
    remove: asyncHandler(async (req, res) => {
      const { deletedCount } = await Model.deleteOne({ id: req.params.id });
      if (!deletedCount) throw httpError(404, "Not found");
      res.json({ ok: true });
    }),
  };
}
