// Roles and module keys are shared with the frontend so both sides apply the same rules.
export { ROLES, MODULES } from "../../../src/config/constants.js";

// Settings sections only an Admin may change
export const ADMIN_SETTINGS = ["company", "bank", "docs", "workspace", "invoiceSeries", "offices", "payroll", "portal"];
