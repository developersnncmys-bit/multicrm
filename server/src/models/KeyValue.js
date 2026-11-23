// Single-document stores: settings, attendance register, app connections.
// _id is the store name; `value` is an object keyed by section / date|employee / app.
import mongoose from "mongoose";

const schema = new mongoose.Schema(
  { _id: { type: String }, value: { type: mongoose.Schema.Types.Mixed, default: {} } },
  { versionKey: false, minimize: false },
);

const KeyValue = mongoose.models.kv || mongoose.model("kv", schema, "kv");
export const KV_STORES = ["settings", "attendance", "appConnections"];

KeyValue.read = async (name) => (await KeyValue.findById(name).lean())?.value ?? {};
KeyValue.setPath = (name, path, value) => KeyValue.updateOne({ _id: name }, value === undefined ? { $unset: { [`value.${path}`]: "" } } : { $set: { [`value.${path}`]: value } }, { upsert: true });
KeyValue.replace = (name, value) => KeyValue.updateOne({ _id: name }, { $set: { value } }, { upsert: true });

export default KeyValue;
