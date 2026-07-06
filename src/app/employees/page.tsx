"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Employee {
  // Core (hr_employees)
  id: string; name: string; email: string; role: string; level: string;
  department: string; isExpat: boolean; nationality: string | null;
  status: string; startDate: string | null; iqamaExpiry: string | null; notes: string | null;
  // Work
  first_name: string | null; last_name: string | null;
  job_family: string | null; sub_job_family: string | null; people_group: string | null;
  division: string | null; sub_division: string | null; sub_department: string | null;
  squad: string | null; tribe: string | null; functional_team: string | null;
  cost_center: string | null; city_region: string | null; country: string | null;
  grade: string | null; band: string | null;
  seniority_date: string | null; team_lead: string | null; line_of_business: string | null;
  vendor_name: string | null; job_req_id: string | null;
  latest_contract_start: string | null; latest_contract_end: string | null;
  payroll_status: string | null; exco: string | null; dotted_line_manager: string | null;
  last_promotion: string | null; last_change_salary_date: string | null;
  last_change_equity_date: string | null; probation_confirmation_date: string | null;
  // Compensation
  monthly_salary: number | null; currency: string | null;
  usd_conversion_rate: number | null; salary_usd: number | null;
  grade_min: number | null; grade_mid: number | null; grade_max: number | null;
  equity_pct: number | null; equity_grant: number | null;
  equity_refresh_1: number | null; equity_refresh_2: number | null;
  equity_refresh_3: number | null; equity_refresh_4: number | null;
  // Performance
  pm_score_2026: string | null; pm_score_2027: string | null;
  pm_score_2028: string | null; pm_score_2029: string | null; pm_score_2030: string | null;
  // Personal
  gender: string | null; date_of_birth: string | null; home_address: string | null;
  mobile: string | null; work_phone: string | null; personal_email: string | null;
  full_name_arabic: string | null;
  // Identity
  national_id: string | null; iqama_number: string | null; passport_number: string | null;
  temp_permit_id: string | null; temp_permit_expiry: string | null;
  passport_expiry: string | null;
  // Banking
  bank_name: string | null; bank_country: string | null;
  iban: string | null; account_holder_name: string | null;
  // Compliance status
  gosi_registered: boolean; gosi_number: string | null;
  onboarding_completed: boolean; onboarding_token: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const LEVELS = ["L1","L2","L3","L4","L5","L6","L7","L8","L9","L10","L11","L12","L13","L14","L15"];
const DEPTS  = ["Engineering","Product","Design","Data Science","Operations","Finance","People","Sales","Marketing","Legal","Research","Government Relations"];
const STATUSES = ["probation","active","terminated"];
const PEOPLE_GROUPS = ["FTE","Outsourced","Contractor","Fully Outsourced"];
const PAYROLL_STATUSES = ["Active","Inactive"];
const BANDS = ["Tech","Non Tech"];
const CURRENCIES = ["SAR","USD","GBP","EUR","AED","EGP"];
const PM_OPTIONS = ["Exceeds Expectations","Meets Expectations","Partially Meets","Does Not Meet","N/A","—"];
const GENDERS = ["Male","Female"];
const TABS = [
  { id: "work",    label: "Work Info",    icon: "💼" },
  { id: "org",     label: "Org & Hierarchy", icon: "🏢" },
  { id: "comp",    label: "Compensation", icon: "💰" },
  { id: "perf",    label: "Performance",  icon: "📊" },
  { id: "personal",label: "Personal",     icon: "👤" },
  { id: "identity",label: "Identity",     icon: "🪪" },
  { id: "banking", label: "Banking",      icon: "🏦" },
] as const;

// ─── Style helpers ────────────────────────────────────────────────────────────
const INP: React.CSSProperties = {
  width: "100%", padding: "8px 11px", borderRadius: 7, border: "1px solid #dce3ee",
  fontSize: 13, fontFamily: "Outfit,sans-serif", boxSizing: "border-box", color: "#1a2540",
};
const LBL: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, color: "#6b7a99", textTransform: "uppercase" as const,
  letterSpacing: "0.08em", display: "block", marginBottom: 4,
};
const SECT: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase" as const,
  letterSpacing: "0.1em", marginBottom: 14, paddingBottom: 6, borderBottom: "1.5px solid #ede9fe",
};
const G2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
const G3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 };

// ─── Sub-components ───────────────────────────────────────────────────────────
function FI({ label, name, form, onChange, type = "text", placeholder = "", span2 = false }: {
  label: string; name: string; form: Record<string, string>; onChange: (k: string, v: string) => void;
  type?: string; placeholder?: string; span2?: boolean;
}) {
  return (
    <div style={span2 ? { gridColumn: "span 2" } : {}}>
      <label style={LBL}>{label}</label>
      <input type={type} style={INP} value={form[name] ?? ""} placeholder={placeholder}
        onChange={e => onChange(name, e.target.value)} />
    </div>
  );
}

