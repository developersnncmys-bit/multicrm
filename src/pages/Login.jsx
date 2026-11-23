import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, ArrowRight, ArrowLeft, CheckCircle2, BarChart3, Receipt, Users, ShieldCheck, KeyRound } from "lucide-react";
import { useStore } from "../store/store";
import { apiMode } from "../api/client";
import { BRAND } from "../config/brand";
import { Button } from "../components/ui";

const DEMO = [
  { role: "Admin", email: "admin@nnc.in", pw: "admin123" },
  { role: "Sales Manager", email: "kiran@nnc.in", pw: "demo123" },
  { role: "Accountant", email: "sowmya@nnc.in", pw: "demo123" },
  { role: "Support Agent", email: "meena@nnc.in", pw: "demo123" },
];

export default function Login() {
  const { user, login } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState(apiMode ? "" : "admin@nnc.in");
  const [pw, setPw] = useState(apiMode ? "" : "admin123");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  if (user) return <Navigate to={loc.state?.from || "/"} replace />;

  const submit = (e) => {
    e.preventDefault();
    if (!email || !pw) return setErr("Enter your email and password");
    setBusy(true); setErr("");
    setTimeout(async () => {
      const res = await login(email, pw);
      setBusy(false);
      if (res) setErr(res); else nav(loc.state?.from || "/", { replace: true });
    }, apiMode ? 0 : 450);
  };

  return (
    <div className="grid min-h-screen bg-white dark:bg-slate-950 lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-600/40 blur-3xl" />
        <div className="absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-lg shadow-brand-900/40">
            <svg viewBox="0 0 32 32" className="h-6 w-6"><path d="M9 23V9l14 14V9" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="text-xl font-extrabold tracking-tight">{BRAND.productName}</span>
        </div>
        <div className="relative my-auto max-w-lg">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Run your entire agency<br />from <span className="bg-gradient-to-r from-brand-300 to-brand-100 bg-clip-text text-transparent">one dashboard.</span></h1>
          <p className="mt-4 text-lg text-slate-300">Manage enquiries across Bangalore, Mumbai &amp; Mysore. Track every lead from first contact to project delivery.</p>
          <ul className="mt-8 space-y-3 text-slate-200">
            {["Visual sales pipeline with drag & drop", "GST-ready quotations & invoices in one click", "Live P&L, collections and branch reports", "Attendance, roles & secure credential vault"].map((t) => (
              <li key={t} className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-brand-300" />{t}</li>
            ))}
          </ul>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[[Users, "2,400+", "Leads tracked"], [Receipt, "₹3.2Cr", "Invoiced"], [BarChart3, "38%", "Faster closing"]].map(([I, v, l]) => (
              <div key={l} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <I className="h-5 w-5 text-brand-300" />
                <p className="mt-2 text-xl font-bold">{v}</p>
                <p className="text-xs text-slate-400">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} {BRAND.productName}. All rights reserved.</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600"><svg viewBox="0 0 32 32" className="h-5 w-5"><path d="M9 23V9l14 14V9" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">{BRAND.productName}</span>
          </div>
          {!forgot ? (
            <>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Welcome back</h2>
              <p className="mt-2 text-slate-500">Sign in to continue to your workspace.</p>
              <form onSubmit={submit} className="mt-8 space-y-4">
                <div>
                  <label className="label">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input h-12 pl-10" placeholder="you@company.com" autoFocus />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="label">Password</label>
                    <button type="button" onClick={() => setForgot(true)} className="mb-1.5 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Forgot password?</button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} className="input h-12 pl-10 pr-11" placeholder="••••••••" />
                    <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><input type="checkbox" defaultChecked className="h-4 w-4 rounded accent-brand-600" />Keep me signed in</label>
                {err && <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{err}</p>}
                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>
              {!apiMode && <div className="mt-8 rounded-2xl border border-dashed border-slate-200 p-4 dark:border-slate-700">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Demo accounts — click to fill</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {DEMO.map((d) => (
                    <button key={d.role} onClick={() => { setEmail(d.email); setPw(d.pw); setErr(""); }} className="rounded-xl border border-slate-200 px-3 py-2 text-left transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-700 dark:hover:bg-brand-500/5">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{d.role}</p>
                      <p className="truncate text-[11px] text-slate-500">{d.email}</p>
                    </button>
                  ))}
                </div>
              </div>}
            </>
          ) : (
            <ForgotFlow onBack={() => setForgot(false)} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Forgot password: email → OTP → new password → done ── */
const DEMO_OTP = "123456";
function pwScore(pw) {
  let n = 0;
  if (pw.length >= 8) n++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) n++;
  if (/\d/.test(pw)) n++;
  if (/[^A-Za-z0-9]/.test(pw)) n++;
  return n;
}
function ForgotFlow({ onBack }) {
  const { db, update } = useStore();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [timer, setTimer] = useState(0);
  const boxes = useRef([]);
  useEffect(() => { if (timer <= 0) return undefined; const id = setTimeout(() => setTimer((t) => t - 1), 1000); return () => clearTimeout(id); }, [timer]);
  useEffect(() => { if (step === "otp") setTimeout(() => boxes.current[0]?.focus(), 30); }, [step]);

  const fake = (fn) => { setBusy(true); setErr(""); setTimeout(() => { setBusy(false); fn(); }, 500); };
  const sendOtp = (e) => {
    e?.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email address");
    fake(() => {
      if (!db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) return setErr("No account found with this email");
      setOtp(["", "", "", "", "", ""]); setStep("otp"); setTimer(30);
      return null;
    });
    return null;
  };
  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, "");
    if (d.length > 1) { // pasted code
      const arr = d.slice(0, 6).split("");
      const next = [...otp]; arr.forEach((c, k) => { if (i + k < 6) next[i + k] = c; });
      setOtp(next); boxes.current[Math.min(5, i + arr.length)]?.focus(); return;
    }
    const next = [...otp]; next[i] = d; setOtp(next); setErr("");
    if (d && i < 5) boxes.current[i + 1]?.focus();
  };
  const verify = (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) return setErr("Enter all 6 digits");
    fake(() => (code === DEMO_OTP ? setStep("reset") : setErr("That code is incorrect. Check and try again.")));
    return null;
  };
  const reset = (e) => {
    e.preventDefault();
    if (pw.length < 8 || !/\d/.test(pw)) return setErr("Use at least 8 characters including a number");
    if (pw !== pw2) return setErr("Passwords don't match");
    fake(() => {
      const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
      if (u) update("users", u.id, { password: pw });
      setStep("done");
    });
    return null;
  };
  const sc = pwScore(pw);
  const steps = ["email", "otp", "reset"];
  const errBox = err && <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{err}</p>;
  const icon = (I) => <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><I className="h-6 w-6" /></span>;
  return (
    <div>
      {step !== "done" && (
        <div className="mb-8 flex items-center gap-2">
          {steps.map((s, i) => <span key={s} className={`h-1.5 flex-1 rounded-full ${steps.indexOf(step) >= i ? "bg-brand-600" : "bg-slate-200 dark:bg-slate-700"}`} />)}
        </div>
      )}
      {step === "email" && (
        <>
          {icon(Mail)}
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Forgot password?</h2>
          <p className="mt-2 text-slate-500">Enter your account email and we will send you a 6-digit code.</p>
          <form onSubmit={sendOtp} className="mt-8 space-y-4">
            <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} className="input h-12" placeholder="you@company.com" autoFocus />
            {errBox}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Sending…" : "Send OTP"}</Button>
          </form>
        </>
      )}
      {step === "otp" && (
        <>
          {icon(ShieldCheck)}
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Check your email</h2>
          <p className="mt-2 text-slate-500">We sent a 6-digit code to <b className="text-slate-700 dark:text-slate-200">{email}</b>.</p>
          <form onSubmit={verify} className="mt-8 space-y-4">
            <div className="flex justify-between gap-2">
              {otp.map((d, i) => (
                <input key={i} ref={(el) => { boxes.current[i] = el; }} value={d} inputMode="numeric" maxLength={6} aria-label={`Digit ${i + 1}`}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Backspace" && !otp[i] && i > 0) boxes.current[i - 1]?.focus(); }}
                  className="input h-14 w-full text-center text-2xl font-bold" />
              ))}
            </div>
            <p className="rounded-lg bg-slate-50 py-2 text-center text-xs text-slate-500 dark:bg-slate-800">Demo OTP: <b>{DEMO_OTP}</b></p>
            {errBox}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Verifying…" : "Verify code"}</Button>
            <p className="text-center text-sm text-slate-500">
              Did not get it?{" "}
              {timer > 0 ? <span>Resend in {timer}s</span> : <button type="button" onClick={() => { setTimer(30); setOtp(["", "", "", "", "", ""]); setErr(""); boxes.current[0]?.focus(); }} className="font-semibold text-brand-600 hover:underline dark:text-brand-300">Resend OTP</button>}
            </p>
          </form>
        </>
      )}
      {step === "reset" && (
        <>
          {icon(KeyRound)}
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Set a new password</h2>
          <p className="mt-2 text-slate-500">Use at least 8 characters with a number.</p>
          <form onSubmit={reset} className="mt-8 space-y-4">
            <div className="relative">
              <input type={show ? "text" : "password"} value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} className="input h-12 pr-11" placeholder="New password" autoFocus />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < sc ? ["bg-rose-500", "bg-amber-400", "bg-emerald-500", "bg-emerald-600"][sc - 1] : "bg-slate-200 dark:bg-slate-700"}`} />)}</div>
              <span className="w-16 text-right text-xs font-semibold text-slate-500">{["Too weak", "Weak", "Fair", "Good", "Strong"][sc]}</span>
            </div>
            <input type={show ? "text" : "password"} value={pw2} onChange={(e) => { setPw2(e.target.value); setErr(""); }} className="input h-12" placeholder="Confirm new password" />
            {errBox}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Saving…" : "Reset password"}</Button>
          </form>
        </>
      )}
      {step === "done" && (
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"><CheckCircle2 className="h-8 w-8" /></span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Password updated</h2>
          <p className="mt-2 text-slate-500">You can now sign in with your new password.</p>
          <Button size="lg" className="mt-8 w-full" onClick={onBack}>Back to sign in</Button>
        </div>
      )}
      {step !== "done" && <button type="button" onClick={onBack} className="mt-6 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><ArrowLeft className="h-4 w-4" />Back to sign in</button>}
    </div>
  );
}
