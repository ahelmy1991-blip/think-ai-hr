"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  level: string;
  department: string;
  isExpat: boolean;
  nationality: string | null;
  status: string;
  startDate: string;
  iqamaExpiry: string | null;
}

const LEVELS = ["L1","L2","L3","L4","L5","L6","L7","L8","L9","L10","L11","L12","L13","L14","L15"];
const DEPARTMENTS = ["Engineering","Product","Design","Data Science","Operations","Finance","People","Sales","Marketing"];
const STATUSES = ["probation","active","inactive","offboarded"];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:"", email:"", role:"", level:"L2", department:"Engineering", isExpat:false, nationality:"", startDate:"", iqamaExpiry:"", notes:"" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadEmployees(); }, []);

  async function loadEmployees() {
    const r = await fetch("/api/employees");
    setEmployees(await r.json());
  }

  async function addEmployee() {
    setSaving(true);
    const r = await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (r.ok) { setShowAdd(false); setForm({ name:"", email:"", role:"", level:"L2", department:"Engineering", isExpat:false, nationality:"", startDate:"", iqamaExpiry:"", notes:"" }); loadEmployees(); }
    else { const d = await r.json(); alert(d.error); }
    setSaving(false);
  }

  function statusBadge(s: string) {
    const map: Record<string, string> = { probation: "badge-amber", active: "badge-green", inactive: "badge-gray", offboarded: "badge-gray" };
    return <span className={`badge ${map[s] || "badge-gray"}`}>{s}</span>;
  }

  function iqamaStatus(expiry: string | null, isExpat: boolean) {
    if (!isExpat) return null;
    if (!expiry) return <span className="badge badge-amber">No Iqama date</span>;
    const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return <span className="badge badge-red">Iqama Expired</span>;
    if (days <= 30) return <span className="badge badge-amber">Expires {days}d</span>;
    return <span className="badge badge-green">Iqama OK</span>;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="display-font">Team Members</h1>
          <p>{employees.length} team members · onboarding checklists auto-created</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Team Member</button>
      </div>

      <div className="page-body">
        <div className="card">
          <table className="data-table">
            <thead><tr>
              <th>Name</th><th>Role / Level</th><th>Department</th><th>Type</th>
              <th>Status</th><th>Start Date</th><th>Iqama</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {employees.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>No team members yet — add your first hire</td></tr>
              )}
              {employees.map((e) => (
                <tr key={e.id}>
                  <td><div style={{ fontWeight: 600 }}>{e.name}</div><div style={{ fontSize: 12, color: "#94a3b8" }}>{e.email}</div></td>
                  <td><div>{e.role}</div><div style={{ fontSize: 12, color: "#94a3b8" }}>{e.level}</div></td>
                  <td>{e.department}</td>
                  <td>
                    {e.isExpat
                      ? <span className="badge badge-blue">Expat{e.nationality ? ` · ${e.nationality}` : ""}</span>
                      : <span className="badge badge-navy">Saudi</span>}
                  </td>
                  <td>{statusBadge(e.status)}</td>
                  <td style={{ fontSize: 13 }}>{new Date(e.startDate).toLocaleDateString()}</td>
                  <td>{iqamaStatus(e.iqamaExpiry, e.isExpat)}</td>
                  <td>
                    <Link href={`/onboarding/${e.id}`} className="btn btn-ghost btn-sm">Onboarding</Link>
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
              <h3>Add Team Member</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Ahmed Al-Rashidi" />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="ahmed@think-ai.com" />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label className="form-label">Job Role *</label>
                <input className="form-input" value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} placeholder="Senior AI Engineer" />
              </div>
              <div>
                <label className="form-label">Level</label>
                <select className="form-input form-select" value={form.level} onChange={(e) => setForm({...form, level: e.target.value})}>
                  {LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Department</label>
                <select className="form-input form-select" value={form.department} onChange={(e) => setForm({...form, department: e.target.value})}>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Start Date *</label>
                <input className="form-input" type="date" value={form.startDate} onChange={(e) => setForm({...form, startDate: e.target.value})} />
              </div>
              <div>
                <label className="form-label">Nationality</label>
                <input className="form-input" value={form.nationality} onChange={(e) => setForm({...form, nationality: e.target.value})} placeholder="Saudi / Egyptian / Indian..." />
              </div>
              <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" id="isExpat" checked={form.isExpat} onChange={(e) => setForm({...form, isExpat: e.target.checked})} />
                <label htmlFor="isExpat" style={{ fontSize: 14, color: "#334155" }}>This is an expatriate team member (requires Iqama)</label>
              </div>
              {form.isExpat && (
                <div style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Iqama Expiry Date</label>
                  <input className="form-input" type="date" value={form.iqamaExpiry} onChange={(e) => setForm({...form, iqamaExpiry: e.target.value})} />
                </div>
              )}
              <div style={{ gridColumn: "1/-1" }}>
                <label className="form-label">Notes</label>
                <textarea className="form-input form-textarea" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} placeholder="Any special notes..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addEmployee} disabled={saving || !form.name || !form.email || !form.role || !form.startDate}>
                {saving ? "Adding..." : "Add Team Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
