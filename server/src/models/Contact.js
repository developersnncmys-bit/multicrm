// People: customers, prospects, partners and vendors
import { defineModel, Str, ISODate } from "./base.js";

export const CONTACT_TYPES = ["Customer", "Prospect", "Partner", "Vendor"];

export default defineModel("contacts", {
  name: { ...Str, required: [true, "Contact name is required"] },
  companyId: Str,
  designation: Str,
  phone: Str,
  email: { type: String, lowercase: true, trim: true },
  city: Str,
  type: { type: String, enum: CONTACT_TYPES, default: "Prospect" },
  ownerId: Str,
  tags: [String],
  leadIds: [String],
  notes: Str,
  whatsappOptIn: { type: Boolean, default: true },
  emailOptIn: { type: Boolean, default: true },
  createdAt: ISODate,
  lastContact: ISODate,
});
