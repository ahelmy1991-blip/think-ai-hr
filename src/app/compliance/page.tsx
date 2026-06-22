"use client";
import { useEffect, useState } from "react";

interface ComplianceItem {
  id: string;
  type: string;
  title: string;
  status: string;
  dueDate: string;
  completedAt: string | null;
  notes: string | null;
  employee?: { id: string; name: string; isExpat: boolean } | null;
}

const TYPE_LABELS: Record<string, string> = {
  wps: "WPS", gosi: "GOSI", iqama_renewal: "Iqama", nitaqat: "Nitaqat",
  probation_review: "Probation", probation_decision: "Probation Decision",
  visa: "Visa", other: "Other",
};

const COMPLIANCE_TYPES = ["wps","gosi","iqama_renewal","nitaqat","probation_review","probation_decision","visa","other"];

export default function CompliancePage() {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: "wps", title: "", dueDate: "", notes: "" });
  const [filter, setFilter] = useState("all");
  const [notionLoading, setNotionLoading] = useState(false);
  const [notionUrl, setNotionUrl] = useState("");

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    const r = await fetch("/api/compliance");
    setItems(await r.json());
  }

  async function addItem() {
    const r = await fetch("/api/compliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) { setShowAdd(false); setForm({ type: "wps", title: "", dueDate: "", notes: "" }); loadItems(); }
  }

  async function markDone(id: string) {
    await fetch(`/api/compliance/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    loadItems();
  }

  async function exportNotion() {
    setNotionLoading(true);
    const r = await fetch("/api/notion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "compliance_report" }),
    });
    const data = await r.json();
    if (data.url) setNotionUrl(data.url);
    else alert(data.error || "Export failed");
    setNotionLoading(false);
  }

  const filtered = filter === "all" ? items : filter === "open" ? items.filter((i) => i.status !== "done") : items.filter((i) => i.status === filter);
  const overdue = items.filter((i) => i.status === "overdue").length;
  const atRisk = items.filter((i) => i.status === "at_risk").length;

  function statusBadge(status: string) {
    const map: Record<string, [string, string]> = {
      overdue: ["badge-red", "OVERDUE"],
      at_risk: ["badge-amber", "AT RISK"],
      pending: ["badge-gray", "Pending"],
      done: ["badge-green", "Done"],
    };
    const [cls, label] = map[status] ?? ["badge-gray", status];
    return <span className={`badge ${cls}`}>{label}</span>;
  }

  function daysLabel(dueDate: string, status: string) {
    if (status === "done") return <span style={{ color: "#16a34a" }}>Completed</span>;
    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return <span className="deadline-overdue">{Math.abs(days)}d overdue</span>;
    if (days <= 7) return <span className="deadline-at-risk">{days}d left</span>;
    return <span className="deadline-ok">{days}d</span>;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="display-font">Compliance Tracker</h1>
          <p>WPS · GOSI · Iqama · Nitaqat · Probation deadlines</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {notionUrl && <a href={notionUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">Open in Notion</a>}
          <button className="btn btn-outline btn-sm" onClick={exportNotion} disabled={notionLoading}>
            {notionLoading ? "Exporting..." : "Export to Notion"}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Item</button>
        </div>
      </div>

      <div className="page-body">
        {/* Alerts */}
        {(overdue > 0 || atRisk > 0) && (
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            {overdue > 0 && (
              <div style={{ flex: 1, padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#dc2626" }}>{overdue}</div>
                <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 500 }}>OVERDUE — action required immediately</div>
              </div>
            )}
            {atRisk > 0 && (
              <div style={{ flex: 1, padding: "12px 16px", background: "#fffbeb", border: "1px solid #fed7aa", borderRadius: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#d97706" }}>{atRisk}</div>
                <div style={{ fontSize: 12, color: "#d97706", fontWeight: 500 }}>DUE THIS WEEK — review and complete</div>
              </div>
            )}
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {["all","open","overdue","at_risk","done"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-outline"}`}>
              {f === "at_risk" ? "At Risk" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="card">
          <table className="data-table">
            <thead><tr>
              <th>Type</th><th>Item</th><th>Employee</th><th>Due Date</th><th>Time Left</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>No compliance items matching this filter</td></tr>
              )}
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td><span className="badge badge-blue">{TYPE_LABELS[item.type] ?? item.type}</span></td>
                  <td style={{ fontWeight: 500 }}>{item.title}</td>
                  <td style={{ fontSize: 13 }}>{item.employee?.name ?? "—"}</td>
                  <td style={{ fontSize: 13 }}>{new Date(item.dueDate).toLocaleDateString()}</td>
                  <td>{daysLabel(item.dueDate, item.status)}</td>
                  <td>{statusBadge(item.status)}</td>
                  <td>
                    {item.status !== "done" && (
                      <button className="btn btn-ghost btn-sm" onClick={() => markDone(item.id)}>Mark Done</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h3>Add Compliance Item</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="form-label">Type</label>
                <select className="form-input form-select" value={form.type} onChange={(e) => setForm({...form, type: e.target.value})}>
                  {COMPLIANCE_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="e.g., WPS March payroll file" />
              </div>
              <div>
                <label className="form-label">Due Date *</label>
                <input className="form-input" type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} />
              </div>
              <div>
                <label className="form-label">Notes</label>
                <textarea className="form-input form-textarea" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addItem} disabled={!form.title || !form.dueDate}>Add Item</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
