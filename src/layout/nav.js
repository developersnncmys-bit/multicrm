import {
  LayoutDashboard, Users, KanbanSquare, CalendarDays, FileText, Receipt, FolderKanban, Wallet, CreditCard, BarChart3, UserCheck, KeyRound,
  ShieldCheck, Settings, Crown, ClipboardList, Inbox, Headset, Repeat, Plug, FolderOpen, MessagesSquare, SearchCheck, PiggyBank, BrainCircuit, Trophy, Building2,
  Contact, Package, LifeBuoy, Megaphone, Workflow, Blocks, History,
} from "lucide-react";
import { term } from "../config/workspace";

// `path` may include a query (e.g. ?tab=) — active state compares pathname + tab.
// `term` makes the label follow the industry vocabulary (Projects → Bookings / Admissions / Orders…).
// Items whose module is switched off for the workspace are hidden automatically (see canAccess).
export const NAV = [
  { section: "Overview", items: [
    { label: "Dashboard", path: "/", icon: LayoutDashboard, module: "dashboard" },
    { label: "Owner View", path: "/owner", icon: Crown, module: "owner" },
    { label: "Owner's Desk", path: "/owner-desk", icon: ClipboardList, module: "owner" },
    { label: "Today's Plan", path: "/todays-plan", icon: ClipboardList, module: "todays-plan" },
    { label: "Calendar", path: "/calendar", icon: CalendarDays, module: "calendar" },
  ]},
  { section: "Sales", items: [
    { label: "All Leads", path: "/leads", icon: Users, module: "leads", badge: "leads" },
    { label: "Enquiries Inbox", path: "/enquiries", icon: Inbox, module: "leads", badge: "enquiries" },
    { label: "Pipeline", path: "/pipeline", icon: KanbanSquare, module: "leads" },
    { label: "Contacts & Companies", path: "/contacts", icon: Contact, module: "contacts" },
    { label: "Sales Desk", path: "/sales-desk", icon: Headset, module: "sales-desk" },
    { label: "Quotations", path: "/quotations", icon: FileText, module: "quotations" },
    { label: "Products & Price List", path: "/products", icon: Package, module: "products", term: (t) => `${t("product")}s & Price List` },
  ]},
  { section: "Marketing", items: [
    { label: "Campaigns", path: "/campaigns", icon: Megaphone, module: "campaigns" },
  ]},
  { section: "Operations", items: [
    { label: "Projects", path: "/projects", icon: FolderKanban, module: "projects", term: (t) => t("projects") },
    { label: "Support Tickets", path: "/tickets", icon: LifeBuoy, module: "tickets", badge: "tickets" },
    { label: "Recurring & Extras", path: "/monthly-billing", icon: Repeat, module: "monthly-billing" },
    { label: "Documents", path: "/documents", icon: FolderOpen, module: "projects" },
    { label: "Client Project Vault", path: "/integrations", icon: Plug, module: "integrations" },
    { label: "SEO & Ads Delivery", path: "/seo-team", icon: SearchCheck, module: "seo-team" },
    { label: "Employee Portal", path: "/employee-portal", icon: MessagesSquare, module: "employee-portal" },
  ]},
  { section: "Finance", items: [
    { label: "Invoices & Accounting", path: "/invoices", icon: Receipt, module: "invoices", badge: "overdue" },
    { label: "Payment Tracker", path: "/payments", icon: CreditCard, module: "payments" },
    { label: "Expenses", path: "/expenses", icon: Wallet, module: "expenses" },
    { label: "Reserve Funds", path: "/funds", icon: PiggyBank, module: "funds" },
  ]},
  { section: "Analytics", items: [
    { label: "Business Intelligence", path: "/analytics", icon: BrainCircuit, module: "analytics" },
    { label: "P&L & Reports", path: "/reports", icon: BarChart3, module: "reports" },
    { label: "Leaderboard", path: "/reports?tab=leaderboard", icon: Trophy, module: "reports" },
    { label: "Branch Reports", path: "/reports?tab=branches", icon: Building2, module: "reports" },
  ]},
  { section: "Team", items: [
    { label: "Attendance & Payroll", path: "/team", icon: UserCheck, module: "team" },
    { label: "Company Credentials", path: "/vault", icon: KeyRound, module: "vault" },
  ]},
  { section: "Admin", items: [
    { label: "Automations", path: "/automations", icon: Workflow, module: "automations" },
    { label: "Apps & Integrations", path: "/apps", icon: Blocks, module: "apps" },
    { label: "Audit Log", path: "/audit", icon: History, module: "audit" },
    { label: "Users & Permissions", path: "/users", icon: ShieldCheck, module: "users" },
    { label: "Settings", path: "/settings", icon: Settings, module: "settings" },
  ]},
];

export const navLabel = (it) => (it.term ? it.term(term) : it.label);
