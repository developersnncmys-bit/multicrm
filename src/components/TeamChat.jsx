// Floating team chat: group channels shared with Employee Portal staff.
import { useEffect, useMemo, useRef, useState } from "react";
import { MessagesSquare, X, ChevronLeft, Send, Hash, Users } from "lucide-react";
import { useStore } from "../store/store";
import { Avatar, cx } from "./ui";
import { timeAgo, uid } from "../utils/format";

export default function TeamChat() {
  const { db, add, update, user, empById } = useStore();
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState(null);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(null);
  const endRef = useRef(null);
  const messages = db.messages || [];

  const channels = useMemo(() => {
    const names = [...new Set(messages.filter((m) => m.thread?.startsWith("group:")).map((m) => m.thread))];
    return names.map((t) => {
      const list = messages.filter((m) => m.thread === t).sort((a, b) => a.at.localeCompare(b.at));
      return { thread: t, name: t.slice(6), last: list[list.length - 1], unread: list.filter((m) => !m.read && m.from !== "admin").length, members: new Set(list.map((m) => m.from)).size };
    }).sort((a, b) => (b.last?.at || "").localeCompare(a.last?.at || ""));
  }, [messages]);
  const totalUnread = channels.reduce((a, c) => a + c.unread, 0);
  const list = useMemo(() => messages.filter((m) => m.thread === thread).sort((a, b) => a.at.localeCompare(b.at)), [messages, thread]);

  // Mark channel read when opened / new messages arrive
  useEffect(() => {
    if (!thread) return;
    list.filter((m) => !m.read && m.from !== "admin").forEach((m) => update("messages", m.id, { read: true }));
    setTimeout(() => endRef.current?.scrollIntoView({ block: "end" }), 30);
  }, [thread, list.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") { if (thread) setThread(null); else setOpen(false); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, thread]);

  const send = () => {
    const t = text.trim();
    if (!t || !thread) return;
    add("messages", { thread, from: "admin", text: t, at: new Date().toISOString(), read: true }, "m");
    setText("");
    // Demo: a team member replies shortly
    const members = [...new Set(list.map((m) => m.from).filter((f) => f !== "admin"))];
    const who = members[Math.floor(Math.random() * members.length)];
    if (!who) return;
    const t0 = thread;
    setTimeout(() => setTyping({ thread: t0, who }), 700);
    setTimeout(() => {
      setTyping(null);
      add("messages", { id: uid("m"), thread: t0, from: who, text: ["Noted 👍", "Sure, on it.", "Okay sir.", "Will update by evening.", "Done!"][Math.floor(Math.random() * 5)], at: new Date().toISOString(), read: false }, "m");
    }, 2400);
  };

  const nameOf = (from) => (from === "admin" ? user?.name || "Admin" : empById(from)?.name || "Team member");
  const roleOf = (from) => (from === "admin" ? user?.role || "Admin" : (empById(from)?.portalRoles || [])[0] || empById(from)?.designation || "");

  return (
    <>
      <button onClick={() => setOpen((v) => !v)} title="Team chat"
        className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white shadow-pop transition hover:bg-brand-700 print:hidden">
        {open ? <X className="h-5 w-5" /> : <MessagesSquare className="h-5 w-5" />}
        <span className="hidden sm:inline">{open ? "Close" : "Team chat"}</span>
        {!open && totalUnread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold ring-2 ring-white">{totalUnread}</span>}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-40 flex h-[min(540px,calc(100vh-7rem))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop animate-slideUp dark:border-slate-700 dark:bg-slate-900 sm:right-6 print:hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            {thread && <button onClick={() => setThread(null)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{thread ? `# ${thread.slice(6)}` : "Team chat"}</p>
              <p className="truncate text-[11px] text-slate-500">{thread ? "Everyone in this group can read it" : "Group channels with your team"}</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
          </div>

          {!thread ? (
            <div className="flex-1 overflow-y-auto p-2">
              {channels.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No group channels yet</p>}
              {channels.map((c) => (
                <button key={c.thread} onClick={() => setThread(c.thread)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Hash className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{c.name}</span>
                      <span className="shrink-0 text-[11px] text-slate-400">{c.last ? timeAgo(c.last.at) : ""}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-slate-500">{c.last ? `${nameOf(c.last.from).split(" ")[0]}: ${c.last.text}` : ""}</span>
                      {c.unread > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">{c.unread}</span>}
                    </span>
                  </span>
                </button>
              ))}
              <p className="mt-2 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] text-slate-400"><Users className="h-3.5 w-3.5" />One-to-one chats are in Employee Portal → Messages</p>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 px-3 py-3 dark:bg-slate-950/40">
                {list.map((m) => {
                  const mine = m.from === "admin";
                  return (
                    <div key={m.id} className={cx("flex gap-2", mine && "flex-row-reverse")}>
                      {!mine && <Avatar name={nameOf(m.from)} size="xs" className="mt-4" />}
                      <div className={cx("max-w-[78%]", mine && "text-right")}>
                        {!mine && <p className="mb-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">{nameOf(m.from)} <span className="font-normal text-slate-400">· {roleOf(m.from)}</span></p>}
                        <div className={cx("inline-block rounded-2xl px-3 py-2 text-left text-sm", mine ? "rounded-tr-sm bg-brand-600 text-white" : "rounded-tl-sm bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700")}>{m.text}</div>
                        <p className="mt-0.5 text-[10px] text-slate-400">{timeAgo(m.at)}</p>
                      </div>
                    </div>
                  );
                })}
                {typing?.thread === thread && (
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="flex gap-0.5"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:.15s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:.3s]" /></span>
                    {nameOf(typing.who).split(" ")[0]} is typing…
                  </p>
                )}
                <div ref={endRef} />
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-slate-100 p-2.5 dark:border-slate-800">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message #${thread.slice(6)}`} className="input h-10 flex-1" autoFocus />
                <button disabled={!text.trim()} className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"><Send className="h-4 w-4" /></button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
