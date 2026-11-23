// Products & price list — catalogue used for quotations and invoices (HSN/SAC, GST, margin, stock).
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Package, Plus, Download, Pencil, Trash2, AlertTriangle, IndianRupee, TrendingUp, Boxes, Copy } from "lucide-react";
import { useStore } from "../../store/store";
import { useToast } from "../../components/ui/Toast";
import { Button, Card, PageHeader, StatCard, SearchInput, Select, Badge, Modal, Field, Input, Textarea, Toggle, Menu, EmptyState, Tabs, useConfirm, cx } from "../../components/ui";
import { term } from "../../config/workspace";
import { inr, downloadCSV } from "../../utils/format";

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ["Nos", "Job", "Hour", "Session", "Month", "Year", "Set", "Kg", "Unit", "Sq.ft"];
const empty = () => ({ name: "", sku: "", category: "", type: "Service", unit: "Nos", price: "", cost: "", gst: 18, hsn: "", stock: null, reorder: 10, active: true, desc: "" });
const margin = (p) => (p.price ? Math.round(((p.price - (p.cost || 0)) / p.price) * 100) : 0);

export default function Products() {
  const { db, add, update, remove, log } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [view, setView] = useState("active");
  const [form, setForm] = useState(null);
  const [err, setErr] = useState({});
  const products = db.products || [];

  useEffect(() => {
    const o = params.get("open");
    if (params.get("new")) setForm(empty());
    if (o) { const p = products.find((x) => x.id === o); if (p) setForm({ ...p }); }
    if (o || params.get("new")) { params.delete("new"); params.delete("open"); setParams(params, { replace: true }); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const cats = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const lowStock = products.filter((p) => p.stock !== null && p.stock !== undefined && p.stock <= (p.reorder || 0));
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products
      .filter((p) => (view === "all" || (view === "active" ? p.active : view === "low" ? lowStock.includes(p) : !p.active)))
      .filter((p) => (!cat || p.category === cat) && (!s || [p.name, p.sku, p.hsn, p.category].some((v) => String(v || "").toLowerCase().includes(s))));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, q, cat, view]);
  const avgMargin = products.length ? Math.round(products.reduce((a, p) => a + margin(p), 0) / products.length) : 0;
  const top = [...products].sort((a, b) => (b.sold || 0) - (a.sold || 0))[0];

  const save = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!(Number(form.price) >= 0) || form.price === "") e.price = "Enter a price";
    if (form.sku && products.some((p) => p.sku === form.sku && p.id !== form.id)) e.sku = "SKU already used";
    setErr(e);
    if (Object.keys(e).length) return;
    const rec = { ...form, price: Number(form.price), cost: Number(form.cost) || 0, gst: Number(form.gst), stock: form.type === "Product" && form.stock !== "" && form.stock !== null ? Number(form.stock) : null, reorder: Number(form.reorder) || 0 };
    if (form.id) { update("products", form.id, rec); toast("Saved"); log("updated", "Product", rec.name); }
    else { add("products", { ...rec, sku: rec.sku || `SKU-${String(products.length + 101)}`, sold: 0 }, "PR"); toast(`${rec.name} added to price list`); log("created", "Product", rec.name); }
    setForm(null);
  };
  const del = async (p) => {
    if (await confirm({ title: `Delete ${p.name}?`, message: "Existing quotations and invoices keep their line items." })) { remove("products", p.id); log("deleted", "Product", p.name); toast("Deleted"); }
  };
  const exportCSV = () => downloadCSV("price-list.csv", rows, [
    { label: "SKU", key: "sku" }, { label: "Name", key: "name" }, { label: "Category", key: "category" }, { label: "Type", key: "type" }, { label: "Unit", key: "unit" },
    { label: "HSN/SAC", key: "hsn" }, { label: "Price", key: "price" }, { label: "GST %", key: "gst" }, { label: "Cost", key: "cost" }, { label: "Stock", value: (p) => p.stock ?? "" },
  ]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <PageHeader title={`${term("product")}s & Price List`} subtitle="Your catalogue with tax codes and pricing — pick from it while making quotations and invoices."
        actions={<><Button variant="secondary" icon={Download} onClick={exportCSV}>Export price list</Button><Button icon={Plus} onClick={() => { setErr({}); setForm(empty()); }}>Add {term("product").toLowerCase()}</Button></>} />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Active items" value={products.filter((p) => p.active).length} icon={Package} sub={`${products.length} in catalogue`} />
        <StatCard label="Average margin" value={`${avgMargin}%`} icon={TrendingUp} tone="emerald" sub="price vs cost" />
        <StatCard label="Best seller" value={top?.sold || 0} icon={IndianRupee} tone="violet" sub={top ? top.name : "—"} />
        <StatCard label="Low stock" value={lowStock.length} icon={AlertTriangle} tone={lowStock.length ? "rose" : "slate"} sub="at or below reorder level" onClick={() => setView("low")} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 lg:flex-row lg:items-center">
          <Tabs value={view} onChange={setView} tabs={[{ value: "active", label: "Active" }, { value: "all", label: "All" }, { value: "low", label: "Low stock", count: lowStock.length }, { value: "inactive", label: "Archived" }]} />
          <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
            <SearchInput value={q} onChange={setQ} placeholder="Name, SKU, HSN…" className="sm:w-64" />
            <Select value={cat} onChange={(e) => setCat(e.target.value)} options={cats} placeholder="All categories" className="sm:w-44" />
          </div>
        </div>
        {rows.length === 0 ? <EmptyState icon={Boxes} title="No items here" text="Add your products or services to reuse them in quotations." /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="th">Item</th><th className="th">Category</th><th className="th">HSN/SAC</th><th className="th text-right">Price</th><th className="th text-right">GST</th><th className="th text-right">Margin</th><th className="th text-right">Stock</th><th className="th text-right">Sold</th><th className="th">Status</th><th className="th" /></tr></thead>
              <tbody>
                {rows.map((p) => {
                  const low = lowStock.includes(p);
                  return (
                    <tr key={p.id} className="tr cursor-pointer" onClick={() => { setErr({}); setForm({ ...p }); }}>
                      <td className="td"><p className="font-semibold text-slate-900 dark:text-white">{p.name}</p><p className="text-xs text-slate-500">{p.sku} · {p.type} · per {p.unit}</p></td>
                      <td className="td">{p.category || "—"}</td>
                      <td className="td font-mono text-xs">{p.hsn || "—"}</td>
                      <td className="td text-right font-semibold text-slate-900 dark:text-white">{inr(p.price)}</td>
                      <td className="td text-right">{p.gst}%</td>
                      <td className="td text-right"><span className={cx("font-semibold", margin(p) >= 40 ? "text-emerald-600" : margin(p) >= 20 ? "text-amber-600" : "text-rose-600")}>{margin(p)}%</span></td>
                      <td className="td text-right">{p.stock === null || p.stock === undefined ? <span className="text-slate-400">—</span> : <span className={cx("font-semibold", low && "text-rose-600")}>{p.stock}{low && " ⚠"}</span>}</td>
                      <td className="td text-right">{p.sold || 0}</td>
                      <td className="td">{p.active ? <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Active</Badge> : <Badge className="bg-slate-100 text-slate-500 dark:bg-slate-800">Archived</Badge>}</td>
                      <td className="td" onClick={(e) => e.stopPropagation()}>
                        <Menu items={[
                          { label: "Edit", icon: Pencil, onClick: () => { setErr({}); setForm({ ...p }); } },
                          { label: "Duplicate", icon: Copy, onClick: () => { setErr({}); const { id, ...rest } = p; setForm({ ...rest, name: `${p.name} (copy)`, sku: "" }); } },
                          { label: p.active ? "Archive" : "Restore", icon: Package, onClick: () => update("products", p.id, { active: !p.active }) },
                          { label: "Delete", icon: Trash2, danger: true, onClick: () => del(p) },
                        ]} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit item" : `Add ${term("product").toLowerCase()}`} size="lg"
        footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>{form?.id ? "Save changes" : "Add to price list"}</Button></>}>
        {form && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" required error={err.name} className="sm:col-span-2"><Input value={form.name} onChange={set("name")} autoFocus /></Field>
            <Field label="Type"><Select value={form.type} onChange={set("type")} options={["Service", "Product"]} /></Field>
            <Field label="Category"><Input value={form.category} onChange={set("category")} list="prod-cats" /><datalist id="prod-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist></Field>
            <Field label="SKU / code" error={err.sku} hint="Leave empty to auto-generate"><Input value={form.sku} onChange={set("sku")} /></Field>
            <Field label={form.type === "Product" ? "HSN code" : "SAC code"}><Input value={form.hsn} onChange={set("hsn")} /></Field>
            <Field label="Selling price (₹, before GST)" required error={err.price}><Input type="number" min="0" value={form.price} onChange={set("price")} /></Field>
            <Field label="Cost price (₹)" hint={form.price ? `Margin ${margin({ price: Number(form.price), cost: Number(form.cost) })}%` : "Used for margin reports"}><Input type="number" min="0" value={form.cost} onChange={set("cost")} /></Field>
            <Field label="GST rate"><Select value={String(form.gst)} onChange={set("gst")} options={GST_RATES.map((g) => ({ value: String(g), label: `${g}%` }))} /></Field>
            <Field label="Unit"><Select value={form.unit} onChange={set("unit")} options={UNITS} /></Field>
            {form.type === "Product" && <>
              <Field label="Stock in hand" hint="Leave empty if you don't track stock"><Input type="number" value={form.stock ?? ""} onChange={set("stock")} /></Field>
              <Field label="Reorder level"><Input type="number" value={form.reorder} onChange={set("reorder")} /></Field>
            </>}
            <Field label="Description (printed on quotation)" className="sm:col-span-2"><Textarea value={form.desc} onChange={set("desc")} /></Field>
            <div className="sm:col-span-2"><Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Available for new quotations" /></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
