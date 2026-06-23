"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Employee {
  id: string; name: string; email: string; role: string; level: string;
  department: string; isExpat: boolean; nationality: string | null;
  status: string; startDate: string; iqamaExpiry: string | null;
}
interface UploadResult { created: number; failed: number; total: number; errors: string[]; }

const LEVELS = ["L1","L2","L3","L4","L5","L6","L7","L8","L9","L10","L11","L12","L13","L14","L15"];
const DEPARTMENTS = ["Engineering","Product","Design","Data Science","Operations","Finance","People","Sales","Marketing"];

const CSV_TEMPLATE = `name,email,role,level,department,isExpat,nationality,startDate,iqamaExpiry,notes
Ahmed Al-Rashidi,ahmed@think-ai.com,Senior AI Engineer,L7,Engineering,false,Saudi Arabia,2026-07-01,,
Priya Sharma,priya@think-ai.com,ML Platform Lead,L9,Engineering,true,Indian,2026-07-15,2027-07-14,Hired from NEOM`;

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [form, setForm] = useState({ name:"", email:"", role:"", level:"L6", department:"Engineering", isExpat:false, nationality:"", startDate:"", iqamaExpiry:"", notes:"" });
  const [saving, setSaving] = useState(false);
  const [bulkCsv, setBulkCsv] = useState("");
  const [bulkFilename, setBulkFilename] = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<UploadResult | null>(null);

  useEffect(() => { loadEmployees(); }, []);

  async function loadEmployees() {
    try {
      const r = await fetch("/api/employees");
      const data = await r.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch { setEmployees([]); }
  }

  async function addEmployee() {
    setSaving(true);
    try {
      const r = await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (r.ok) {
        setShowAdd(false);
        setForm({ name:"", email:"", role:"", level:"L6", department:"Engineering", isExpat:false, nationality:"", startDate:"", iqamaExpiry:"", notes:"" });
        loadEmployees();
      } else {
        const d = await r.json();
        alert(d.error ?? "Failed to add team member");
      }
    } catch { alert("Network error"); }
    setSaving(false);
  }

  async function bulkUpload() {
    if (!bulkCsv.trim()) return;
    setBulkUploading(true);
    setBulkResult(null);
    try {
      const r = await fetch("/api/employees/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: bulkCsv, filename: bulkFilename || "upload.csv" }),
      });
      const result: UploadResult = await r.json();
      setBulkResult(result);
      if (result.created > 0) loadEmployees();
    } catch {
      setBulkResult({ created: 0, failed: 0, total: 0, errors: ["Network error — please try again."] });
    }
    setBulkUploading(false);
  }

  function handleFileRead(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFilename(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setBulkCsv((ev.target?.result as string) ?? "");
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "think-ai-employee-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function statusBadge(s: string) {
    const map: Record<string, string> = { probation: "badge-amber", active: "badge-green", inactive: "badge-gray", offboarded: "badge-gray" };
    return <span className={`badge ${map[s] || "badge-gray"}`}>{s}</span>;
  }

  function iqamaStatus(expiry: string | null, isExpat: boolean) {
    if (!isExpat) return null;
    if (!expiry) return <span className="badge badge-amber">No date</span>;
    const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
    if (days < 0) return <span className="badge badge-red">Expired</span>;
    if (days <= 30) return <span className="badge badge-amber">{days}d left</span>;
    return <span className="badge badge-green">OK</span>;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="display-font">Team Members</h1>
          <p>{employees.length} team members · onboarding checklists auto-created</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline" onClick={() => { setShowBulk(true); setBulkResult(null); setBulkCsv(""); setBulkFilename(""); }}>
            Bulk Import CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Team Member</button>
        </div>
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
                <tr><td colSpan={8} style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>
                  No team members yet — add your first hire or bulk import a CSV
                </td></tr>
              )}
              {employees.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{e.name}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{e.email}</div>
                  </td>
                  <td>
                    <div>{e.role}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{e.level}</div>
                  </td>
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

      {/* Add individual modal */}
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
                <label htmlFor="isExpat" style={{ fontSize: 14, color: "#334155" }}>Expatriate team member (requires Iqama)</label>
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

      {/* Bulk import modal */}
      {showBulk && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowBulk(false)}>
          <div className="modal-box" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h3>Bulk Import Team Members</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowBulk(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: "#f8fafc", border: "1px solid #e5e9f0", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#475569" }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Required CSV columns:</div>
                <code style={{ fontSize: 12, color: "#0a1628", display: "block", marginBottom: 8 }}>
                  name, email, role, level, department, isExpat, nationality, startDate, iqamaExpiry, notes
                </code>
                <div style={{ fontSize: 12, color: "#6b7a99" }}>
                  isExpat: true/false · level: L1-L15 · startDate: YYYY-MM-DD · iqamaExpiry: YYYY-MM-DD (optional)
                </div>
                <button onClick={downloadTemplate} className="btn btn-outline btn-sm" style={{ marginTop: 10 }}>
                  Download Template CSV
                </button>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Upload CSV File</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileRead}
                  style={{ display: "block", fontSize: 13, color: "#475569" }}
                />
              </div>

              <div>
                <label className="form-label">Or paste CSV content directly</label>
                <textarea
                  className="form-input form-textarea"
                  value={bulkCsv}
                  onChange={(e) => setBulkCsv(e.target.value)}
                  rows={8}
                  placeholder={CSV_TEMPLATE}
                  style={{ fontFamily: "monospace", fontSize: 12 }}
                />
              </div>

              {bulkResult && (
                <div style={{
                  marginTop: 16, padding: "12px 16px", borderRadius: 8,
                  background: bulkResult.failed === 0 ? "#f0fdf4" : "#fefce8",
                  border: `1px solid ${bulkResult.failed === 0 ? "#bbf7d0" : "#fde68a"}`,
                }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, color: bulkResult.failed === 0 ? "#166534" : "#92400e" }}>
                    {bulkResult.created > 0 ? `${bulkResult.created} team members added` : "No records created"}
                    {bulkResult.failed > 0 && ` · ${bulkResult.failed} failed`}
                  </div>
                  {bulkResult.errors.length > 0 && (
                    <div style={{ fontSize: 12, color: "#92400e" }}>
                      {bulkResult.errors.map((e, i) => <div key={i}>{e}</div>)}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowBulk(false)}>
                {bulkResult?.created ? "Done" : "Cancel"}
              </button>
              <button
                className="btn btn-primary"
                onClick={bulkUpload}
                disabled={bulkUploading || !bulkCsv.trim()}
              >
                {bulkUploading ? "Importing..." : "Import CSV"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
