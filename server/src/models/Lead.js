// Sales leads / enquiries
import { defineModel, Str, Num, ISODate, Mixed } from "./base.js";

export const LEAD_STAGES = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"];

export default defineModel("leads", {
  name: { ...Str, required: [true, "Lead name is required"] },
  company: Str,
  phone: Str,
  email: { type: String, lowercase: true, trim: true },
  source: Str,
  service: Str,
  services: [String],
  branch: Str,
  city: Str,
  stage: { type: String, enum: LEAD_STAGES, default: "New" },
  priority: { type: String, enum: ["Hot", "Warm", "Cold"], default: "Warm" },
  value: Num,
  ownerId: Str,
  createdAt: ISODate,
  nextFollowUp: ISODate,
  lostReason: Str,
  requirement: Str,
  activities: [Mixed],
});