function FS({ label, name, form, onChange, options, span2 = false }: {
  label: string; name: string; form: Record<string, string>; onChange: (k: string, v: string) => void;
  options: readonly string[]; span2?: boolean;
}) {
  return (
    <div style={span2 ? { gridColumn: "span 2" } : {}}>
      <label style={LBL}>{label}</label>
      <select style={INP} value={form[name] ?? ""} onChange={e => onChange(name, e.target.value)}>
        <option value="">—</option>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [search, setSearch]         = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected]     = useState<Employee | null>(null);
  const [panelTab, setPanelTab]     = useState<typeof TABS[number]["id"]>("work");
  const [form, setForm]             = useState<Record<string, string>>({});
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState("");
  const [showAdd, setShowAdd]       = useState(false);
  const [addForm, setAddForm]       = useState({
    // Core required
    name: "", email: "", role: "",
    // Classification
    level: "L6", department: "Engineering", isExpat: "false", nationality: "",
    people_group: "FTE",
    // Identity
    job_family: "", sub_job_family: "", grade: "", band: "",
    // Dates
    startDate: "", seniority_date: "",
    // Org structure
    division: "", sub_division: "", sub_department: "",
    squad: "", tribe: "", functional_team: "", cost_center: "",
    // Location
    city_region: "", country: "Saudi Arabia",
    // Management
    team_lead: "", line_of_business: "", vendor_name: "", job_req_id: "",
  });
  const [addSaving, setAddSaving]   = useState(false);
  const [addSection, setAddSection] = useState(0);

  const load = useCallback(async () => {
    const r = await fetch("/api/employees");
    if (r.ok) setEmployees(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  function openEmployee(e: Employee) {
    setSelected(e);
    setPanelTab("work");
    // Flatten all fields into form state
    const f: Record<string, string> = {};
    const allKeys = Object.keys(e) as (keyof Employee)[];
    for (const k of allKeys) {
      const v = e[k];
      if (v === null || v === undefined) f[k] = "";
      else if (typeof v === "boolean") f[k] = String(v);
      else f[k] = String(v);
    }
    setForm(f);
  }

  function onChange(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  async function save() {
    if (!selected) return;
    setSaving(true);
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (k === "id" || k === "createdAt" || k === "onboarding_token") continue;
      if (v === "") payload[k] = null;
      else if (v === "true") payload[k] = true;
      else if (v === "false") payload[k] = false;
      else payload[k] = v;
    }
    const r = await fetch(`/api/employees/${selected.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (r.ok) {
      setSaveMsg("Saved ✓"); await load();
      const updated = (await fetch("/api/employees").then(r => r.json()) as Employee[]).find(e => e.id === selected.id);
      if (updated) openEmployee(updated);
      setTimeout(() => setSaveMsg(""), 2500);
    }
    setSaving(false);
  }

  async function addEmployee() {
    setAddSaving(true);
    const r = await fetch("/api/employees", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addForm, isExpat: addForm.isExpat === "true" }),
    });
    if (r.ok) {
      setShowAdd(false);
      setAddSection(0);
      setAddForm({ name: "", email: "", role: "", level: "L6", department: "Engineering", isExpat: "false", nationality: "", people_group: "FTE", job_family: "", sub_job_family: "", grade: "", band: "", startDate: "", seniority_date: "", division: "", sub_division: "", sub_department: "", squad: "", tribe: "", functional_team: "", cost_center: "", city_region: "", country: "Saudi Arabia", team_lead: "", line_of_business: "", vendor_name: "", job_req_id: "" });
      load();
    } else { alert("Failed to add employee"); }
    setAddSaving(false);
  }

  // ── Filters ──────────────────────────────────────────────────────────────────
  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${e.name} ${e.email} ${e.role} ${e.department}`.toLowerCase().includes(q);
    const matchDept   = filterDept   === "all" || e.department === filterDept;
    const matchGroup  = filterGroup  === "all" || e.people_group === filterGroup;
    const matchStatus = filterStatus === "all" || e.status === filterStatus;
    return matchSearch && matchDept && matchGroup && matchStatus;
  });

  const saudiCount = employees.filter(e => !e.isExpat).length;
  const expatCount = employees.filter(e => e.isExpat).length;
  const saudiPct   = employees.length ? Math.round((saudiCount / employees.length) * 100) : 0;
  const activeCount = employees.filter(e => e.payroll_status === "Active" || (!e.payroll_status && e.status !== "terminated")).length;

  function compaRatio(e: Employee) {
    if (!e.monthly_salary || !e.grade_mid) return null;
    return ((e.monthly_salary / e.grade_mid) * 100).toFixed(0) + "%";
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "Outfit,sans-serif", background: "#f0f4f8" }}>
      {/* ── Left: Employee List ──────────────────────────────────────────────── */}
      <div style={{ flex: selected ? "0 0 480px" : "1", display: "flex", flexDirection: "column", overflow: "hidden", transition: "flex 0.2s" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#050d1a,#0f2140)", padding: "22px 28px 0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: "#93c5fd", marginBottom: 4 }}>PEOPLE HUB</div>
          <h1 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 26, fontWeight: 600, color: "white", margin: 0 }}>Team Members</h1>
          <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
            {[
              { label: "Total", value: employees.length, color: "white" },
              { label: "Saudi", value: saudiCount, color: "#4ade80" },
              { label: "Expat", value: expatCount, color: "#93c5fd" },
              { label: `Saudi %`, value: `${saudiPct}%`, color: "#fbbf24" },
              { label: "Active Payroll", value: activeCount, color: "#a78bfa" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center", padding: "8px 14px", background: "rgba(255,255,255,0.07)", borderRadius: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: "0.06em" }}>{s.label}</div>
              </div>
            ))}
          </div>
          {/* Controls */}
          <div style={{ display: "flex", gap: 8, padding: "14px 0 0", flexWrap: "wrap" }}>
            <input style={{ ...INP, flex: 1, minWidth: 160, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "white" }}
              placeholder="Search name, email, role…" value={search} onChange={e => setSearch(e.target.value)} />
            <select style={{ ...INP, width: 130, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={() => setShowAdd(true)} style={{ padding: "8px 16px", borderRadius: 7, border: "none", background: "#e8c97a", color: "#0a1628", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif", whiteSpace: "nowrap" }}>
              + Add Employee
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, padding: "8px 0 14px" }}>
            <select style={{ ...INP, flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}
              value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="all">All Departments</option>
              {Array.from(new Set(employees.map(e => e.department))).map(d => <option key={d}>{d}</option>)}
            </select>
            <select style={{ ...INP, flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}
              value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
              <option value="all">All Groups</option>
              {PEOPLE_GROUPS.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
        </div>

        {/* Employee list */}
        <div style={{ flex: 1, overflow: "auto", padding: "0 0 24px" }}>
          {filtered.map(e => {
            const isSelected = selected?.id === e.id;
            const ratio = compaRatio(e);
            return (
              <div key={e.id} onClick={() => openEmployee(e)}
                style={{ padding: "14px 20px", borderBottom: "1px solid #e8edf5", cursor: "pointer", background: isSelected ? "#eff6ff" : "white", borderLeft: isSelected ? "3px solid #3b82f6" : "3px solid transparent", transition: "all 0.1s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: isSelected ? "#3b82f6" : "#0a1628", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "white", fontWeight: 700, flexShrink: 0 }}>
                        {e.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#0a1628" }}>{e.name}</div>
                        <div style={{ fontSize: 11, color: "#6b7a99" }}>{e.email}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>{e.role} · {e.department} · {e.level}</div>
                    <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
                      <Chip label={e.people_group ?? "FTE"} color={e.people_group === "Contractor" ? "amber" : "navy"} />
                      <Chip label={e.status} color={e.status === "active" ? "green" : e.status === "probation" ? "amber" : "red"} />
                      {e.payroll_status && <Chip label={e.payroll_status} color={e.payroll_status === "Active" ? "green" : "gray"} />}
                      {e.isExpat && <Chip label="Expat" color="blue" />}
                      {ratio && <Chip label={`Compa ${ratio}`} color="purple" />}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0, paddingLeft: 8, textAlign: "right" }}>
                    {e.grade && <div style={{ fontWeight: 700, color: "#0a1628" }}>{e.grade}</div>}
                    {e.cost_center && <div>{e.cost_center}</div>}
                    {e.band && <div>{e.band}</div>}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No employees match your filters.</div>
          )}
        </div>
      </div>

      {/* ── Right: Detail Panel ──────────────────────────────────────────────── */}
      {selected && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderLeft: "1px solid #e2e8f0", background: "#fafbff" }}>
          {/* Panel header */}
          <div style={{ background: "#0a1628", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "white", fontWeight: 700 }}>
                {selected.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{selected.role} · {selected.department} · {selected.level}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {saveMsg && <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 700 }}>{saveMsg}</span>}
              <Link href={`/onboarding/${selected.id}`} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.7)", fontSize: 12, cursor: "pointer", textDecoration: "none", fontFamily: "Outfit,sans-serif" }}>
                Onboarding →
              </Link>
              <button onClick={save} disabled={saving} style={{ padding: "8px 20px", borderRadius: 7, border: "none", background: saving ? "#94a3b8" : "#e8c97a", color: "#0a1628", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setSelected(null)} style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 13, cursor: "pointer" }}>✕</button>
            </div>
          </div>

          {/* System ID bar */}
          <div style={{ background: "#f8fafc", padding: "8px 24px", fontSize: 11, color: "#94a3b8", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 20, flexWrap: "wrap" }}>
            <span><b>System ID:</b> {selected.id}</span>
            <span><b>Work Email:</b> {selected.email}</span>
            {selected.job_req_id && <span><b>Job Req:</b> {selected.job_req_id}</span>}
            {selected.cost_center && <span><b>Cost Center:</b> {selected.cost_center}</span>}
            {selected.onboarding_token && (
              <span style={{ color: "#7c3aed", cursor: "pointer" }}
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/join/${selected.onboarding_token}`); setSaveMsg("Link copied!"); setTimeout(() => setSaveMsg(""), 2000); }}>
                🔗 Copy Onboarding Link
              </span>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", background: "white", borderBottom: "1px solid #e2e8f0", overflowX: "auto" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setPanelTab(t.id)}
                style={{ padding: "10px 18px", border: "none", background: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "Outfit,sans-serif", whiteSpace: "nowrap",
                  color: panelTab === t.id ? "#7c3aed" : "#94a3b8",
                  borderBottom: panelTab === t.id ? "2px solid #7c3aed" : "2px solid transparent" }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>

            {/* ── Work Info ── */}
            {panelTab === "work" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={SECT}>Employment Details</div>
                <div style={G2}>
                  <FI label="First Name" name="first_name" form={form} onChange={onChange} />
                  <FI label="Last Name" name="last_name" form={form} onChange={onChange} />
                  <FI label="Full Name (as displayed)" name="name" form={form} onChange={onChange} />
                  <FI label="Work Email" name="email" form={form} onChange={onChange} type="email" />
                  <FI label="Position Title" name="role" form={form} onChange={onChange} />
                  <FS label="Level / Grade Code" name="level" form={form} onChange={onChange} options={LEVELS} />
                  <FS label="Department" name="department" form={form} onChange={onChange} options={DEPTS} />
                  <FS label="Employment Status" name="status" form={form} onChange={onChange} options={STATUSES} />
                  <FS label="People Group" name="people_group" form={form} onChange={onChange} options={PEOPLE_GROUPS} />
                  <FS label="Payroll Status" name="payroll_status" form={form} onChange={onChange} options={PAYROLL_STATUSES} />
                  <FI label="Job Family" name="job_family" form={form} onChange={onChange} />
                  <FI label="Sub Job Family" name="sub_job_family" form={form} onChange={onChange} />
                  <FI label="Grade (e.g. G5)" name="grade" form={form} onChange={onChange} placeholder="G5" />
                  <FS label="Band" name="band" form={form} onChange={onChange} options={BANDS} />
                  <FI label="Hiring Date" name="startDate" form={form} onChange={onChange} type="date" />
                  <FI label="Seniority Date" name="seniority_date" form={form} onChange={onChange} type="date" />
                  <FI label="Latest Contract Start" name="latest_contract_start" form={form} onChange={onChange} type="date" />
                  <FI label="Latest Contract End" name="latest_contract_end" form={form} onChange={onChange} type="date" />
                  <FI label="Probation Confirmation Date" name="probation_confirmation_date" form={form} onChange={onChange} type="date" />
                  <FI label="Line Manager / Team Lead" name="team_lead" form={form} onChange={onChange} />
                  <FI label="Dotted Line Manager" name="dotted_line_manager" form={form} onChange={onChange} />
                  <FI label="Exco Sponsor" name="exco" form={form} onChange={onChange} />
                  <FI label="Line of Business" name="line_of_business" form={form} onChange={onChange} />
                  <FI label="Cost Center" name="cost_center" form={form} onChange={onChange} placeholder="CC-001" />
                  <FI label="Job Requisition ID" name="job_req_id" form={form} onChange={onChange} />
                  <FI label="Vendor Name (if outsourced)" name="vendor_name" form={form} onChange={onChange} />
                  <FI label="City" name="city_region" form={form} onChange={onChange} placeholder="Riyadh" />
                  <FI label="Country" name="country" form={form} onChange={onChange} placeholder="Saudi Arabia" />
                  <FI label="Last Promotion Date" name="last_promotion" form={form} onChange={onChange} type="date" />
                  <FI label="Last Salary Change Date" name="last_change_salary_date" form={form} onChange={onChange} type="date" />
                  <FI label="Last Equity Change Date" name="last_change_equity_date" form={form} onChange={onChange} type="date" />
                  <div>
                    <label style={LBL}>Expat Hire</label>
                    <select style={INP} value={form.isExpat ?? ""} onChange={e => onChange("isExpat", e.target.value)}>
                      <option value="false">Saudi National</option>
                      <option value="true">Expat Hire</option>
                    </select>
                  </div>
                  <FI label="Nationality" name="nationality" form={form} onChange={onChange} />
                </div>
              </div>
            )}

            {/* ── Org & Hierarchy ── */}
            {panelTab === "org" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={SECT}>Organizational Structure</div>
                <div style={G2}>
                  <FI label="Division" name="division" form={form} onChange={onChange} />
                  <FI label="Sub Division" name="sub_division" form={form} onChange={onChange} />
                  <FI label="Department" name="department" form={form} onChange={onChange} />
                  <FI label="Sub Department" name="sub_department" form={form} onChange={onChange} />
                  <FI label="Squad" name="squad" form={form} onChange={onChange} />
                  <FI label="Tribe" name="tribe" form={form} onChange={onChange} />
                  <FI label="Functional Team" name="functional_team" form={form} onChange={onChange} />
                  <FI label="Cost Center" name="cost_center" form={form} onChange={onChange} />
                  <FI label="Line of Business" name="line_of_business" form={form} onChange={onChange} />
                  <FI label="People Group" name="people_group" form={form} onChange={onChange} />
                </div>
              </div>
            )}

            {/* ── Compensation ── */}
            {panelTab === "comp" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={SECT}>Salary & Grade</div>
                <div style={G3}>
                  <FI label="Monthly Salary" name="monthly_salary" form={form} onChange={onChange} type="number" placeholder="25000" />
                  <FS label="Currency" name="currency" form={form} onChange={onChange} options={CURRENCIES} />
                  <FI label="USD Conversion Rate" name="usd_conversion_rate" form={form} onChange={onChange} type="number" placeholder="3.75" />
                  <FI label="Salary in USD" name="salary_usd" form={form} onChange={onChange} type="number" placeholder="Auto-calc" />
                  <FI label="Grade Min (SAR)" name="grade_min" form={form} onChange={onChange} type="number" />
                  <FI label="Grade Mid / Midpoint (SAR)" name="grade_mid" form={form} onChange={onChange} type="number" />
                  <FI label="Grade Max (SAR)" name="grade_max" form={form} onChange={onChange} type="number" />
                </div>
                {form.monthly_salary && form.grade_mid && (
                  <div style={{ background: "#faf5ff", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#7c3aed", fontWeight: 700 }}>
                    Compa Ratio: {((parseFloat(form.monthly_salary) / parseFloat(form.grade_mid)) * 100).toFixed(1)}%
                    <span style={{ fontWeight: 400, color: "#6b7a99", marginLeft: 10 }}>
                      ({parseFloat(form.monthly_salary) < parseFloat(form.grade_mid) * 0.9 ? "Below Range" : parseFloat(form.monthly_salary) > parseFloat(form.grade_mid) * 1.1 ? "Above Range" : "In Range"})
                    </span>
                  </div>
                )}

                <div style={SECT}>Equity</div>
                <div style={G3}>
                  <FI label="Equity % of Band Mid" name="equity_pct" form={form} onChange={onChange} type="number" placeholder="0.5" />
                  <FI label="Equity Grant (USD)" name="equity_grant" form={form} onChange={onChange} type="number" />
                  <FI label="Equity Refresh 1 (USD)" name="equity_refresh_1" form={form} onChange={onChange} type="number" />
                  <FI label="Equity Refresh 2 (USD)" name="equity_refresh_2" form={form} onChange={onChange} type="number" />
                  <FI label="Equity Refresh 3 (USD)" name="equity_refresh_3" form={form} onChange={onChange} type="number" />
                  <FI label="Equity Refresh 4 (USD)" name="equity_refresh_4" form={form} onChange={onChange} type="number" />
                </div>

                <div style={SECT}>History</div>
                <div style={G2}>
                  <FI label="Last Change in Salary" name="last_change_salary_date" form={form} onChange={onChange} type="date" />
                  <FI label="Last Change in Equity" name="last_change_equity_date" form={form} onChange={onChange} type="date" />
                  <FI label="Last Promotion Date" name="last_promotion" form={form} onChange={onChange} type="date" />
                </div>
              </div>
            )}

            {/* ── Performance ── */}
            {panelTab === "perf" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={SECT}>Annual Performance Scores</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
                  {[2026,2027,2028,2029,2030].map(y => (
                    <div key={y}>
                      <label style={{ ...LBL, fontSize: 13, color: "#374151", textTransform: "none" as const }}>PM Score {y}</label>
                      <select style={INP} value={form[`pm_score_${y}`] ?? ""} onChange={e => onChange(`pm_score_${y}`, e.target.value)}>
                        <option value="">—</option>
                        {PM_OPTIONS.map(o => <option key={o}>{o}</option>)}
                      </select>
                      {form[`pm_score_${y}`] && form[`pm_score_${y}`] !== "—" && (
                        <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: form[`pm_score_${y}`] === "Exceeds Expectations" ? "#f0fdf4" : form[`pm_score_${y}`] === "Meets Expectations" ? "#eff6ff" : "#fff7ed", color: form[`pm_score_${y}`] === "Exceeds Expectations" ? "#16a34a" : form[`pm_score_${y}`] === "Meets Expectations" ? "#1d4ed8" : "#c2410c" }}>
                          {form[`pm_score_${y}`]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Personal ── */}
            {panelTab === "personal" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={SECT}>Personal Information</div>
                <div style={G2}>
                  <FI label="First Name" name="first_name" form={form} onChange={onChange} />
                  <FI label="Last Name" name="last_name" form={form} onChange={onChange} />
                  <FI label="Full Name (Arabic)" name="full_name_arabic" form={form} onChange={onChange} />
                  <FS label="Gender" name="gender" form={form} onChange={onChange} options={GENDERS} />
                  <FI label="Date of Birth" name="date_of_birth" form={form} onChange={onChange} type="date" />
                  <FI label="Nationality" name="nationality" form={form} onChange={onChange} />
                  <FI label="Work Phone" name="work_phone" form={form} onChange={onChange} placeholder="+966 5X XXX XXXX" />
                  <FI label="Personal Phone" name="mobile" form={form} onChange={onChange} placeholder="+966 5X XXX XXXX" />
                  <FI label="Personal Email" name="personal_email" form={form} onChange={onChange} type="email" />
                  <FI label="Home Address" name="home_address" form={form} onChange={onChange} span2 />
                </div>
              </div>
            )}

            {/* ── Identity ── */}
            {panelTab === "identity" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={SECT}>Identity Documents</div>
                <div style={G2}>
                  <FI label="National ID (Hawiya)" name="national_id" form={form} onChange={onChange} />
                  <FI label="Passport ID / Number" name="passport_number" form={form} onChange={onChange} />
                  <FI label="Passport Expiry" name="passport_expiry" form={form} onChange={onChange} type="date" />
                  <FI label="Iqama ID Number" name="iqama_number" form={form} onChange={onChange} />
                  <FI label="Iqama Expiry Date" name="iqamaExpiry" form={form} onChange={onChange} type="date" />
                  <FI label="Temporary Work Permit ID" name="temp_permit_id" form={form} onChange={onChange} />
                  <FI label="Temp Permit Expiry" name="temp_permit_expiry" form={form} onChange={onChange} type="date" />
                  <FI label="GOSI Number" name="gosi_number" form={form} onChange={onChange} />
                </div>
              </div>
            )}

            {/* ── Banking ── */}
            {panelTab === "banking" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={SECT}>Banking & Payroll</div>
                <div style={G2}>
                  <FI label="Bank Name" name="bank_name" form={form} onChange={onChange} placeholder="Al Rajhi Bank" />
                  <FI label="Bank Country" name="bank_country" form={form} onChange={onChange} placeholder="Saudi Arabia" />
                  <FI label="Account Holder Name" name="account_holder_name" form={form} onChange={onChange} />
                  <FI label="IBAN" name="iban" form={form} onChange={onChange} placeholder="SA00 0000 0000 0000 0000 0000" span2 />
                </div>
                <div style={{ padding: "14px 16px", background: "#fff7ed", borderRadius: 10, fontSize: 12.5, color: "#c2410c" }}>
                  ⚠ IBAN must be registered in Saudi Arabia for Mudad (WPS) payroll compliance.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add Employee Modal ───────────────────────────────────────────────── */}
      {showAdd && (() => {
        const af = (k: keyof typeof addForm) => addForm[k];
        const set = (k: keyof typeof addForm, v: string) => setAddForm(f => ({ ...f, [k]: v }));
        const ADD_SECTIONS = ["Core Info", "Classification", "Org Structure", "Location & Dates"];
        const canSubmit = !!addForm.name && !!addForm.email && !!addForm.role && !!addForm.startDate;
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
            <div style={{ background: "white", borderRadius: 16, width: 740, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>

              {/* Header */}
              <div style={{ background: "#0a1628", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: "#93c5fd", marginBottom: 2 }}>PEOPLE HUB</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "white" }}>Add New Team Member</div>
                </div>
                <button onClick={() => { setShowAdd(false); setAddSection(0); }} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>

              {/* Step tabs */}
              <div style={{ display: "flex", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
                {ADD_SECTIONS.map((s, i) => (
                  <button key={s} onClick={() => setAddSection(i)} style={{ flex: 1, padding: "10px 4px", border: "none", background: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "Outfit,sans-serif", color: addSection === i ? "#0a1628" : "#94a3b8", borderBottom: addSection === i ? "2px solid #0a1628" : "2px solid transparent" }}>
                    <span style={{ display: "inline-block", width: 18, height: 18, borderRadius: "50%", background: addSection === i ? "#0a1628" : "#e2e8f0", color: addSection === i ? "white" : "#94a3b8", fontSize: 10, lineHeight: "18px", textAlign: "center", marginRight: 5 }}>{i + 1}</span>
                    {s}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>

                {/* ── Step 0: Core Info ── */}
                {addSection === 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={LBL}>Full Name *</label>
                      <input style={INP} value={af("name")} onChange={e => set("name", e.target.value)} placeholder="Ahmed Al-Rashidi" />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={LBL}>Work Email *</label>
                      <input style={INP} type="email" value={af("email")} onChange={e => set("email", e.target.value)} placeholder="ahmed@think-ai.com" />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={LBL}>Position Title *</label>
                      <input style={INP} value={af("role")} onChange={e => set("role", e.target.value)} placeholder="Senior AI Engineer" />
                    </div>
                    <div>
                      <label style={LBL}>Level</label>
                      <select style={INP} value={af("level")} onChange={e => set("level", e.target.value)}>
                        {LEVELS.map(l => <option key={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LBL}>Department</label>
                      <select style={INP} value={af("department")} onChange={e => set("department", e.target.value)}>
                        {DEPTS.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LBL}>Employee Type</label>
                      <select style={INP} value={af("isExpat")} onChange={e => set("isExpat", e.target.value)}>
                        <option value="false">Saudi National</option>
                        <option value="true">Expat Hire</option>
                      </select>
                    </div>
                    <div>
                      <label style={LBL}>Nationality</label>
                      <input style={INP} value={af("nationality")} onChange={e => set("nationality", e.target.value)} placeholder="Saudi / Egyptian..." />
                    </div>
                  </div>
                )}

                {/* ── Step 1: Classification ── */}
                {addSection === 1 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={LBL}>People Group</label>
                      <select style={INP} value={af("people_group")} onChange={e => set("people_group", e.target.value)}>
                        {PEOPLE_GROUPS.map(g => <option key={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LBL}>Band (Tech / Non Tech)</label>
                      <select style={INP} value={af("band")} onChange={e => set("band", e.target.value)}>
                        <option value="">—</option>
                        {BANDS.map(b => <option key={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LBL}>Job Family</label>
                      <input style={INP} value={af("job_family")} onChange={e => set("job_family", e.target.value)} placeholder="Engineering" />
                    </div>
                    <div>
                      <label style={LBL}>Sub Job Family</label>
                      <input style={INP} value={af("sub_job_family")} onChange={e => set("sub_job_family", e.target.value)} placeholder="AI / ML" />
                    </div>
                    <div>
                      <label style={LBL}>Grade (e.g. G5)</label>
                      <input style={INP} value={af("grade")} onChange={e => set("grade", e.target.value)} placeholder="G5" />
                    </div>
                    <div>
                      <label style={LBL}>Job Requisition ID</label>
                      <input style={INP} value={af("job_req_id")} onChange={e => set("job_req_id", e.target.value)} placeholder="JR-2026-001" />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={LBL}>Line of Business</label>
                      <input style={INP} value={af("line_of_business")} onChange={e => set("line_of_business", e.target.value)} placeholder="AI Products / HR Tech / Consulting..." />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={LBL}>Vendor Name (if Outsourced / Contractor)</label>
                      <input style={INP} value={af("vendor_name")} onChange={e => set("vendor_name", e.target.value)} placeholder="Leave blank for FTE" />
                    </div>
                  </div>
                )}

                {/* ── Step 2: Org Structure ── */}
                {addSection === 2 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={LBL}>Division</label>
                      <input style={INP} value={af("division")} onChange={e => set("division", e.target.value)} placeholder="Technology" />
                    </div>
                    <div>
                      <label style={LBL}>Sub Division</label>
                      <input style={INP} value={af("sub_division")} onChange={e => set("sub_division", e.target.value)} placeholder="Platform" />
                    </div>
                    <div>
                      <label style={LBL}>Sub Department</label>
                      <input style={INP} value={af("sub_department")} onChange={e => set("sub_department", e.target.value)} placeholder="Backend / Frontend..." />
                    </div>
                    <div>
                      <label style={LBL}>Squad</label>
                      <input style={INP} value={af("squad")} onChange={e => set("squad", e.target.value)} placeholder="Alpha Squad" />
                    </div>
                    <div>
                      <label style={LBL}>Tribe</label>
                      <input style={INP} value={af("tribe")} onChange={e => set("tribe", e.target.value)} placeholder="Growth Tribe" />
                    </div>
                    <div>
                      <label style={LBL}>Functional Team</label>
                      <input style={INP} value={af("functional_team")} onChange={e => set("functional_team", e.target.value)} placeholder="Core Platform" />
                    </div>
                    <div>
                      <label style={LBL}>Cost Center</label>
                      <input style={INP} value={af("cost_center")} onChange={e => set("cost_center", e.target.value)} placeholder="CC-001" />
                    </div>
                    <div>
                      <label style={LBL}>Team Lead</label>
                      <input style={INP} value={af("team_lead")} onChange={e => set("team_lead", e.target.value)} placeholder="Ahmed El Shrief" />
                    </div>
                  </div>
                )}

                {/* ── Step 3: Location & Dates ── */}
                {addSection === 3 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={LBL}>City</label>
                      <input style={INP} value={af("city_region")} onChange={e => set("city_region", e.target.value)} placeholder="Riyadh" />
                    </div>
                    <div>
                      <label style={LBL}>Country</label>
                      <input style={INP} value={af("country")} onChange={e => set("country", e.target.value)} placeholder="Saudi Arabia" />
                    </div>
                    <div>
                      <label style={LBL}>Hiring Date *</label>
                      <input style={INP} type="date" value={af("startDate")} onChange={e => set("startDate", e.target.value)} />
                    </div>
                    <div>
                      <label style={LBL}>Seniority Date</label>
                      <input style={INP} type="date" value={af("seniority_date")} onChange={e => set("seniority_date", e.target.value)} />
                    </div>
                    <div style={{ gridColumn: "span 2", background: "#f8fafc", borderRadius: 10, padding: "14px 18px", fontSize: 12, color: "#6b7a99" }}>
                      <b style={{ color: "#0a1628" }}>Note:</b> Compensation, equity, performance scores, identity documents, banking details and compliance fields can be filled in the employee detail panel after creation.
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: "16px 28px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 10, alignItems: "center", flexShrink: 0, background: "#fafbff" }}>
                {addSection > 0 && (
                  <button onClick={() => setAddSection(s => s - 1)} style={{ padding: "10px 18px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "white", fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>
                    ← Back
                  </button>
                )}
                <div style={{ flex: 1 }} />
                {addSection < ADD_SECTIONS.length - 1 ? (
                  <button onClick={() => setAddSection(s => s + 1)} style={{ padding: "10px 22px", borderRadius: 8, border: "none", background: "#0a1628", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>
                    Next →
                  </button>
                ) : (
                  <button onClick={addEmployee} disabled={addSaving || !canSubmit}
                    style={{ padding: "10px 28px", borderRadius: 8, border: "none", background: canSubmit ? "#e8c97a" : "#e2e8f0", color: canSubmit ? "#0a1628" : "#94a3b8", fontSize: 13, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "Outfit,sans-serif" }}>
                    {addSaving ? "Adding…" : "Add Employee"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Chip helper ──────────────────────────────────────────────────────────────
function Chip({ label, color }: { label: string; color: "green" | "amber" | "blue" | "navy" | "red" | "gray" | "purple" }) {
  const COLORS: Record<string, { bg: string; text: string }> = {
    green:  { bg: "#f0fdf4", text: "#16a34a" },
    amber:  { bg: "#fffbeb", text: "#b45309" },
    blue:   { bg: "#eff6ff", text: "#1d4ed8" },
    navy:   { bg: "#e0f2fe", text: "#0369a1" },
    red:    { bg: "#fef2f2", text: "#dc2626" },
    gray:   { bg: "#f1f5f9", text: "#64748b" },
    purple: { bg: "#faf5ff", text: "#7c3aed" },
  };
  const c = COLORS[color] ?? COLORS.gray;
  return (
    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, fontWeight: 700, background: c.bg, color: c.text }}>
      {label}
    </span>
  );
}
