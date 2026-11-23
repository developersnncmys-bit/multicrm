// Staff accounts that can sign in. Passwords are stored only as a bcrypt hash.
import bcrypt from "bcryptjs";
import { defineModel, Str, Mixed } from "./base.js";

export const USER_ROLES = ["Admin", "Sales Manager", "Sales Executive", "Accountant", "Project Manager", "HR", "Support Agent"];

const User = defineModel("users", {
  name: { ...Str, required: [true, "Name is required"] },
  email: { type: String, required: [true, "Email is required"], unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, "Enter a valid email"] },
  passwordHash: { type: String, select: false },
  role: { type: String, enum: USER_ROLES, default: "Sales Executive" },
  branch: Str,
  phone: Str,
  active: { type: Boolean, default: true },
  modules: { type: Mixed, default: undefined }, // optional per-user override { moduleKey: "view" | "edit" }
}, (schema) => {
  schema.methods.setPassword = async function setPassword(plain) {
    if (!plain || String(plain).length < 6) throw Object.assign(new Error("Password must be at least 6 characters"), { status: 400 });
    this.passwordHash = await bcrypt.hash(String(plain), 10);
  };
  schema.methods.checkPassword = function checkPassword(plain) {
    return this.passwordHash ? bcrypt.compare(String(plain || ""), this.passwordHash) : false;
  };
  schema.statics.hash = (plain) => bcrypt.hash(String(plain), 10);
});

export default User;
