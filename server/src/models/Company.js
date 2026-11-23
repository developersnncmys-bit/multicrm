// Organisations that contacts belong to
import { defineModel, Str, ISODate } from "./base.js";

export default defineModel("companies", {
  name: { ...Str, required: [true, "Company name is required"] },
  city: Str,
  phone: Str,
  email: { type: String, lowercase: true, trim: true },
  website: Str,
  gstin: { type: String, uppercase: true, trim: true },
  type: { type: String, enum: ["Customer", "Prospect", "Partner", "Vendor"], default: "Prospect" },
  size: Str,
  ownerId: Str,
  tags: [String],
  address: Str,
  createdAt: ISODate,
});
