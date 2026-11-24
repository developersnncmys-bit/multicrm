// Roles and module keys (copy of the admin panel's rules — see constants.js).
export { ROLES, MODULES } from "./constants.js";

// Settings sections only an Admin may change
export const ADMIN_SETTINGS = ["company", "bank", "docs", "workspace", "invoiceSeries", "offices", "payroll", "portal"];
