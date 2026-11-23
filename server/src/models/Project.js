// Delivery work after a deal is won (shown as Projects / Bookings / Orders… per industry)
import { defineModel, Str, Num, ISODate, Mixed } from "./base.js";

export default defineModel("projects", {
  name: { ...Str, required: [true, "Project name is required"] },
  client: Str,
  contact: Str,
  phone: Str,
  leadId: Str,
  service: Str,
  stage: Str, // industry-specific stage list
  startDate: ISODate,
  deadline: ISODate,
  value: Num,
  managerId: Str,
  team: [String],
  branch: Str,
  milestones: [Mixed], // { id, title, done }
  notes: Str,
});
