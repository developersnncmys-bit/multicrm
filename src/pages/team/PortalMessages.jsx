import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Megaphone, Search, CheckCheck, Check, MessagesSquare } from "lucide-react";
import { useStore } from "../../store/store";
import { Avatar, Button, Card, EmptyState, Field, Modal, Textarea, cx } from "../../components/ui";
import { useToast } from "../../components/ui/Toast";
import { fmtDate, timeAgo } from "../../utils/format";

const REPLIES = ["Okay sir 👍", "Sure, will do.", "Noted, updating by evening.", "Thank you!", "On it now.", "Will share the link shortly."];
const fmtTime = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export default function PortalMessages() {
  const { db, add, update, notify } = useStore();
  const toast = useToast();
  const employees = (db.employees || []).filter((e) => e.portalStatus !== "Pending");
  const messages = db.messages || [];
  const [active, setActive] = useState(null);
  const [q, setQ] = useState("");
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(null);
  const [ann, setAnn] = useState(null);
  const endRef = useRef(null);

  const threads = useMemo(() => employees.map((e) => {
    const list = messages.filter((m) => m.thread === e.id);
    const last = list.reduce((a, m) => (!a || m.at > a.at ? m : a), null);
    return { e, last, unread: list.filter((m) => !m.read && m.from !== "admin").length };
  }).filter((t) => !q || t.e.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.last?.at || "").localeCompare(a.last?.at || "")), [employees, messages, q]);

  const current = active === "" ? null : active || threads.find((t) => t.last)?.e.id || null;
  const emp = employees.find((e) => e.id === current);
  const convo = useMemo(() => messages.filter((m) => m.thread === current).sort((a, b) => a.at.localeCompare(b.at)), [messages, current]);

  useEffect(() => {
    convo.filter((m) => !m.read && m.from !== "admin").forEach((m) => update("messages", m.id, { read: true }));
    setTimeout(() => endRef.current?.scrollIntoView({ block: "end" }), 20);
  }, [current, convo.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = () => {
    const t = text.trim();
    if (!t || !current) return;
    const outId = add("messages", { thread: current, from: "admin", text: t, at: new Date().toISOString(), read: false }, "m").id;
    setText("");
    const who = current;
    // Demo: employee reads it, types and replies
    setTimeout(() => update("messages", outId, { read: true }), 900);
    setTimeout(() => setTyping(who), 1000);
    setTimeout(() => {
      setTyping(null);
      add("messages", { thread: who, from: who, text: REPLIES[Math.floor(Math.random() * REPLIES.length)], at: new Date().toISOString(), read: false }, "m");
    }, 2600);
  };

  // Group conversation by day
  let lastDay = null;

  return (
    <>
      <Card className="grid h-[calc(100vh-17rem)] min-h-[480px] overflow-hidden md:grid-cols-[300px_1fr]">
        <div className={cx("flex min-h-0 flex-col border-r border-slate-100 dark:border-slate-800", current && "hidden md:flex")}>
          <div className="space-y-2 border-b border-slate-100 p-3 dark:border-slate-800">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people…" className="input pl-9" />
            </div>
            <Button variant="soft" size="sm" icon={Megaphone} className="w-full" onClick={() => setAnn("")}>Send an announcement</Button>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5">
            {threads.map(({ e, last, unread }) => (
              <button key={e.id} onClick={() => setActive(e.id)} className={cx("flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition", current === e.id ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50")}>
                <span className="relative"><Avatar name={e.name} size="sm" />{e.lastSignIn && Date.now() - new Date(e.lastSignIn) < 3600e3 && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{e.name}</span>{last && <span className="shrink-0 text-[10.5px] text-slate-400">{timeAgo(last.at)}</span>}</span>
                  <span className="flex items-center justify-between gap-2"><span className={cx("truncate text-xs", unread ? "font-semibold text-slate-700 dark:text-slate-200" : "text-slate-500")}>{last ? `${last.from === "admin" ? "You: " : ""}${last.text}` : (e.portalRoles || [])[0]}</span>{unread > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">{unread}</span>}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className={cx("flex min-h-0 flex-col", !current && "hidden md:flex")}>
          {!emp ? <EmptyState icon={MessagesSquare} title="Pick a conversation" text="Chat one-to-one with anyone on the Employee Portal." /> : (
            <>
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <button onClick={() => setActive("")} className="text-sm text-brand-600 md:hidden">←</button>
                <Avatar name={emp.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 dark:text-white">{emp.name}</p>
                  <p className="text-xs text-slate-500">{typing === emp.id ? <span className="text-emerald-600">typing…</span> : `${(emp.portalRoles || [])[0] || emp.designation} · ${emp.lastSignIn ? `last seen ${timeAgo(emp.lastSignIn)}` : "never signed in"}`}</p>
                </div>
              </div>
              <div className="flex-1 space-y-1.5 overflow-y-auto bg-slate-50/60 px-4 py-4 dark:bg-slate-950/30">
                {convo.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No messages yet — say hello 👋</p>}
                {convo.map((m) => {
                  const mine = m.from === "admin";
                  const day = m.at.slice(0, 10);
                  const showDay = day !== lastDay; lastDay = day;
                  return (
                    <div key={m.id}>
                      {showDay && <p className="my-3 text-center text-[11px] font-medium text-slate-400">{fmtDate(day)}</p>}
                      <div className={cx("flex", mine ? "justify-end" : "justify-start")}>
                        <div className={cx("max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm", mine ? "rounded-br-sm bg-brand-600 text-white" : "rounded-bl-sm bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700")}>
                          <p className="whitespace-pre-wrap">{m.text}</p>
                          <p className={cx("mt-0.5 flex items-center justify-end gap-1 text-[10px]", mine ? "text-brand-100" : "text-slate-400")}>
                            {fmtTime(m.at)}{mine && (m.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {typing === emp.id && (
                  <div className="flex"><div className="flex gap-1 rounded-2xl rounded-bl-sm bg-white px-3.5 py-3 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                    {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </div></div>
                )}
                <div ref={endRef} />
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
                <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={`Message ${emp.name.split(" ")[0]}… (Enter to send)`} className="input max-h-32 min-h-[40px] flex-1 resize-none" />
                <Button type="submit" size="icon" className="h-10 w-10" disabled={!text.trim()}><Send className="h-4 w-4" /></Button>
              </form>
            </>
          )}
        </div>
      </Card>

      <Modal open={ann !== null} onClose={() => setAnn(null)} title="Send an announcement" subtitle="Goes to everyone's notification bell on the portal" size="sm"
        footer={<><Button variant="secondary" onClick={() => setAnn(null)}>Cancel</Button><Button icon={Megaphone} onClick={() => {
          if (!ann?.trim()) return toast("Write the announcement first", "error");
          notify("Announcement sent", ann.trim(), "/employee-portal");
          ["group:Development", "group:Digital Marketing"].forEach((thread) => add("messages", { thread, from: "admin", text: `📢 ${ann.trim()}`, at: new Date().toISOString(), read: true }, "m"));
          toast(`Announcement sent to ${employees.filter((e) => e.portalStatus === "Active").length} people`); setAnn(null);
        }}>Send to everyone</Button></>}>
        <Field label="Message"><Textarea rows={5} value={ann || ""} onChange={(e) => setAnn(e.target.value)} placeholder="e.g. Office will be closed on Friday for Diwali." /></Field>
      </Modal>
    </>
  );
}
