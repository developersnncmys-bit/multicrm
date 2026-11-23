// Quotations and invoices share the same line-item + client shape
import { defineModel, Str, Num, ISODate, Mixed } from "./base.js";

const lineItems = [Mixed]; // { id, desc, hsn, qty, rate }
const client = { type: Mixed, default: {} }; // { name, company, email, phone, address, gstin }

export const Quotation = defineModel("quotations", {
  number: { ...Str, required: [true, "Quotation number is required"] },
  leadId: Str,
  client,
  date: ISODate,
  validUntil: ISODate,
  items: lineItems,
  discountPct: Num,
  gstPct: { type: Number, default: 18 },
  interState: { type: Boolean, default: false },
  status: { type: String, default: "Draft" },
  revision: { type: Number, default: 1 },
  negotiation: [Mixed],
});

export const Invoice = defineModel("invoices", {
  number: { ...Str, required: [true, "Invoice number is required"] },
  type: { type: String, enum: ["Tax", "Proforma"], default: "Tax" },
  leadId: Str,
  client,
  date: ISODate,
  dueDate: ISODate,
  items: lineItems,
  discountPct: Num,
  gstPct: { type: Number, default: 18 },
  interState: { type: Boolean, default: false },
  status: { type: String, default: "Draft" },
  payments: [Mixed], // { id, amount, date, mode, ref, note }
  branch: Str,
});
