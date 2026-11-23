// Tasks, expenses, employees, support tickets, products and campaigns
import { defineModel, Str, Num, ISODate, Mixed } from "./base.js";

export const Task = defineModel("tasks", {
  title: { ...Str, required: [true, "Task title is required"] },
  type: Str,
  date: ISODate,
  time: Str,
  leadId: Str,
  assigneeId: Str,
  done: { type: Boolean, default: false },
  notes: Str,
});

export const Expense = defineModel("expenses", {
  date: ISODate,
  category: Str,
  description: { ...Str, required: [true, "Description is required"] },
  vendor: Str,
  amount: { type: Number, required: true, min: [0, "Amount can't be negative"] },
  mode: Str,
  branch: Str,
  status: { type: String, enum: ["Paid", "Pending"], default: "Paid" },
});

export const Employee = defineModel("employees", {
  empId: Str,
  name: { ...Str, required: [true, "Employee name is required"] },
  email: { type: String, lowercase: true, trim: true },
  phone: Str,
  department: Str,
  designation: Str,
  branch: Str,
  joinDate: ISODate,
  salary: Num,
  status: { type: String, default: "Active" },
});

export const Ticket = defineModel("tickets", {
  number: Str,
  subject: { ...Str, required: [true, "Subject is required"] },
  contactId: Str,
  contactName: Str,
  company: Str,
  phone: Str,
  channel: Str,
  category: Str,
  priority: { type: String, enum: ["Urgent", "High", "Medium", "Low"], default: "Medium" },
  status: { type: String, enum: ["Open", "In Progress", "Waiting on Customer", "Resolved", "Closed"], default: "Open" },
  assigneeId: Str,
  createdAt: ISODate,
  dueAt: ISODate,
  resolvedAt: ISODate,
  rating: { type: Number, min: 1, max: 5 },
  thread: [Mixed],
});

export const Product = defineModel("products", {
  name: { ...Str, required: [true, "Name is required"] },
  sku: Str,
  category: Str,
  type: { type: String, enum: ["Service", "Product"], default: "Service" },
  unit: Str,
  price: { type: Number, min: 0, default: 0 },
  cost: { type: Number, min: 0, default: 0 },
  gst: { type: Number, default: 18 },
  hsn: Str,
  stock: { type: Number, default: null },
  reorder: Num,
  active: { type: Boolean, default: true },
});

export const Campaign = defineModel("campaigns", {
  name: { ...Str, required: [true, "Campaign name is required"] },
  channel: { type: String, enum: ["WhatsApp", "Email", "SMS"], default: "WhatsApp" },
  status: { type: String, default: "Draft" },
  audience: Str,
  audienceSize: Num,
  sent: Num, delivered: Num, read: Num, clicked: Num, replied: Num, leads: Num,
  scheduledAt: ISODate,
  message: Str,
});
