import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ShieldOff, PowerOff } from "lucide-react";
import { isModuleOn, MODULE_CATALOG } from "./config/workspace";
import { useStore } from "./store/store";
import AppLayout, { canAccess } from "./layout/AppLayout";
import { EmptyState, Button } from "./components/ui";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/leads/Leads";
import Pipeline from "./pages/leads/Pipeline";
import CalendarPage from "./pages/Calendar";
import Quotations from "./pages/docs/Quotations";
import Invoices from "./pages/docs/Invoices";
import Projects from "./pages/Projects";
import Payments from "./pages/Payments";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Team from "./pages/Team";
import Vault from "./pages/Vault";
import UsersPage from "./pages/Users";
import Settings from "./pages/Settings";
import OwnerHub from "./pages/owner/OwnerHub";
import Analytics from "./pages/owner/Analytics";
import TodaysPlan from "./pages/sales/TodaysPlan";
import Enquiries from "./pages/sales/Enquiries";
import SalesDesk from "./pages/sales/SalesDesk";
import MonthlyBilling from "./pages/delivery/MonthlyBilling";
import Integrations from "./pages/delivery/Integrations";
import Documents from "./pages/delivery/Documents";
import EmployeePortal from "./pages/team/EmployeePortal";
import SeoTeam from "./pages/team/SeoTeam";
import Funds from "./pages/finance/Funds";
import Contacts from "./pages/crm/Contacts";
import Products from "./pages/crm/Products";
import Tickets from "./pages/crm/Tickets";
import Campaigns from "./pages/crm/Campaigns";
import Automations from "./pages/crm/Automations";
import Apps from "./pages/crm/Apps";
import AuditLog from "./pages/crm/AuditLog";

function Guard({ module, children }) {
  const { user } = useStore();
  if (!isModuleOn(module)) {
    const m = MODULE_CATALOG.find((x) => x.key === module);
    return <EmptyState icon={PowerOff} title={`${m?.label || "This module"} is switched off`} text="This workspace doesn't use this module. An admin can turn it on in Settings → Workspace & Modules."
      action={user.role === "Admin" ? <Button onClick={() => { window.location.href = "/settings?tab=workspace"; }}>Manage modules</Button> : <Button onClick={() => history.back()} variant="secondary">Go back</Button>} />;
  }
  if (!canAccess(user, module)) {
    return <EmptyState icon={ShieldOff} title="You don't have access to this page" text={`Your role (${user.role}) can't open this module. Ask an admin to update your permissions.`} action={<Button onClick={() => history.back()} variant="secondary">Go back</Button>} />;
  }
  return children;
}

function RequireAuth({ children }) {
  const { user } = useStore();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

const ROUTES = [
  ["/", "dashboard", Dashboard], ["/leads", "leads", Leads], ["/pipeline", "leads", Pipeline], ["/calendar", "calendar", CalendarPage],
  ["/quotations", "quotations", Quotations], ["/invoices", "invoices", Invoices], ["/projects", "projects", Projects], ["/payments", "payments", Payments],
  ["/expenses", "expenses", Expenses], ["/reports", "reports", Reports], ["/team", "team", Team], ["/vault", "vault", Vault],
  ["/users", "users", UsersPage], ["/settings", "settings", Settings],
  ["/owner", "owner", OwnerHub], ["/analytics", "analytics", Analytics], ["/todays-plan", "todays-plan", TodaysPlan],
  ["/enquiries", "leads", Enquiries], ["/sales-desk", "sales-desk", SalesDesk], ["/monthly-billing", "monthly-billing", MonthlyBilling],
  ["/integrations", "integrations", Integrations], ["/documents", "projects", Documents], ["/employee-portal", "employee-portal", EmployeePortal],
  ["/seo-team", "seo-team", SeoTeam], ["/funds", "funds", Funds],
  ["/contacts", "contacts", Contacts], ["/products", "products", Products], ["/tickets", "tickets", Tickets], ["/campaigns", "campaigns", Campaigns],
  ["/automations", "automations", Automations], ["/apps", "apps", Apps], ["/audit", "audit", AuditLog],
];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        {ROUTES.map(([path, module, C]) => <Route key={path} path={path} element={<Guard module={module}><C /></Guard>} />)}
        <Route path="/owner-desk" element={<Navigate to="/owner" replace />} />
        <Route path="*" element={<EmptyState title="Page not found" text="The page you're looking for doesn't exist." />} />
      </Route>
    </Routes>
  );
}
