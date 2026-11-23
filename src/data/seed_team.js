// Demo data for the Team area: employee portal, chat, work logs, payroll.
import { addDays, todayISO, toISO } from "../utils/format";

let s = 7;
const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (a, b) => Math.floor(rnd() * (b - a + 1)) + a;
const isoAt = (date, h, m = 0) => { const d = new Date(`${date}T00:00:00`); d.setHours(h, m, 0, 0); return d.toISOString(); };

export const PORTAL_ROLES = {
  "Digital Marketing": ["SEO analyst", "SEO expert", "Google Ads expert", "Graphic designer", "Video editor"],
  "Development & design": ["App developer", "Website developer", "Backend developer", "Full stack developer", "UI/UX designer", "Tester", "Team member"],
  Accounts: ["Accountant"],
};
export const ALL_PORTAL_ROLES = Object.values(PORTAL_ROLES).flat();
export const roleTeam = (r) => Object.keys(PORTAL_ROLES).find((k) => PORTAL_ROLES[k].includes(r)) || "Development & design";

export const WORK_TYPES = [
  "Backlinks", "Blog", "GMB post", "On-page SEO", "Ads changes", "Negative keywords", "New ad", "Feature", "Page", "App build", "Deploy", "Bug fix",
  "Screens", "Design revision", "Indexing", "Poster", "Logo", "Visiting card", "Brochure", "Corporate video", "Instagram video", "Motion graphics",
  "Test run", "Bug raised", "Invoice", "Meeting", "Daily ads report", "Web content", "Blog content", "Landing page content", "Campaign setup",
  "Social posts", "Position tracking", "Monthly report", "Documentation", "Keyword research", "Meta Ads", "GSC / GA4 / GTM tracking",
];

const DES_ROLE = {
  "Business Development Exec": "Team member", "Sales Manager": "Team member", "Full Stack Developer": "Full stack developer", "React Developer": "Website developer",
  "Backend Developer": "Backend developer", "UI/UX Designer": "UI/UX designer", "Graphic Designer": "Graphic designer", "SEO Specialist": "SEO expert",
  "Performance Marketer": "Google Ads expert", Accountant: "Accountant", "HR Executive": "Team member", "Operations Head": "Team member",
};

