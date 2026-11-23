// Shared schema pieces for every CRM record.
//  • `id`   — the string id the frontend uses (e.g. "L1001"); Mongo's own _id is never sent out
//  • `_ord` — list order (lower first). New records get -timestamp so they appear at the top
//  • strict:false — modules add optional fields over time; declared fields are validated/cast,
//    anything else is stored as-is. Dates are ISO strings (the UI compares them as text).
import mongoose from "mongoose";

const { Schema } = mongoose;

export function baseSchema(fields = {}) {
  return new Schema(
    {
      id: { type: String, required: true, unique: true, index: true, trim: true },
      _ord: { type: Number, default: () => -Date.now(), index: true },
      ...fields,
    },
    { strict: false, versionKey: false, minimize: false },
  );
}

// Model whose MongoDB collection name is exactly the frontend collection name (no pluralising)
export function defineModel(collection, fields = {}, configure) {
  if (mongoose.models[collection]) return mongoose.models[collection];
  const schema = baseSchema(fields);
  if (configure) configure(schema);
  return mongoose.model(collection, schema, collection);
}

export const Str = { type: String, trim: true };
export const Num = { type: Number, default: 0 };
export const ISODate = { type: String }; // "YYYY-MM-DD" or full ISO timestamp
export const Mixed = Schema.Types.Mixed;