export default function seedTeam(db) {
  s = 7;
  const today = todayISO();
  const projects = db.projects || [];
  const pids = projects.map((p) => p.id);

  // ── Employees enrichment ──
  const employees = (db.employees || []).map((e, i) => {
    const salary = e.salary;
    const basic = Math.round(salary * 0.4), hra = Math.round(salary * 0.2), da = Math.round(salary * 0.1);
    const main = DES_ROLE[e.designation] || "Team member";
    const prev = Math.round((salary * 0.88) / 1000) * 1000;
    return {
      ...e,
      portalStatus: i === 10 || i === 11 ? "Pending" : i === 9 ? "Inactive" : "Active",
      portalRoles: i === 2 ? [main, "Tester"] : [main],
      projects: pids.length ? [pids[i % pids.length], pids[(i + 3) % pids.length]].filter((v, k, a) => a.indexOf(v) === k) : [],
      lastSignIn: i === 10 || i === 11 ? "" : new Date(Date.now() - int(1, 60 * 30) * 60000).toISOString(),
      isPlansLead: i === 2,
      employmentType: i % 4 === 3 ? "Probationary" : "Permanent",
      shiftStart: "09:30", shiftEnd: "18:30", grace: 15,
      dob: toISO(new Date(1990 + int(0, 10), int(0, 11), int(1, 28))),
      salaryParts: { basic, hra, da, special: salary - basic - hra - da },
      pf: salary > 15000, esi: salary <= 21000, pt: salary > 15000,
      hikes: i % 3 === 0 ? [{ id: `h${i}`, from: prev, to: salary, date: addDays(today, -int(60, 300)), pct: Math.round(((salary - prev) / prev) * 1000) / 10, remarks: "Annual appraisal" }] : [],
    };
  });
  const active = employees.filter((e) => e.portalStatus === "Active");

  // ── Attendance: add occasional Late today + a Holiday for a past date ──
  const attendance = { ...(db.attendance || {}) };
  Object.keys(attendance).forEach((k) => {
    const r = attendance[k];
    if (r.status === "Present" && r.in && r.in >= "09:46") attendance[k] = { ...r, status: "Late" };
  });
  let holiday = addDays(today, -12);
  while (new Date(`${holiday}T00:00:00`).getDay() === 0) holiday = addDays(holiday, -1);
  employees.forEach((e) => { attendance[`${holiday}|${e.id}`] = { status: "Holiday", in: "", out: "" }; });

  // ── Salary records (last 2 months, paid) ──
  const salaryRecords = [];
  [1, 2].forEach((m) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - m);
    const month = toISO(d).slice(0, 7);
    employees.filter((e) => e.status === "Active").forEach((e) => {
      const gross = e.salary - (rnd() > 0.8 ? Math.round(e.salary / 26) : 0);
      const ded = (e.pf ? Math.round(e.salaryParts.basic * 0.12) : 0) + (e.pt ? 200 : 0) + (e.esi && gross <= 21000 ? Math.round(gross * 0.0075) : 0);
      salaryRecords.push({ id: `sr${m}${e.id}`, empId: e.id, month, gross, deductions: ded, net: gross - ded, status: "Paid", paidOn: `${month}-28` });
    });
  });

  // ── Messages ──
  const messages = [];
  const LINES_IN = ["Good morning sir, started on the homepage changes.", "Client sent new content, updating today.", "Need the hosting login for this project.", "Done with the blog posts for this week.", "Can we push the deadline by 2 days?", "Uploaded the designs for review.", "Bug fixed and deployed to staging.", "Ads report sent to the client."];
  const LINES_OUT = ["Great, keep me posted.", "Please share once it's live.", "Shared in the credential vault.", "Okay, approved.", "Let's discuss in the 4 PM call.", "Thanks, looks good!"];
  active.slice(0, 6).forEach((e, i) => {
    let t = Date.now() - (i + 1) * 3600e3 * int(2, 20);
    for (let k = 0; k < int(3, 6); k++) {
      const mine = k % 2 === 1;
      messages.push({ id: `m${i}_${k}`, thread: e.id, from: mine ? "admin" : e.id, text: mine ? pick(LINES_OUT) : pick(LINES_IN), at: new Date(t).toISOString(), read: mine || i > 2 || k < 2 });
      t += int(3, 90) * 60000;
    }
  });
  const dev = employees.filter((e) => roleTeam(e.portalRoles[0]) === "Development & design");
  const dm = employees.filter((e) => roleTeam(e.portalRoles[0]) === "Digital Marketing");
  const GROUP = {
    "group:Development": ["Staging server is back up.", "Who is picking the Metro Motors bug?", "I'll take it after lunch.", "Please update your work log before 7 PM.", "Deployed v2 of the booking flow."],
    "group:Digital Marketing": ["Monthly reports due on the 5th.", "GMB posts scheduled for the week.", "CPC went up on two campaigns, checking.", "New backlinks list shared in the drive."],
  };
  Object.entries(GROUP).forEach(([thread, lines], gi) => {
    const pool = gi === 0 ? dev : dm;
    lines.forEach((text, k) => messages.push({ id: `g${gi}_${k}`, thread, from: k === 3 && gi === 0 ? "admin" : (pool[k % Math.max(pool.length, 1)] || employees[0])?.id, text, at: new Date(Date.now() - (lines.length - k) * 47 * 60000 - gi * 3600e3).toISOString(), read: k < lines.length - 1 }));
  });

  // ── Day plans (today) ──
  const PLAN = ["Fix header responsiveness", "Client call at 11", "Write 2 blog posts", "Update work log", "Review designs", "Deploy to staging", "Prepare monthly report", "Keyword research for new client", "Create 3 posters", "Test checkout flow"];
  const dayPlans = active.slice(0, 8).map((e, i) => ({
    id: `dp${i}`, empId: e.id, date: today,
    items: Array.from({ length: int(3, 5) }, (_, k) => ({ text: PLAN[(i + k * 3) % PLAN.length], done: rnd() > 0.5, addedAt: isoAt(today, 9, 40 + k) })),
  }));

  // ── Work logs (last 30 days) ──
  const workLogs = [];
  for (let i = 0; i < 125; i++) {
    const e = pick(active);
    const date = addDays(today, -int(0, 30));
    if (new Date(`${date}T00:00:00`).getDay() === 0) continue;
    const type = roleTeam(e.portalRoles[0]) === "Digital Marketing" ? pick(WORK_TYPES.slice(0, 7).concat(WORK_TYPES.slice(26, 38))) : pick(WORK_TYPES.slice(7, 26));
    workLogs.push({ id: `w${i}`, empId: e.id, date, projectId: pick(e.projects.length ? e.projects : pids) || "", type, summary: `${type} — ${pick(["completed", "in progress", "first draft", "revisions done", "shared with client"])}`, link: rnd() > 0.6 ? "https://drive.google.com/" : "", hours: pick([1, 1.5, 2, 2.5, 3, 4]) });
  }

  const BUG_ST = ["Open", "Fixed to verify", "Verified", "Not a bug", "Reopened", "Needs info"];
  const bugs = Array.from({ length: 12 }, (_, i) => ({
    id: `b${i}`, projectId: pick(pids) || "", title: pick(["Menu not closing on mobile", "Form submits twice", "Images not loading on Safari", "Wrong GST on invoice PDF", "Slow page load", "Login redirect loop", "Typo on about page", "Payment webhook timeout"]),
    severity: pick(["Low", "Medium", "High", "Critical"]), status: BUG_ST[i % BUG_ST.length], raisedBy: pick(active)?.id, assignedTo: pick(dev.length ? dev : active)?.id, at: new Date(Date.now() - int(1, 25) * 86400e3).toISOString(),
  }));
  const blockers = [
    "Waiting for client content", "Need hosting credentials", "Payment gateway KYC pending", "Client hasn't approved the design",
  ].map((text, i) => ({ id: `bl${i}`, empId: pick(active)?.id, projectId: pick(pids) || "", text, at: new Date(Date.now() - int(1, 6) * 86400e3).toISOString(), resolved: i === 3 }));

  const MOM = ["MOM sent", "MOM written, not sent", "Notes only"];
  const portalMeetings = Array.from({ length: 8 }, (_, i) => ({
    id: `pm${i}`, empId: pick(active)?.id, client: projects[i % Math.max(projects.length, 1)]?.client || "Client", date: addDays(today, -int(0, 20)),
    notes: pick(["Discussed homepage layout and colours.", "Client wants WhatsApp chat button.", "Agreed on 3 revisions for the logo.", "Reviewed ad performance, increase budget.", "Requirement walkthrough for the app."]),
    momStatus: MOM[i % 3],
  }));
  const portalDocs = Array.from({ length: 10 }, (_, i) => ({
    id: `pd${i}`, name: pick(["Homepage_v3.fig", "Content_brief.docx", "Keyword_list.xlsx", "Logo_final.png", "Ads_report_Oct.pdf", "API_docs.pdf", "Brochure_draft.pdf"]),
    from: pick(active)?.id, to: pick(active)?.id, projectId: pick(pids) || "", at: new Date(Date.now() - int(1, 20) * 86400e3).toISOString(), seen: rnd() > 0.4,
  }));
  const portalTasks = Array.from({ length: 15 }, (_, i) => ({
    id: `pt${i}`, empId: pick(active)?.id, title: pick(["Fix contact form", "Design Diwali poster", "Set up GA4", "Write 4 blogs", "Update pricing page", "Prepare SEO audit", "Test payment flow", "Create reels for Instagram", "Migrate hosting"]),
    project: projects[i % Math.max(projects.length, 1)]?.client || "", due: addDays(today, int(-5, 10)), priority: pick(["High", "Medium", "Low"]), status: ["To do", "Doing", "Done"][i % 3],
  }));

  return {
    employees, attendance, salaryRecords, messages, dayPlans, workLogs, bugs, blockers, portalMeetings, portalDocs, portalTasks,
    settings: { portal: { needsApproval: true, companyEmailOnly: false, devsSeePasswords: false } },
  };
}
