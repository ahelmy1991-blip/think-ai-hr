"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { exportToExcel, exportToPDF, exportToWord } from "@/lib/export";
import { generateContractHTML, suggestSSCO, suggestSSCOFromTitle } from "@/lib/generateContract";
import { generatePayslipHTML, type PayslipLine } from "@/lib/generatePayslip";

// ── Types ────────────────────────────────────────────────────────────────────
interface KnowledgeEntry { id: string; title: string; category: string; content: string; active: boolean; }
interface Job {
  id: string; title: string; department: string; level: string; location: string;
  jobType: string; description: string; requirements: Req[]; targetCountries: string[];
  minYearsExp: number; maxYearsExp: number; specialty: string; preferAIExp: boolean;
  headcount: number; status: string; _count?: { candidates: number };
  talent_preference?: string; company_overview?: string; values_expectations?: string;
}
interface Req { type: string; text: string; }
interface Candidate {
  id: string; name: string; email: string | null; currentRole: string | null;
  currentCompany: string | null; country: string | null; specialty: string | null;
  stage: string; matchScore: number | null; linkedinUrl: string | null;
  yearsExperience: number | null; skills: string[]; languages: string[];
  notes: string | null; linkedinImported: boolean;
  job?: { title: string } | null;
}
interface Employee {
  id: string; name: string; email: string; role: string; level: string;
  department: string; status: string; isExpat: boolean; nationality: string | null;
  startDate: string | null;
  // Profile fields
  grade: string | null; band: string | null; people_group: string | null;
  job_family: string | null; sub_job_family: string | null;
  division: string | null; sub_division: string | null; sub_department: string | null;
  squad: string | null; tribe: string | null; functional_team: string | null; cost_center: string | null;
  city_region: string | null; country: string | null; team_lead: string | null; line_of_business: string | null;
  monthly_salary: number | null; currency: string | null; equity_pct: number | null; equity_grant: number | null;
  gender: string | null; date_of_birth: string | null; mobile: string | null; work_phone: string | null;
  personal_email: string | null; national_id: string | null; iqama_number: string | null;
  passport_number: string | null; bank_name: string | null; iban: string | null; account_holder_name: string | null;
  gosi_number: string | null; gosi_registered: boolean | null; saned_registered: boolean | null;
  absher_linked: boolean | null; qiwa_registered: boolean | null;
  full_name_arabic: string | null; religion: string | null; marital_status: string | null;
  home_address: string | null; bank_country: string | null; mudad_linked: boolean | null;
  seniority_date: string | null; latest_contract_start: string | null; latest_contract_end: string | null;
  payroll_status: string | null; exco: string | null; dotted_line_manager: string | null;
  vendor_name: string | null; job_req_id: string | null;
}

const TABS = ["Knowledge Base", "Jobs", "Candidates", "Team", "Onboarding", "Compensation", "Absence", "Medical", "Portal", "Contracts", "Payroll"] as const;
type Tab = typeof TABS[number];

const NAV = { background: "#0a1628", color: "white" };
const CARD: React.CSSProperties = { background: "white", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", marginBottom: 16 };
const BTN = (c = "#0a1628", text = "white"): React.CSSProperties => ({
  padding: "8px 18px", borderRadius: 7, border: "none", background: c, color: text,
  cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "Outfit,sans-serif",
});
const INPUT: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #dce3ee",
  fontSize: 13, fontFamily: "Outfit,sans-serif", boxSizing: "border-box", color: "#1a2540",
};
const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#6b7a99", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 4 };

const EXPORT_BTN = (bg: string): React.CSSProperties => ({
  padding: "7px 14px", borderRadius: 7, border: "none", background: bg, color: "white",
  cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "Outfit,sans-serif",
});

const SECTION_HEADING: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#6b7a99", textTransform: "uppercase",
  letterSpacing: "0.1em", margin: "20px 0 10px", borderBottom: "1px solid #e2e8f0", paddingBottom: 6,
};

const REQ_TYPES = ["qualification", "certification", "past_experience", "skill", "language", "other"];
const DEFAULT_DEPARTMENTS = ["Engineering", "Product", "Research", "People", "Finance", "Operations", "Sales", "Marketing"];
const LEVELS = ["L1","L2","L3","L4","L5","L6","L7","L8","L9","L10","L11","L12","L13","L14","L15"];
const STATUSES = ["open", "paused", "closed"];
const EMP_STATUSES = ["active", "probation", "terminated"];
const KNOWLEDGE_CATS = ["policy", "role", "compensation", "compliance", "culture", "general"];

// ── Departments manager ───────────────────────────────────────────────────────
// Stored in sessionStorage so new custom depts survive tab switches
function useDepartments() {
  const [depts, setDepts] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem("think_ai_depts");
      return stored ? JSON.parse(stored) : DEFAULT_DEPARTMENTS;
    } catch { return DEFAULT_DEPARTMENTS; }
  });

  function addDept(name: string) {
    const trimmed = name.trim();
    if (!trimmed || depts.includes(trimmed)) return;
    const next = [...depts, trimmed].sort();
    setDepts(next);
    sessionStorage.setItem("think_ai_depts", JSON.stringify(next));
  }

  return { depts, addDept };
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("Knowledge Base");
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const { depts, addDept } = useDepartments();
  const [showHealthCheck, setShowHealthCheck] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  useEffect(() => { loadAll(); }, []);
  function loadAll() {
    fetch("/api/admin/knowledge").then(r => r.json()).then(setKnowledge).catch(() => {});
    fetch("/api/recruitment/jobs").then(r => r.json()).then(setJobs).catch(() => {});
    fetch("/api/recruitment/candidates").then(r => r.json()).then(setCandidates).catch(() => {});
    fetch("/api/employees").then(r => r.json()).then(setEmployees).catch(() => {});
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "Outfit,sans-serif" }}>
      {/* Header */}
      <div style={{ ...NAV, padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, color: "#e8c97a", fontWeight: 700, letterSpacing: "0.12em" }}>THINK-AI · ADMIN</div>
          <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 22, fontWeight: 600 }}>System Administration</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setShowHealthCheck(true)} style={{ padding: "7px 16px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>
            🔍 System Check
          </button>
          <button onClick={() => window.print()} style={{ padding: "7px 16px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>
            🖨 Print View
          </button>
          <a href="/" style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textDecoration: "none" }}>← Back to Hub</a>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#0a1628", padding: "0 32px", display: "flex", gap: 4 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 20px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            fontFamily: "Outfit,sans-serif", background: "none",
            color: tab === t ? "#e8c97a" : "rgba(255,255,255,0.5)",
            borderBottom: tab === t ? "2px solid #e8c97a" : "2px solid transparent",
          }}>{t}</button>
        ))}
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
        {tab === "Knowledge Base" && <KnowledgeTab entries={knowledge} reload={loadAll} saving={saving} setSaving={setSaving} showToast={showToast} />}
        {tab === "Jobs"          && <JobsTab jobs={jobs} reload={loadAll} saving={saving} setSaving={setSaving} showToast={showToast} depts={depts} addDept={addDept} />}
        {tab === "Candidates"    && <CandidatesTab candidates={candidates} reload={loadAll} showToast={showToast} />}
        {tab === "Team"          && <TeamTab employees={employees} reload={loadAll} saving={saving} setSaving={setSaving} showToast={showToast} depts={depts} addDept={addDept} />}
        {tab === "Onboarding"    && <OnboardingTab showToast={showToast} />}
        {tab === "Compensation"  && <CompensationTab showToast={showToast} />}
        {tab === "Absence"       && <AbsenceTab showToast={showToast} />}
        {tab === "Medical"       && <MedicalTab showToast={showToast} />}
        {tab === "Portal"        && <PortalTab showToast={showToast} />}
        {tab === "Contracts"     && <ContractsTab employees={employees} showToast={showToast} />}
        {tab === "Payroll"       && <PayrollTab showToast={showToast} />}
      </div>

      {/* System Health Check Modal */}
      {showHealthCheck && (
        <SystemHealthModal employees={employees} onClose={() => setShowHealthCheck(false)} />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          background: "#0a1628", color: "#e8c97a", padding: "12px 28px", borderRadius: 10,
          fontWeight: 600, fontSize: 14, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}>{toast}</div>
      )}
    </div>
  );
}

// ── System Health Check Modal ─────────────────────────────────────────────────
interface CheckResult { label: string; status: "pass" | "fail" | "warn" | "loading"; detail?: string; }

function SystemHealthModal({ employees, onClose }: { employees: Employee[]; onClose: () => void }) {
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [dataAudit, setDataAudit] = useState<{ name: string; missing: string[] }[]>([]);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    const ENDPOINTS: Array<{ url: string; label: string }> = [
      { url: "/api/employees",           label: "Team data" },
      { url: "/api/admin/knowledge",     label: "Knowledge Base" },
      { url: "/api/admin/onboarding",    label: "Onboarding" },
      { url: "/api/admin/salary-bands",  label: "Compensation" },
      { url: "/api/admin/absence",       label: "Absence" },
      { url: "/api/admin/medical",       label: "Medical" },
      { url: "/api/admin/directory",     label: "Directory" },
      { url: "/api/portal/directory",    label: "Employee Portal Directory" },
      { url: "/api/portal/handbook",     label: "Handbook" },
      { url: "/api/admin/announcements", label: "Announcements" },
    ];

    const results: CheckResult[] = ENDPOINTS.map(e => ({ label: e.label, status: "loading" }));
    setChecks([...results]);

    async function runChecks() {
      for (let i = 0; i < ENDPOINTS.length; i++) {
        try {
          const r = await fetch(ENDPOINTS[i].url);
          results[i] = {
            label: ENDPOINTS[i].label,
            status: r.ok ? "pass" : "fail",
            detail: r.ok ? `HTTP ${r.status}` : `HTTP ${r.status}`,
          };
        } catch {
          results[i] = { label: ENDPOINTS[i].label, status: "fail", detail: "Network error" };
        }
        setChecks([...results]);
      }

      // Data audit
      const issues: { name: string; missing: string[] }[] = [];
      for (const e of employees) {
        const missing: string[] = [];
        if (!e.email)      missing.push("email");
        if (!e.role)       missing.push("role");
        if (!e.department) missing.push("department");
        if (!e.level)      missing.push("level");
        if (!e.startDate)  missing.push("startDate");
        if (!e.grade)      missing.push("grade");
        if (!e.band)       missing.push("band");
        if (!e.people_group) missing.push("people_group");
        if (!e.job_family)   missing.push("job_family");
        if (!e.city_region)  missing.push("city_region");
        if (!e.country)      missing.push("country");
        if (missing.length > 0) issues.push({ name: e.name, missing });
      }
      setDataAudit(issues);
      setRunning(false);
    }

    runChecks();
  }, []);

  const passed = checks.filter(c => c.status === "pass").length;
  const total  = checks.length;

  const statusIcon = (s: CheckResult["status"]) =>
    s === "pass" ? "✓" : s === "fail" ? "✗" : s === "warn" ? "⚠" : "…";
  const statusColor = (s: CheckResult["status"]) =>
    s === "pass" ? "#16a34a" : s === "fail" ? "#dc2626" : s === "warn" ? "#d97706" : "#94a3b8";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9500, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }}>
      <div style={{ background: "white", borderRadius: 16, width: "100%", maxWidth: 700, boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}>
        {/* Modal header */}
        <div style={{ background: "#0a1628", borderRadius: "16px 16px 0 0", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: "#e8c97a", fontWeight: 700, letterSpacing: "0.12em" }}>THINK-AI · ADMIN</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "white" }}>🔍 System Health Check</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 28 }}>
          {/* Summary bar */}
          {!running && (
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <div style={{ flex: 1, background: "#f0fdf4", borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#16a34a" }}>{passed}/{total}</div>
                <div style={{ fontSize: 12, color: "#6b7a99" }}>API checks passed</div>
              </div>
              <div style={{ flex: 1, background: dataAudit.length > 0 ? "#fef2f2" : "#f0fdf4", borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: dataAudit.length > 0 ? "#dc2626" : "#16a34a" }}>{dataAudit.length}</div>
                <div style={{ fontSize: 12, color: "#6b7a99" }}>employees with missing data</div>
              </div>
            </div>
          )}

          {/* API checks */}
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7a99", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>API Endpoint Checks</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
            {checks.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: statusColor(c.status), width: 20, textAlign: "center" }}>{statusIcon(c.status)}</span>
                <span style={{ flex: 1, fontSize: 13, color: "#374151", fontWeight: 600 }}>{c.label}</span>
                {c.detail && <span style={{ fontSize: 11, color: "#94a3b8" }}>{c.detail}</span>}
                {c.status === "loading" && <span style={{ fontSize: 11, color: "#94a3b8" }}>Checking…</span>}
              </div>
            ))}
          </div>

          {/* Data Audit */}
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7a99", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            Data Audit — {employees.length} employees
          </div>
          {running ? (
            <div style={{ color: "#94a3b8", fontSize: 13 }}>Running audit…</div>
          ) : dataAudit.length === 0 ? (
            <div style={{ padding: "14px 18px", background: "#f0fdf4", borderRadius: 10, color: "#16a34a", fontWeight: 600, fontSize: 13 }}>
              ✓ All employees have complete critical profile data
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
              {dataAudit.map((d, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "8px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca" }}>
                  <span style={{ color: "#dc2626", fontWeight: 700 }}>✗</span>
                  <span style={{ fontWeight: 700, color: "#0a1628", flex: 1 }}>{d.name}</span>
                  <span style={{ fontSize: 12, color: "#6b7a99" }}>missing: {d.missing.join(" · ")}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={onClose} style={BTN()}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared AI button style ────────────────────────────────────────────────────
const AI_BTN: React.CSSProperties = {
  padding: "7px 14px", borderRadius: 7, border: "none", background: "#7c3aed",
  color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer",
  fontFamily: "Outfit,sans-serif", display: "inline-flex", alignItems: "center", gap: 5,
};
const AI_BTN_LOADING: React.CSSProperties = { ...AI_BTN, background: "#94a3b8", cursor: "not-allowed" };

async function aiGenerate(type: string, context: Record<string, unknown>) {
  const r = await fetch("/api/admin/ai/generate", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, context }),
  });
  if (!r.ok) throw new Error("AI generation failed");
  return r.json();
}

// ── Knowledge Base Tab ────────────────────────────────────────────────────────
function KnowledgeTab({ entries, reload, saving, setSaving, showToast }: {
  entries: KnowledgeEntry[]; reload: () => void; saving: boolean;
  setSaving: (v: boolean) => void; showToast: (m: string) => void;
}) {
  const [form, setForm] = useState({ title: "", category: "general", content: "" });
  const [editing, setEditing] = useState<KnowledgeEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  function handleExcelExport() {
    exportToExcel("knowledge_base", [{
      name: "Knowledge Base",
      data: entries.map(e => ({ title: e.title, category: e.category, content: e.content, active: e.active ? "Yes" : "No" })),
    }]);
  }
  function handlePDFExport() {
    exportToPDF("Knowledge Base", ["Title", "Category", "Active", "Content (excerpt)"],
      entries.map(e => [e.title, e.category, e.active ? "Yes" : "No", (e.content || "").slice(0, 80)]),
      "THINK-AI HR · Knowledge Base Export"
    );
  }
  function handleWordExport() {
    const rows = entries.map(e => `<tr><td>${e.title}</td><td>${e.category}</td><td>${e.active ? "Yes" : "No"}</td><td>${(e.content || "").replace(/</g, "&lt;")}</td></tr>`).join("");
    exportToWord("knowledge_base", "Knowledge Base", `<table><thead><tr><th>Title</th><th>Category</th><th>Active</th><th>Content</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  async function generateArticle() {
    if (!form.title) { alert("Enter a title first"); return; }
    setAiLoading(true);
    try {
      const d = await aiGenerate("knowledge", { title: form.title, category: form.category });
      setForm(f => ({ ...f, content: d.content || f.content }));
      showToast("Article generated — review and save");
    } catch { alert("AI generation failed"); }
    setAiLoading(false);
  }

  async function save() {
    setSaving(true);
    if (editing) {
      await fetch(`/api/admin/knowledge/${editing.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, active: editing.active }),
      });
      showToast("Knowledge entry updated");
    } else {
      await fetch("/api/admin/knowledge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      showToast("Knowledge entry added — AI will use it immediately");
    }
    setForm({ title: "", category: "general", content: "" });
    setEditing(null); setShowForm(false);
    reload(); setSaving(false);
  }

  async function del(id: string) {
    if (!confirm("Delete this knowledge entry?")) return;
    await fetch(`/api/admin/knowledge/${id}`, { method: "DELETE" });
    showToast("Deleted"); reload();
  }

  async function toggle(e: KnowledgeEntry) {
    await fetch(`/api/admin/knowledge/${e.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...e, active: !e.active }),
    });
    reload();
  }

  function startEdit(e: KnowledgeEntry) {
    setEditing(e); setForm({ title: e.title, category: e.category, content: e.content });
    setShowForm(true);
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0a1628" }}>Knowledge Base</div>
          <div style={{ fontSize: 13, color: "#6b7a99", marginTop: 2 }}>Entries are injected into the AI system prompt — add policies, role info, FAQs</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleExcelExport} style={EXPORT_BTN("#16a34a")}>⬇ Excel</button>
          <button onClick={handlePDFExport}   style={EXPORT_BTN("#dc2626")}>⬇ PDF</button>
          <button onClick={handleWordExport}  style={EXPORT_BTN("#2563eb")}>⬇ Word</button>
          <button onClick={() => { setEditing(null); setForm({ title: "", category: "general", content: "" }); setShowForm(true); }} style={BTN()}>+ Add Entry</button>
        </div>
      </div>

      {showForm && (
        <div style={{ ...CARD, border: "2px solid #e8c97a" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0a1628" }}>{editing ? "Edit Entry" : "New Knowledge Entry"}</div>
            <button onClick={generateArticle} disabled={aiLoading} style={aiLoading ? AI_BTN_LOADING : AI_BTN}>
              {aiLoading ? "Generating…" : "✦ Generate Article"}
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 12, marginBottom: 12 }}>
            <div><label style={LABEL}>Title</label><input style={INPUT} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Sick Leave Policy — Full Guide" /></div>
            <div><label style={LABEL}>Category</label>
              <select style={INPUT} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {KNOWLEDGE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>Content (what the AI should know)</label>
            <textarea style={{ ...INPUT, height: 200, resize: "vertical" }} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Write manually or click ✦ Generate Article above — AI will produce a structured policy article based on your title and category." />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={save} disabled={saving || !form.title || !form.content} style={BTN(saving || !form.title || !form.content ? "#94a3b8" : "#0a1628")}>{saving ? "Saving..." : "Save Entry"}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} style={BTN("#f1f5f9", "#475569")}>Cancel</button>
          </div>
        </div>
      )}

      {entries.length === 0 && !showForm && (
        <div style={{ ...CARD, textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📚</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#475569" }}>No knowledge entries yet</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Add role profiles, policy updates, or custom FAQs — the AI uses them when answering questions.</div>
        </div>
      )}

      {entries.map(e => (
        <div key={e.id} style={{ ...CARD, opacity: e.active ? 1 : 0.55 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#0a1628" }}>{e.title}</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f0f4f8", color: "#6b7a99", fontWeight: 600 }}>{e.category}</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: e.active ? "#dcfce7" : "#fee2e2", color: e.active ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{e.active ? "Active" : "Inactive"}</span>
              </div>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, maxHeight: 80, overflow: "hidden" }}>{e.content}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 16 }}>
              <button onClick={() => toggle(e)} style={BTN(e.active ? "#fef3c7" : "#dcfce7", e.active ? "#92400e" : "#166534")}>{e.active ? "Disable" : "Enable"}</button>
              <button onClick={() => startEdit(e)} style={BTN("#f1f5f9", "#475569")}>Edit</button>
              <button onClick={() => del(e.id)} style={BTN("#fee2e2", "#dc2626")}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Jobs Tab ──────────────────────────────────────────────────────────────────
function JobsTab({ jobs, reload, saving, setSaving, showToast, depts, addDept }: {
  jobs: Job[]; reload: () => void; saving: boolean;
  setSaving: (v: boolean) => void; showToast: (m: string) => void;
  depts: string[]; addDept: (s: string) => void;
}) {
  const blank: Omit<Job, "id" | "_count"> = {
    title: "", department: "Engineering", level: "L7", location: "Riyadh, KSA",
    jobType: "full-time", description: "", requirements: [], targetCountries: [],
    minYearsExp: 3, maxYearsExp: 10, specialty: "", preferAIExp: true, headcount: 1, status: "open",
    talent_preference: "open", company_overview: "", values_expectations: "",
  };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newReq, setNewReq] = useState({ type: "qualification", text: "" });
  const [aiLoading, setAiLoading]     = useState(false);
  const [reqAiLoading, setReqAiLoading] = useState(false);
  const [deptAiLoading, setDeptAiLoading] = useState(false);
  const [customDept, setCustomDept]   = useState("");
  const [suggestedDepts, setSuggestedDepts] = useState<string[]>([]);

  function startNew() { setEditing(null); setForm(blank); setShowForm(true); setSuggestedDepts([]); }
  function startEdit(j: Job) {
    setEditing(j.id);
    setForm({ title: j.title, department: j.department, level: j.level, location: j.location,
      jobType: j.jobType, description: j.description, requirements: j.requirements || [],
      targetCountries: j.targetCountries || [], minYearsExp: j.minYearsExp, maxYearsExp: j.maxYearsExp,
      specialty: j.specialty, preferAIExp: j.preferAIExp, headcount: j.headcount, status: j.status,
      talent_preference: j.talent_preference ?? "open",
      company_overview: j.company_overview ?? "",
      values_expectations: j.values_expectations ?? "",
    });
    setShowForm(true);
  }

  function addReq() {
    if (!newReq.text.trim()) return;
    setForm(f => ({ ...f, requirements: [...f.requirements, { type: newReq.type, text: newReq.text.trim() }] }));
    setNewReq(r => ({ ...r, text: "" }));
  }

  function removeReq(i: number) {
    setForm(f => ({ ...f, requirements: f.requirements.filter((_, idx) => idx !== i) }));
  }

  async function generateAI() {
    if (!form.title) { alert("Enter a job title first"); return; }
    setAiLoading(true);
    try {
      const r = await fetch("/api/admin/jobs/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title, department: form.department, level: form.level,
          specialty: form.specialty, minYearsExp: form.minYearsExp, maxYearsExp: form.maxYearsExp,
          talentPreference: form.talent_preference, preferAIExp: form.preferAIExp,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        setForm(f => ({
          ...f,
          description: d.description || f.description,
          company_overview: d.companyOverview || f.company_overview,
          values_expectations: d.valuesExpectations || f.values_expectations,
        }));
        showToast("AI-generated job description ready — review and save");
      } else {
        alert("AI generation failed: " + (d.error || "Unknown error"));
      }
    } catch { alert("AI generation failed — check your connection"); }
    setAiLoading(false);
  }

  async function suggestRequirements() {
    if (!form.title) { alert("Enter a job title first"); return; }
    setReqAiLoading(true);
    try {
      const d = await aiGenerate("requirements", {
        title: form.title, department: form.department, level: form.level,
        specialty: form.specialty, minYearsExp: form.minYearsExp, maxYearsExp: form.maxYearsExp,
      });
      const reqs: Req[] = Array.isArray(d) ? d : [];
      setForm(f => ({ ...f, requirements: [...f.requirements, ...reqs] }));
      showToast(`Added ${reqs.length} AI-suggested requirements`);
    } catch { alert("Requirements AI failed"); }
    setReqAiLoading(false);
  }

  async function suggestDepts() {
    setDeptAiLoading(true);
    try {
      const d = await aiGenerate("departments", { existing: depts });
      if (Array.isArray(d)) setSuggestedDepts(d);
    } catch { alert("Department AI failed"); }
    setDeptAiLoading(false);
  }

  async function save() {
    if (!form.title || !form.description) return alert("Title and description required");
    setSaving(true);
    if (editing) {
      await fetch(`/api/admin/jobs/${editing}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      showToast("Job updated");
    } else {
      await fetch("/api/recruitment/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      showToast("Job created");
    }
    setShowForm(false); setEditing(null); reload(); setSaving(false);
  }

  async function del(id: string, title: string) {
    if (!confirm(`Delete "${title}"? All linked candidates will be unlinked.`)) return;
    await fetch(`/api/admin/jobs/${id}`, { method: "DELETE" });
    showToast("Job deleted"); reload();
  }

  const REQ_COLORS: Record<string, string> = {
    qualification: "#dbeafe", certification: "#fef3c7", past_experience: "#dcfce7",
    skill: "#f3e8ff", language: "#ffe4e6", other: "#f1f5f9",
  };
  const TALENT_OPTIONS = [
    { value: "open", label: "Open to All" },
    { value: "saudi", label: "Saudi National Preferred (Vision 2030)" },
    { value: "expat", label: "Expat / International" },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0a1628" }}>Jobs ({jobs.length})</div>
          <div style={{ fontSize: 13, color: "#6b7a99", marginTop: 2 }}>Full job management with AI-generated descriptions, company context, values, and talent preference</div>
        </div>
        <button onClick={startNew} style={BTN()}>+ New Job</button>
      </div>

      {showForm && (
        <div style={{ ...CARD, border: "2px solid #e8c97a", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0a1628" }}>{editing ? "Edit Job" : "New Job"}</div>
            <button onClick={generateAI} disabled={aiLoading} style={{
              ...BTN(aiLoading ? "#94a3b8" : "#7c3aed"),
              display: "flex", alignItems: "center", gap: 8,
            }}>
              {aiLoading ? "Generating…" : "✦ Generate with AI"}
            </button>
          </div>

          {/* Basic fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div><label style={LABEL}>Job Title *</label><input style={INPUT} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Senior ML Engineer" /></div>
            <div><label style={LABEL}>Department</label>
              <select style={INPUT} value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                {depts.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div><label style={LABEL}>Level (Grade)</label>
              <select style={INPUT} value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                {LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div><label style={LABEL}>Specialty</label><input style={INPUT} value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="e.g. NLP / LLMs" /></div>
            {/* Department management row */}
            <div style={{ gridColumn: "span 2" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: "0 0 220px" }}>
                  <label style={LABEL}>New Department</label>
                  <input style={INPUT} value={customDept} onChange={e => setCustomDept(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && customDept.trim()) { addDept(customDept); setForm(f => ({ ...f, department: customDept.trim() })); setCustomDept(""); } }}
                    placeholder="e.g. AI Safety" />
                </div>
                <button onClick={() => { if (customDept.trim()) { addDept(customDept.trim()); setForm(f => ({ ...f, department: customDept.trim() })); setCustomDept(""); } }}
                  style={BTN("#f0f4f8", "#0a1628")}>+ Add Dept</button>
                <button onClick={suggestDepts} disabled={deptAiLoading} style={deptAiLoading ? AI_BTN_LOADING : AI_BTN}>
                  {deptAiLoading ? "Thinking…" : "✦ Suggest Depts"}
                </button>
              </div>
              {suggestedDepts.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "#6b7a99", alignSelf: "center" }}>AI suggests:</span>
                  {suggestedDepts.map(d => (
                    <button key={d} onClick={() => { addDept(d); setForm(f => ({ ...f, department: d })); setSuggestedDepts(s => s.filter(x => x !== d)); }}
                      style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#ede9fe", color: "#7c3aed", border: "1px dashed #c4b5fd", cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>
                      + {d}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div><label style={LABEL}>Min Years Experience</label><input type="number" style={INPUT} value={form.minYearsExp} onChange={e => setForm(f => ({ ...f, minYearsExp: Number(e.target.value) }))} /></div>
            <div><label style={LABEL}>Max Years Experience</label><input type="number" style={INPUT} value={form.maxYearsExp} onChange={e => setForm(f => ({ ...f, maxYearsExp: Number(e.target.value) }))} /></div>
            <div><label style={LABEL}>Location</label><input style={INPUT} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
            <div><label style={LABEL}>Status</label>
              <select style={INPUT} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={LABEL}>Headcount</label><input type="number" style={INPUT} value={form.headcount} onChange={e => setForm(f => ({ ...f, headcount: Number(e.target.value) }))} /></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 20 }}>
              <input type="checkbox" id="aiexp" checked={form.preferAIExp} onChange={e => setForm(f => ({ ...f, preferAIExp: e.target.checked }))} />
              <label htmlFor="aiexp" style={{ fontSize: 13, color: "#475569" }}>Prefer AI company experience</label>
            </div>
          </div>

          {/* Talent preference */}
          <div style={{ marginBottom: 14 }}>
            <label style={LABEL}>Talent Preference</label>
            <div style={{ display: "flex", gap: 10 }}>
              {TALENT_OPTIONS.map(o => (
                <label key={o.value} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 8, border: `1.5px solid ${form.talent_preference === o.value ? "#0a1628" : "#dce3ee"}`, cursor: "pointer", fontSize: 13, color: "#374151", background: form.talent_preference === o.value ? "#f0f4f8" : "white" }}>
                  <input type="radio" name="talent" value={o.value} checked={form.talent_preference === o.value} onChange={() => setForm(f => ({ ...f, talent_preference: o.value }))} style={{ margin: 0 }} />
                  {o.label}
                </label>
              ))}
            </div>
          </div>

          {/* Company Overview */}
          <div style={{ marginBottom: 14 }}>
            <label style={LABEL}>About THINK-AI (Company Overview)</label>
            <textarea style={{ ...INPUT, height: 100, resize: "vertical" }} value={form.company_overview ?? ""}
              onChange={e => setForm(f => ({ ...f, company_overview: e.target.value }))}
              placeholder="Company context shown on job posting — AI will fill this when you click Generate" />
          </div>

          {/* Job Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={LABEL}>Job Description & Responsibilities *</label>
            <textarea style={{ ...INPUT, height: 200, resize: "vertical" }} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the role, what this person will own, success metrics… (AI will fill this)" />
          </div>

          {/* Values Expectations */}
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>Values Expectations (Ownership · Agility · Impact · Craft)</label>
            <textarea style={{ ...INPUT, height: 120, resize: "vertical" }} value={form.values_expectations ?? ""}
              onChange={e => setForm(f => ({ ...f, values_expectations: e.target.value }))}
              placeholder="How each THINK-AI value manifests in this role — AI will fill this" />
          </div>

          {/* Requirements builder */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ ...LABEL, marginBottom: 0 }}>Requirements (qualifications, certifications, past experience)</label>
              <button onClick={suggestRequirements} disabled={reqAiLoading} style={reqAiLoading ? AI_BTN_LOADING : AI_BTN}>
                {reqAiLoading ? "Generating…" : "✦ AI Suggest Requirements"}
              </button>
            </div>
            {form.requirements.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: REQ_COLORS[r.type] || "#f1f5f9", fontWeight: 600, color: "#334155", flexShrink: 0 }}>{r.type.replace("_", " ")}</span>
                <span style={{ fontSize: 13, color: "#334155", flex: 1 }}>{r.text}</span>
                <button onClick={() => removeReq(i)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontWeight: 700, fontSize: 16 }}>×</button>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr auto", gap: 8, marginTop: 8 }}>
              <select style={INPUT} value={newReq.type} onChange={e => setNewReq(r => ({ ...r, type: e.target.value }))}>
                {REQ_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
              </select>
              <input style={INPUT} value={newReq.text} onChange={e => setNewReq(r => ({ ...r, text: e.target.value }))} onKeyDown={e => e.key === "Enter" && addReq()} placeholder="e.g. MSc or PhD in Computer Science / ML" />
              <button onClick={addReq} style={BTN("#f0f4f8", "#0a1628")}>+ Add</button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={save} disabled={saving} style={BTN(saving ? "#94a3b8" : "#0a1628")}>{saving ? "Saving..." : editing ? "Update Job" : "Create Job"}</button>
            <button onClick={() => setShowForm(false)} style={BTN("#f1f5f9", "#475569")}>Cancel</button>
          </div>
        </div>
      )}

      {jobs.map(j => (
        <div key={j.id} style={{ ...CARD, opacity: j.status === "closed" ? 0.6 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#0a1628" }}>{j.title}</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f0f4f8", color: "#475569", fontWeight: 600 }}>{j.level}</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f0f4f8", color: "#475569", fontWeight: 600 }}>{j.department}</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: j.status === "open" ? "#dcfce7" : "#fee2e2", color: j.status === "open" ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{j.status}</span>
                {j.talent_preference && j.talent_preference !== "open" && (
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#fef3c7", color: "#b45309", fontWeight: 600 }}>
                    {j.talent_preference === "saudi" ? "Saudi Preferred" : "Expat"}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "#6b7a99", marginBottom: 6 }}>
                {j.minYearsExp}–{j.maxYearsExp} yrs · {j.location} · {j._count?.candidates ?? 0} candidates
              </div>
              {j.requirements?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {j.requirements.slice(0, 4).map((r, i) => (
                    <span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: REQ_COLORS[r.type] || "#f1f5f9", color: "#334155" }}>{r.text}</span>
                  ))}
                  {j.requirements.length > 4 && <span style={{ fontSize: 11, color: "#94a3b8" }}>+{j.requirements.length - 4} more</span>}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 16 }}>
              <button onClick={() => startEdit(j)} style={BTN("#f1f5f9", "#475569")}>Edit</button>
              <button onClick={() => del(j.id, j.title)} style={BTN("#fee2e2", "#dc2626")}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Candidates Tab ────────────────────────────────────────────────────────────
function CandidatesTab({ candidates, reload, showToast }: {
  candidates: Candidate[]; reload: () => void; showToast: (m: string) => void;
}) {
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [notesAiLoading, setNotesAiLoading] = useState(false);

  async function generateNotes() {
    if (!editing) return;
    setNotesAiLoading(true);
    try {
      const d = await aiGenerate("candidate_notes", {
        name: editing.name, currentRole: editing.currentRole, currentCompany: editing.currentCompany,
        specialty: editing.specialty, yearsExperience: editing.yearsExperience,
        country: editing.country, stage: editing.stage,
        skills: editing.skills,
      });
      setEditing(v => v ? { ...v, notes: d.content || v.notes || "" } : v);
      showToast("Candidate notes generated");
    } catch { alert("Notes AI failed"); }
    setNotesAiLoading(false);
  }

  const filtered = candidates.filter(c =>
    `${c.name} ${c.currentRole} ${c.specialty} ${c.country}`.toLowerCase().includes(search.toLowerCase())
  );

  async function save() {
    if (!editing) return;
    setSaving(true);
    await fetch(`/api/recruitment/candidates/${editing.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editing.name, currentRole: editing.currentRole, currentCompany: editing.currentCompany,
        country: editing.country, specialty: editing.specialty, yearsExperience: editing.yearsExperience,
        stage: editing.stage, notes: editing.notes, linkedinUrl: editing.linkedinUrl,
      }),
    });
    showToast("Candidate updated"); setEditing(null); reload(); setSaving(false);
  }

  async function del(id: string, name: string) {
    if (!confirm(`Delete candidate "${name}"?`)) return;
    await fetch(`/api/recruitment/candidates/${id}`, { method: "DELETE" });
    showToast("Candidate deleted"); reload();
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0a1628" }}>Candidates ({candidates.length})</div>
          <div style={{ fontSize: 13, color: "#6b7a99", marginTop: 2 }}>Edit or delete any candidate — fix wrong import data here</div>
        </div>
        <input style={{ ...INPUT, width: 220 }} placeholder="Search name, role, specialty..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {editing && (
        <div style={{ ...CARD, border: "2px solid #e8c97a", marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0a1628", marginBottom: 16 }}>Editing: {editing.name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div><label style={LABEL}>Full Name</label><input style={INPUT} value={editing.name} onChange={e => setEditing(v => v && ({ ...v, name: e.target.value }))} /></div>
            <div><label style={LABEL}>Current Role</label><input style={INPUT} value={editing.currentRole || ""} onChange={e => setEditing(v => v && ({ ...v, currentRole: e.target.value }))} /></div>
            <div><label style={LABEL}>Current Company</label><input style={INPUT} value={editing.currentCompany || ""} onChange={e => setEditing(v => v && ({ ...v, currentCompany: e.target.value }))} /></div>
            <div><label style={LABEL}>Country</label><input style={INPUT} value={editing.country || ""} onChange={e => setEditing(v => v && ({ ...v, country: e.target.value }))} /></div>
            <div><label style={LABEL}>Specialty</label><input style={INPUT} value={editing.specialty || ""} onChange={e => setEditing(v => v && ({ ...v, specialty: e.target.value }))} /></div>
            <div><label style={LABEL}>Years Experience</label><input type="number" style={INPUT} value={editing.yearsExperience || ""} onChange={e => setEditing(v => v && ({ ...v, yearsExperience: Number(e.target.value) }))} /></div>
            <div><label style={LABEL}>LinkedIn URL</label><input style={INPUT} value={editing.linkedinUrl || ""} onChange={e => setEditing(v => v && ({ ...v, linkedinUrl: e.target.value }))} /></div>
            <div><label style={LABEL}>Stage</label>
              <select style={INPUT} value={editing.stage} onChange={e => setEditing(v => v && ({ ...v, stage: e.target.value }))}>
                {["sourced","screening","interview","offer","hired","rejected"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ ...LABEL, marginBottom: 0 }}>Evaluator Notes</label>
              <button onClick={generateNotes} disabled={notesAiLoading} style={notesAiLoading ? AI_BTN_LOADING : AI_BTN}>
                {notesAiLoading ? "Generating…" : "✦ Generate Evaluation"}
              </button>
            </div>
            <textarea style={{ ...INPUT, height: 100, resize: "vertical" }} value={editing.notes || ""} onChange={e => setEditing(v => v && ({ ...v, notes: e.target.value }))} placeholder="Hiring notes, interview observations, culture fit assessment…" />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={save} disabled={saving} style={BTN(saving ? "#94a3b8" : "#0a1628")}>{saving ? "Saving..." : "Save Changes"}</button>
            <button onClick={() => setEditing(null)} style={BTN("#f1f5f9", "#475569")}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.map(c => (
          <div key={c.id} style={{ ...CARD, padding: 16, marginBottom: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0a1628" }}>{c.name}</span>
                  {c.linkedinImported && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: "#dbeafe", color: "#1e40af" }}>LinkedIn</span>}
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f0f4f8", color: "#475569" }}>{c.stage}</span>
                </div>
                <div style={{ fontSize: 12, color: "#6b7a99", marginTop: 2 }}>
                  {c.currentRole || "—"} · {c.specialty || "—"} · {c.country || "—"} · {c.yearsExperience ? `${c.yearsExperience} yrs` : "—"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setEditing(c)} style={BTN("#f1f5f9", "#475569")}>Edit</button>
                <button onClick={() => del(c.id, c.name)} style={BTN("#fee2e2", "#dc2626")}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Team Tab ──────────────────────────────────────────────────────────────────
const BLANK_EMP_FORM = {
  // Core
  name: "", email: "", role: "", level: "L6", department: "Engineering", status: "active", isExpat: false, nationality: "",
  // Identity
  grade: "", band: "", people_group: "", job_family: "", sub_job_family: "",
  division: "", sub_division: "", sub_department: "", squad: "", tribe: "", functional_team: "", cost_center: "",
  city_region: "", country: "", team_lead: "", line_of_business: "",
  // Compensation
  monthly_salary: "", currency: "SAR", equity_pct: "", equity_grant: "",
  // Personal
  gender: "", date_of_birth: "", mobile: "", work_phone: "", personal_email: "",
  full_name_arabic: "", religion: "", marital_status: "", home_address: "",
  // Documents
  national_id: "", iqama_number: "", passport_number: "",
  // Banking
  bank_name: "", bank_country: "Saudi Arabia", iban: "", account_holder_name: "",
  // Compliance
  gosi_number: "", gosi_registered: false, saned_registered: false, absher_linked: false, qiwa_registered: false,
  // Employment extras
  payroll_status: "", exco: "", dotted_line_manager: "", vendor_name: "", job_req_id: "",
  seniority_date: "", latest_contract_start: "", latest_contract_end: "",
};

function TeamTab({ employees, reload, saving, setSaving, showToast, depts, addDept }: {
  employees: Employee[]; reload: () => void; saving: boolean;
  setSaving: (v: boolean) => void; showToast: (m: string) => void;
  depts: string[]; addDept: (s: string) => void;
}) {
  const [form, setForm] = useState<typeof BLANK_EMP_FORM>(BLANK_EMP_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [customDept, setCustomDept] = useState("");

  const filtered = employees.filter(e =>
    `${e.name} ${e.role} ${e.department}`.toLowerCase().includes(search.toLowerCase())
  );

  function startEdit(e: Employee) {
    setEditing(e.id);
    setForm({
      name: e.name, email: e.email, role: e.role, level: e.level, department: e.department,
      status: e.status, isExpat: e.isExpat, nationality: e.nationality || "",
      grade: e.grade || "", band: e.band || "", people_group: e.people_group || "",
      job_family: e.job_family || "", sub_job_family: e.sub_job_family || "",
      division: e.division || "", sub_division: e.sub_division || "",
      sub_department: e.sub_department || "", squad: e.squad || "", tribe: e.tribe || "",
      functional_team: e.functional_team || "", cost_center: e.cost_center || "",
      city_region: e.city_region || "", country: e.country || "",
      team_lead: e.team_lead || "", line_of_business: e.line_of_business || "",
      monthly_salary: e.monthly_salary != null ? String(e.monthly_salary) : "",
      currency: e.currency || "SAR",
      equity_pct: e.equity_pct != null ? String(e.equity_pct) : "",
      equity_grant: e.equity_grant != null ? String(e.equity_grant) : "",
      gender: e.gender || "", date_of_birth: e.date_of_birth || "",
      mobile: e.mobile || "", work_phone: e.work_phone || "", personal_email: e.personal_email || "",
      full_name_arabic: e.full_name_arabic || "", religion: e.religion || "",
      marital_status: e.marital_status || "", home_address: e.home_address || "",
      national_id: e.national_id || "", iqama_number: e.iqama_number || "",
      passport_number: e.passport_number || "",
      bank_name: e.bank_name || "", bank_country: e.bank_country || "Saudi Arabia",
      iban: e.iban || "", account_holder_name: e.account_holder_name || "",
      gosi_number: e.gosi_number || "",
      gosi_registered: Boolean(e.gosi_registered),
      saned_registered: Boolean(e.saned_registered),
      absher_linked: Boolean(e.absher_linked),
      qiwa_registered: Boolean(e.qiwa_registered),
      payroll_status: e.payroll_status || "", exco: e.exco || "",
      dotted_line_manager: e.dotted_line_manager || "",
      vendor_name: e.vendor_name || "", job_req_id: e.job_req_id || "",
      seniority_date: e.seniority_date ? e.seniority_date.slice(0, 10) : "",
      latest_contract_start: e.latest_contract_start ? e.latest_contract_start.slice(0, 10) : "",
      latest_contract_end: e.latest_contract_end ? e.latest_contract_end.slice(0, 10) : "",
    });
    setShowForm(true);
  }

  // Export functions
  function handleExcelExport() {
    exportToExcel("team_employees", [{
      name: "Employees",
      data: employees.map(e => ({
        id: e.id, name: e.name, email: e.email, role: e.role, level: e.level,
        department: e.department, status: e.status,
        isExpat: e.isExpat ? "Yes" : "No",
        startDate: e.startDate || "",
        grade: e.grade || "", band: e.band || "", people_group: e.people_group || "",
        job_family: e.job_family || "", city_region: e.city_region || "",
        country: e.country || "", team_lead: e.team_lead || "",
      })),
    }]);
  }
  function handlePDFExport() {
    exportToPDF("Team Report", ["Name", "Email", "Role", "Level", "Dept", "Status", "Grade", "Band"],
      employees.map(e => [e.name, e.email, e.role, e.level, e.department, e.status, e.grade || "—", e.band || "—"]),
      `${employees.length} employees · Exported`
    );
  }
  function handleWordExport() {
    const rows = employees.map(e =>
      `<tr><td>${e.name}</td><td>${e.email}</td><td>${e.role}</td><td>${e.level}</td><td>${e.department}</td><td>${e.status}</td><td>${e.grade || "—"}</td><td>${e.band || "—"}</td></tr>`
    ).join("");
    exportToWord("team_employees", "Team Report",
      `<table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Level</th><th>Dept</th><th>Status</th><th>Grade</th><th>Band</th></tr></thead><tbody>${rows}</tbody></table>`
    );
  }

  async function save() {
    if (!form.name || !form.email) return alert("Name and email required");
    setSaving(true);
    if (editing) {
      const payload = {
        ...form,
        monthly_salary: form.monthly_salary !== "" ? Number(form.monthly_salary) : null,
        equity_pct:     form.equity_pct !== ""     ? Number(form.equity_pct)     : null,
        equity_grant:   form.equity_grant !== ""   ? Number(form.equity_grant)   : null,
      };
      const r = await fetch(`/api/employees/${editing}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) showToast("Employee updated"); else showToast("Save failed — please try again");
    } else {
      const r = await fetch("/api/employees", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, startDate: new Date().toISOString() }),
      });
      if (r.ok) showToast("Employee added"); else showToast("Failed to add employee");
    }
    setShowForm(false); setEditing(null); setForm(BLANK_EMP_FORM); reload(); setSaving(false);
  }

  async function del(id: string, name: string) {
    if (!confirm(`Delete employee "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    showToast("Employee deleted"); reload();
  }

  const saudiCount = employees.filter(e => !e.isExpat).length;
  const expatCount = employees.filter(e => e.isExpat).length;
  const saudiPct   = employees.length > 0 ? Math.round((saudiCount / employees.length) * 100) : 0;
  const nitaqat    = saudiPct >= 75 ? "Platinum" : saudiPct >= 50 ? "High Green" : saudiPct >= 35 ? "Medium Green" : saudiPct >= 25 ? "Low Green" : "Yellow";
  const nitaqatColor = saudiPct >= 75 ? "#a855f7" : saudiPct >= 50 ? "#16a34a" : saudiPct >= 35 ? "#22c55e" : saudiPct >= 25 ? "#65a30d" : "#ca8a04";

  return (
    <>
      {/* Saudization Dashboard */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Headcount", value: employees.length, sub: "employees", color: "#0a1628" },
          { label: "Saudi Nationals", value: saudiCount, sub: "local hires", color: "#16a34a" },
          { label: "Expat Hires", value: expatCount, sub: "non-Saudi", color: "#3b82f6" },
          { label: "Saudization %", value: `${saudiPct}%`, sub: `Nitaqat: ${nitaqat}`, color: nitaqatColor },
        ].map(c => (
          <div key={c.label} style={{ background: "white", borderRadius: 10, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize: 10, color: "#6b7a99", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{c.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: c.color, margin: "4px 0" }}>{c.value}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0a1628" }}>Team ({employees.length})</div>
          <div style={{ fontSize: 13, color: "#6b7a99", marginTop: 2 }}>Add, edit, or remove team members · Saudization {saudiPct}% ({nitaqat})</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleExcelExport} style={EXPORT_BTN("#16a34a")}>⬇ Excel</button>
          <button onClick={handlePDFExport}   style={EXPORT_BTN("#dc2626")}>⬇ PDF</button>
          <button onClick={handleWordExport}  style={EXPORT_BTN("#2563eb")}>⬇ Word</button>
          <input style={{ ...INPUT, width: 180 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          <button onClick={() => { setEditing(null); setForm(BLANK_EMP_FORM); setShowForm(true); }} style={BTN()}>+ Add Employee</button>
        </div>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "32px 16px" }}>
          <div style={{ background: "white", borderRadius: 16, width: "100%", maxWidth: 860, boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
            <div style={{ background: "#0a1628", borderRadius: "16px 16px 0 0", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "white" }}>{editing ? "Edit Employee Profile" : "New Employee"}</div>
              <button onClick={() => { setShowForm(false); setEditing(null); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ padding: 28, overflowY: "auto", maxHeight: "80vh" }}>

              {/* Section: Core */}
              <div style={SECTION_HEADING}>Core Information</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
                <div><label style={LABEL}>Full Name *</label><input style={INPUT} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label style={LABEL}>Work Email *</label><input style={INPUT} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><label style={LABEL}>Job Title / Role</label><input style={INPUT} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} /></div>
                <div><label style={LABEL}>Level</label>
                  <select style={INPUT} value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                    {LEVELS.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div><label style={LABEL}>Department</label>
                  <select style={INPUT} value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                    {depts.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div><label style={LABEL}>Status</label>
                  <select style={INPUT} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {EMP_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label style={LABEL}>Nationality</label><input style={INPUT} value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="e.g. Saudi, British..." /></div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 20 }}>
                  <input type="checkbox" id="expat" checked={form.isExpat} onChange={e => setForm(f => ({ ...f, isExpat: e.target.checked }))} />
                  <label htmlFor="expat" style={{ fontSize: 13, color: "#475569" }}>Expat hire (requires Iqama)</label>
                </div>
                <div>
                  <label style={LABEL}>Add New Department</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input style={{ ...INPUT, flex: 1 }} value={customDept} onChange={e => setCustomDept(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && customDept.trim()) { addDept(customDept); setForm(f => ({ ...f, department: customDept.trim() })); setCustomDept(""); } }}
                      placeholder="e.g. Government Relations" />
                    <button onClick={() => { if (customDept.trim()) { addDept(customDept.trim()); setForm(f => ({ ...f, department: customDept.trim() })); setCustomDept(""); } }}
                      style={BTN("#f0f4f8", "#0a1628")}>+</button>
                  </div>
                </div>
              </div>

              {/* Section: Org Structure */}
              <div style={SECTION_HEADING}>Organisation Structure</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 8 }}>
                <div><label style={LABEL}>Grade</label><input style={INPUT} value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} placeholder="e.g. L7" /></div>
                <div><label style={LABEL}>Band</label><input style={INPUT} value={form.band} onChange={e => setForm(f => ({ ...f, band: e.target.value }))} placeholder="e.g. Senior" /></div>
                <div><label style={LABEL}>People Group</label><input style={INPUT} value={form.people_group} onChange={e => setForm(f => ({ ...f, people_group: e.target.value }))} placeholder="e.g. FTE" /></div>
                <div><label style={LABEL}>Job Family</label><input style={INPUT} value={form.job_family} onChange={e => setForm(f => ({ ...f, job_family: e.target.value }))} /></div>
                <div><label style={LABEL}>Sub Job Family</label><input style={INPUT} value={form.sub_job_family} onChange={e => setForm(f => ({ ...f, sub_job_family: e.target.value }))} /></div>
                <div><label style={LABEL}>Division</label><input style={INPUT} value={form.division} onChange={e => setForm(f => ({ ...f, division: e.target.value }))} /></div>
                <div><label style={LABEL}>Sub Division</label><input style={INPUT} value={form.sub_division} onChange={e => setForm(f => ({ ...f, sub_division: e.target.value }))} /></div>
                <div><label style={LABEL}>Sub Department</label><input style={INPUT} value={form.sub_department} onChange={e => setForm(f => ({ ...f, sub_department: e.target.value }))} /></div>
                <div><label style={LABEL}>Squad</label><input style={INPUT} value={form.squad} onChange={e => setForm(f => ({ ...f, squad: e.target.value }))} /></div>
                <div><label style={LABEL}>Tribe</label><input style={INPUT} value={form.tribe} onChange={e => setForm(f => ({ ...f, tribe: e.target.value }))} /></div>
                <div><label style={LABEL}>Functional Team</label><input style={INPUT} value={form.functional_team} onChange={e => setForm(f => ({ ...f, functional_team: e.target.value }))} /></div>
                <div><label style={LABEL}>Cost Center</label><input style={INPUT} value={form.cost_center} onChange={e => setForm(f => ({ ...f, cost_center: e.target.value }))} /></div>
                <div><label style={LABEL}>Team Lead</label><input style={INPUT} value={form.team_lead} onChange={e => setForm(f => ({ ...f, team_lead: e.target.value }))} /></div>
                <div><label style={LABEL}>Line of Business</label><input style={INPUT} value={form.line_of_business} onChange={e => setForm(f => ({ ...f, line_of_business: e.target.value }))} /></div>
                <div><label style={LABEL}>City / Region</label><input style={INPUT} value={form.city_region} onChange={e => setForm(f => ({ ...f, city_region: e.target.value }))} placeholder="e.g. Riyadh" /></div>
                <div><label style={LABEL}>Country</label><input style={INPUT} value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="e.g. Saudi Arabia" /></div>
                <div><label style={LABEL}>Dotted Line Manager</label><input style={INPUT} value={form.dotted_line_manager} onChange={e => setForm(f => ({ ...f, dotted_line_manager: e.target.value }))} /></div>
                <div><label style={LABEL}>Payroll Status</label><input style={INPUT} value={form.payroll_status} onChange={e => setForm(f => ({ ...f, payroll_status: e.target.value }))} placeholder="e.g. Active" /></div>
                <div><label style={LABEL}>EXCO Member</label><input style={INPUT} value={form.exco} onChange={e => setForm(f => ({ ...f, exco: e.target.value }))} placeholder="Yes / No" /></div>
                <div><label style={LABEL}>Seniority Date</label><input type="date" style={INPUT} value={form.seniority_date} onChange={e => setForm(f => ({ ...f, seniority_date: e.target.value }))} /></div>
                <div><label style={LABEL}>Contract Start</label><input type="date" style={INPUT} value={form.latest_contract_start} onChange={e => setForm(f => ({ ...f, latest_contract_start: e.target.value }))} /></div>
                <div><label style={LABEL}>Contract End</label><input type="date" style={INPUT} value={form.latest_contract_end} onChange={e => setForm(f => ({ ...f, latest_contract_end: e.target.value }))} /></div>
                <div><label style={LABEL}>Vendor Name</label><input style={INPUT} value={form.vendor_name} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} /></div>
                <div><label style={LABEL}>Job Req ID</label><input style={INPUT} value={form.job_req_id} onChange={e => setForm(f => ({ ...f, job_req_id: e.target.value }))} /></div>
              </div>

              {/* Section: Compensation */}
              <div style={SECTION_HEADING}>Compensation</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 8 }}>
                <div><label style={LABEL}>Monthly Salary</label><input type="number" style={INPUT} value={form.monthly_salary} onChange={e => setForm(f => ({ ...f, monthly_salary: e.target.value }))} /></div>
                <div><label style={LABEL}>Currency</label>
                  <select style={INPUT} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                    {["SAR","USD","GBP","EUR"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={LABEL}>Equity % of Co.</label><input type="number" step="0.0001" style={INPUT} value={form.equity_pct} onChange={e => setForm(f => ({ ...f, equity_pct: e.target.value }))} /></div>
                <div><label style={LABEL}>Equity Grant (USD)</label><input type="number" style={INPUT} value={form.equity_grant} onChange={e => setForm(f => ({ ...f, equity_grant: e.target.value }))} /></div>
              </div>

              {/* Section: Personal */}
              <div style={SECTION_HEADING}>Personal Information</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 8 }}>
                <div><label style={LABEL}>Full Name (Arabic)</label><input style={INPUT} value={form.full_name_arabic} onChange={e => setForm(f => ({ ...f, full_name_arabic: e.target.value }))} /></div>
                <div><label style={LABEL}>Gender</label>
                  <select style={INPUT} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    {["", "Male", "Female"].map(g => <option key={g} value={g}>{g || "—"}</option>)}
                  </select>
                </div>
                <div><label style={LABEL}>Date of Birth</label><input type="date" style={INPUT} value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} /></div>
                <div><label style={LABEL}>Marital Status</label>
                  <select style={INPUT} value={form.marital_status} onChange={e => setForm(f => ({ ...f, marital_status: e.target.value }))}>
                    {["", "Single", "Married", "Divorced", "Widowed"].map(s => <option key={s} value={s}>{s || "—"}</option>)}
                  </select>
                </div>
                <div><label style={LABEL}>Religion</label><input style={INPUT} value={form.religion} onChange={e => setForm(f => ({ ...f, religion: e.target.value }))} /></div>
                <div><label style={LABEL}>Mobile</label><input style={INPUT} value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} /></div>
                <div><label style={LABEL}>Work Phone</label><input style={INPUT} value={form.work_phone} onChange={e => setForm(f => ({ ...f, work_phone: e.target.value }))} /></div>
                <div><label style={LABEL}>Personal Email</label><input style={INPUT} value={form.personal_email} onChange={e => setForm(f => ({ ...f, personal_email: e.target.value }))} /></div>
                <div style={{ gridColumn: "span 3" }}><label style={LABEL}>Home Address</label><input style={INPUT} value={form.home_address} onChange={e => setForm(f => ({ ...f, home_address: e.target.value }))} /></div>
              </div>

              {/* Section: Documents */}
              <div style={SECTION_HEADING}>Identity Documents</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 8 }}>
                <div><label style={LABEL}>National ID</label><input style={INPUT} value={form.national_id} onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} /></div>
                <div><label style={LABEL}>Iqama Number</label><input style={INPUT} value={form.iqama_number} onChange={e => setForm(f => ({ ...f, iqama_number: e.target.value }))} /></div>
                <div><label style={LABEL}>Passport Number</label><input style={INPUT} value={form.passport_number} onChange={e => setForm(f => ({ ...f, passport_number: e.target.value }))} /></div>
              </div>

              {/* Section: Banking */}
              <div style={SECTION_HEADING}>Banking Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
                <div><label style={LABEL}>Bank Name</label><input style={INPUT} value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} /></div>
                <div><label style={LABEL}>Bank Country</label><input style={INPUT} value={form.bank_country} onChange={e => setForm(f => ({ ...f, bank_country: e.target.value }))} /></div>
                <div><label style={LABEL}>IBAN</label><input style={INPUT} value={form.iban} onChange={e => setForm(f => ({ ...f, iban: e.target.value }))} /></div>
                <div><label style={LABEL}>Account Holder Name</label><input style={INPUT} value={form.account_holder_name} onChange={e => setForm(f => ({ ...f, account_holder_name: e.target.value }))} /></div>
              </div>

              {/* Section: Compliance */}
              <div style={SECTION_HEADING}>Government Compliance</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
                <div><label style={LABEL}>GOSI Number</label><input style={INPUT} value={form.gosi_number} onChange={e => setForm(f => ({ ...f, gosi_number: e.target.value }))} /></div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, paddingTop: 20 }}>
                  {([["gosi_registered", "GOSI"], ["saned_registered", "SANED"], ["absher_linked", "Absher"], ["qiwa_registered", "Qiwa"]] as const).map(([key, label]) => (
                    <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#374151" }}>
                      <input type="checkbox" checked={Boolean((form as Record<string, unknown>)[key])}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 20, borderTop: "1px solid #e2e8f0" }}>
                <button onClick={save} disabled={saving} style={BTN(saving ? "#94a3b8" : "#0a1628")}>{saving ? "Saving..." : editing ? "Update Employee" : "Add Employee"}</button>
                <button onClick={() => { setShowForm(false); setEditing(null); }} style={BTN("#f1f5f9", "#475569")}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.map(e => (
          <EmployeeCard key={e.id} e={e} onEdit={() => startEdit(e)} onDelete={() => del(e.id, e.name)} showToast={showToast} />
        ))}
      </div>
    </>
  );
}

function generateOfferLetter(emp: Employee) {
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offer Letter — ${emp.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Outfit:wght@400;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Outfit',sans-serif; color:#1a2540; background:#fff; padding:60px; max-width:820px; margin:0 auto; }
  @media print { body { padding:40px; } .no-print { display:none !important; } }
  .logo { display:flex; align-items:center; gap:10px; margin-bottom:40px; }
  .logo-mark { width:36px; height:36px; background:#0a1628; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#e8c97a; font-weight:800; font-size:14px; }
  .logo-text { font-family:'Cormorant Garamond',serif; font-size:22px; font-weight:600; color:#0a1628; letter-spacing:0.02em; }
  .logo-sub { font-size:9px; letter-spacing:0.18em; color:#6b7a99; text-transform:uppercase; margin-top:1px; }
  .divider { height:2px; background:linear-gradient(90deg,#0a1628,#e8c97a,transparent); margin:24px 0; }
  h1 { font-family:'Cormorant Garamond',serif; font-size:30px; font-weight:600; color:#0a1628; margin-bottom:6px; }
  .subtitle { font-size:13px; color:#6b7a99; margin-bottom:32px; }
  .date { font-size:13px; color:#475569; margin-bottom:28px; }
  p { font-size:13.5px; line-height:1.8; color:#334155; margin-bottom:16px; }
  .terms-grid { display:grid; grid-template-columns:1fr 1fr; gap:0; border:1.5px solid #e2e8f0; border-radius:10px; overflow:hidden; margin:28px 0; }
  .term { padding:14px 18px; border-bottom:1px solid #e2e8f0; }
  .term:nth-last-child(-n+2) { border-bottom:none; }
  .term:nth-child(odd) { border-right:1px solid #e2e8f0; }
  .term-label { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px; }
  .term-value { font-size:14px; font-weight:700; color:#0a1628; }
  .benefits-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:20px 22px; margin:24px 0; }
  .benefits-box h3 { font-size:12px; font-weight:700; color:#6b7a99; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:12px; }
  .benefit { font-size:13px; color:#334155; margin-bottom:6px; padding-left:16px; position:relative; }
  .benefit::before { content:"✓"; position:absolute; left:0; color:#16a34a; font-weight:700; }
  .legal-note { background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:14px 18px; font-size:12px; color:#92400e; line-height:1.6; margin:24px 0; }
  .signature-section { display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:48px; }
  .sig-block { border-top:1.5px solid #0a1628; padding-top:12px; }
  .sig-label { font-size:11px; color:#6b7a99; }
  .sig-name { font-size:13px; font-weight:700; color:#0a1628; margin-top:28px; }
  .print-btn { display:inline-flex; align-items:center; gap:8px; margin-bottom:28px; padding:10px 22px; background:#0a1628; color:white; border:none; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; font-family:'Outfit',sans-serif; }
  .footer { margin-top:48px; padding-top:20px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8; text-align:center; }
</style>
</head><body>
  <button class="no-print print-btn" onclick="window.print()">🖨 Print / Save PDF</button>

  <div class="logo">
    <div class="logo-mark">T</div>
    <div><div class="logo-text">THINK-AI</div><div class="logo-sub">People Hub</div></div>
  </div>

  <div class="divider"></div>

  <div class="date">${today}</div>

  <p>Dear <strong>${emp.name}</strong>,</p>

  <h1>Letter of Offer</h1>
  <div class="subtitle">Conditional offer of employment with THINK-AI Saudi Arabia</div>

  <p>We are delighted to extend this offer of employment to you. After a thorough evaluation process, the team at THINK-AI is excited to welcome you aboard. This letter sets out the key terms of our offer, which is subject to satisfactory completion of our standard pre-employment checks.</p>

  <div class="terms-grid">
    <div class="term"><div class="term-label">Full Name</div><div class="term-value">${emp.name}</div></div>
    <div class="term"><div class="term-label">Position Title</div><div class="term-value">${emp.role}</div></div>
    <div class="term"><div class="term-label">Department</div><div class="term-value">${emp.department}</div></div>
    <div class="term"><div class="term-label">Grade / Level</div><div class="term-value">${emp.level}</div></div>
    <div class="term"><div class="term-label">Work Location</div><div class="term-value">Riyadh, Kingdom of Saudi Arabia</div></div>
    <div class="term"><div class="term-label">Employment Type</div><div class="term-value">${emp.isExpat ? "Expat (Work Visa Sponsored)" : "Saudi National"}</div></div>
    <div class="term"><div class="term-label">Probation Period</div><div class="term-value">90 days (extendable to 180 days)</div></div>
    <div class="term"><div class="term-label">Work Email</div><div class="term-value">${emp.email}</div></div>
  </div>

  <div class="benefits-box">
    <h3>Your Total Reward Package</h3>
    <div class="benefit">Comprehensive monthly salary (all-inclusive, no separate housing or transport allowances)</div>
    <div class="benefit">Medical insurance — employee + eligible dependents (CCHI compliant)</div>
    ${emp.isExpat ? '<div class="benefit">Work visa sponsorship + residency (Iqama) processing</div>' : ""}
    <div class="benefit">Annual leave: 30 calendar days per year (as per Saudi Labour Law)</div>
    <div class="benefit">Learning & Development budget for professional growth</div>
    ${emp.level && parseInt(emp.level.replace("L","")) >= 5 ? '<div class="benefit">ESOP equity grant (details in your equity letter)</div>' : ""}
  </div>

  <div class="legal-note">
    <strong>KSA Compliance:</strong> This offer is governed by the Saudi Labour Law (Royal Decree M/51). The stated salary is all-inclusive (شامل) and satisfies all statutory requirements including housing and transportation components per Article 14. THINK-AI is an Equal Opportunity Employer committed to Saudization and Nitaqat compliance.
  </div>

  <p>This offer is contingent upon successful verification of your identity documents, educational qualifications, and any applicable background checks. By signing below, you confirm your acceptance of this offer and the terms described herein.</p>

  <p>We are genuinely excited about your joining THINK-AI and look forward to building something remarkable together. If you have any questions, please reach out to our People team at <a href="mailto:people@think-ai.com" style="color:#0a1628">people@think-ai.com</a>.</p>

  <div class="signature-section">
    <div class="sig-block">
      <div class="sig-label">For and on behalf of THINK-AI</div>
      <div class="sig-name">Ahmed Al-Helmy<br><span style="font-weight:400;font-size:12px;color:#6b7a99">Co-Founder & CEO, THINK-AI</span></div>
    </div>
    <div class="sig-block">
      <div class="sig-label">Accepted by Candidate</div>
      <div style="margin-top:28px;"></div>
      <div class="sig-label">Signature &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date</div>
    </div>
  </div>

  <div class="footer">THINK-AI · Riyadh, Kingdom of Saudi Arabia · people@think-ai.com · think-ai.com</div>
</body></html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

function EmployeeCard({ e, onEdit, onDelete, showToast }: { e: Employee; onEdit: () => void; onDelete: () => void; showToast: (m: string) => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);

  async function getOnboardingLink() {
    setLoadingToken(true);
    const r = await fetch(`/api/admin/employee-profiles/${e.id}`);
    if (r.ok) {
      const d = await r.json();
      if (d.onboarding_token) {
        const link = `${window.location.origin}/join/${d.onboarding_token}`;
        setToken(link);
      } else { showToast("No onboarding token — employee may need a profile created"); }
    }
    setLoadingToken(false);
  }

  function copyLink() {
    if (token) { navigator.clipboard.writeText(token); showToast("Onboarding link copied!"); }
  }

  return (
    <div style={{ ...CARD, padding: 16, marginBottom: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0a1628" }}>{e.name}</span>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f0f4f8", color: "#475569" }}>{e.level}</span>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: e.status === "active" ? "#dcfce7" : "#fef3c7", color: e.status === "active" ? "#16a34a" : "#92400e" }}>{e.status}</span>
            {e.isExpat && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: "#e0e7ff", color: "#3730a3" }}>Expat</span>}
          </div>
          <div style={{ fontSize: 12, color: "#6b7a99", marginTop: 2 }}>{e.role} · {e.department} · {e.email}</div>
          {/* Missing data warning */}
          {(() => {
            const missing: string[] = [];
            if (!e.grade) missing.push("grade");
            if (!e.band) missing.push("band");
            if (!e.job_family) missing.push("job_family");
            if (!e.city_region) missing.push("city_region");
            if (!e.country) missing.push("country");
            if (!e.people_group) missing.push("people_group");
            return missing.length > 0 ? (
              <div style={{ marginTop: 4, fontSize: 11, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "3px 8px", display: "inline-block" }}>
                ⚠ Missing: {missing.join(" · ")}
              </div>
            ) : null;
          })()}
          {token && (
            <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
              <input readOnly value={token} style={{ fontSize: 11, color: "#475569", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", width: 380 }} />
              <button onClick={copyLink} style={{ ...BTN("#7c3aed"), fontSize: 11, padding: "4px 10px" }}>Copy</button>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button onClick={() => generateOfferLetter(e)} style={{ ...BTN("#fef3c7", "#92400e"), fontSize: 11 }}>📄 Offer Letter</button>
          <button onClick={getOnboardingLink} disabled={loadingToken} style={{ ...BTN("#f0fdf4", "#16a34a"), fontSize: 12 }}>
            {loadingToken ? "…" : "🔗 Onboarding Link"}
          </button>
          <button onClick={onEdit} style={BTN("#f1f5f9", "#475569")}>Edit</button>
          <button onClick={onDelete} style={BTN("#fee2e2", "#dc2626")}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Compensation Tab ──────────────────────────────────────────────────────────
interface SalaryBand {
  id: string; grade: string; track: string; midpoint_sar: number;
  equity_pct: number; label: string | null; active: boolean;
}

const VALUATION_USD = 200_000_000;
const SAR_PER_USD   = 3.75;
const LAPTOP_SAR    = 3_375;

function sarFmt(n: number) { return `SAR ${Math.round(n).toLocaleString()}`; }
function usdFmt(n: number) { return `$${Math.round(n).toLocaleString()}`; }

const COMP_CARD: React.CSSProperties = {
  background: "white", borderRadius: 12, padding: 20,
  boxShadow: "0 2px 8px rgba(0,0,0,0.07)", flex: "1 1 220px",
};

function CompensationTab({ showToast }: { showToast: (m: string) => void }) {
  const [bands, setBands]           = useState<SalaryBand[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [calcTrack, setCalcTrack]   = useState<"tech" | "non_tech">("tech");
  const [calcGrade, setCalcGrade]   = useState("L9");
  const [isRelocating, setIsRelocating] = useState(false);
  const [dependents, setDependents] = useState(0);
  const [editBand, setEditBand]     = useState<SalaryBand | null>(null);
  const [editForm, setEditForm]     = useState({ grade: "", track: "tech", midpoint_sar: 0, equity_pct: 0, label: "" });
  const [showAdd, setShowAdd]       = useState(false);
  const [addForm, setAddForm]       = useState({ grade: "L9", track: "tech", midpoint_sar: 0, equity_pct: 0, label: "" });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data: SalaryBand[] = await fetch("/api/admin/salary-bands").then(r => r.json());
      setBands(data.sort((a, b) => {
        const na = parseInt(a.grade.slice(1)), nb = parseInt(b.grade.slice(1));
        if (na !== nb) return na - nb;
        return a.track === "non_tech" ? -1 : 1;
      }));
    } catch { setBands([]); }
    setLoading(false);
  }

  function startEdit(b: SalaryBand) {
    setEditBand(b);
    setEditForm({ grade: b.grade, track: b.track, midpoint_sar: b.midpoint_sar, equity_pct: b.equity_pct, label: b.label ?? "" });
  }

  async function saveEdit() {
    if (!editBand) return;
    setSaving(true);
    await fetch(`/api/admin/salary-bands/${editBand.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, active: true }),
    });
    showToast("Band updated"); setEditBand(null); await load(); setSaving(false);
  }

  async function addBand() {
    setSaving(true);
    await fetch("/api/admin/salary-bands", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    showToast("Band added"); setShowAdd(false); await load(); setSaving(false);
  }

  async function delBand(id: string, lbl: string) {
    if (!confirm(`Delete band "${lbl}"?`)) return;
    await fetch(`/api/admin/salary-bands/${id}`, { method: "DELETE" });
    showToast("Deleted"); load();
  }

  function handleExcelExport() {
    exportToExcel("salary_bands", [{
      name: "Salary Bands",
      data: bands.map(b => ({
        grade: b.grade, track: b.track, label: b.label || "",
        midpoint_sar: b.midpoint_sar, equity_pct: b.equity_pct,
        active: b.active ? "Yes" : "No",
      })),
    }]);
  }
  function handlePDFExport() {
    exportToPDF("Salary Bands", ["Grade", "Track", "Label", "Midpoint SAR", "Equity %", "Active"],
      bands.map(b => [b.grade, b.track === "tech" ? "Tech P75" : "Non-Tech P66", b.label || "—", b.midpoint_sar, `${b.equity_pct.toFixed(4)}%`, b.active ? "Yes" : "No"]),
      "THINK-AI Compensation Bands · Confidential"
    );
  }
  function handleWordExport() {
    const trs = bands.map(b =>
      `<tr><td>${b.grade}</td><td>${b.track === "tech" ? "Tech" : "Non-Tech"}</td><td>${b.label || "—"}</td><td>${b.midpoint_sar.toLocaleString()}</td><td>${b.equity_pct.toFixed(4)}%</td></tr>`
    ).join("");
    exportToWord("salary_bands", "Salary Bands",
      `<table><thead><tr><th>Grade</th><th>Track</th><th>Label</th><th>Midpoint SAR</th><th>Equity %</th></tr></thead><tbody>${trs}</tbody></table>`
    );
  }

  const trackBands = bands.filter(b => b.track === calcTrack);
  const availGrades = Array.from(new Set(trackBands.map(b => b.grade)));
  useEffect(() => {
    if (availGrades.length && !availGrades.includes(calcGrade)) setCalcGrade(availGrades[0]);
  }, [calcTrack]);

  const sel       = bands.find(b => b.grade === calcGrade && b.track === calcTrack);
  const mid       = sel?.midpoint_sar ?? 0;
  const min       = Math.round(mid * 0.80);
  const max       = Math.round(mid * 1.20);
  const annualMid = mid * 12;
  const eqPct     = sel?.equity_pct ?? 0;
  const hasEq     = eqPct > 0;
  const eqUSD     = (eqPct / 100) * VALUATION_USD;
  const eqSAR     = eqUSD * SAR_PER_USD;
  const vestSAR   = eqSAR / 4;
  const relocGrant = mid * (1 + dependents * 0.10);
  const totalAnnual = annualMid + (hasEq ? vestSAR : 0);

  return (
    <>
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#0a1628", marginBottom: 2 }}>Compensation Calculator</div>
        <div style={{ fontSize: 12, color: "#6b7a99", marginBottom: 20 }}>
          KSA · Tech P75 / Non-Tech P66 · $200M valuation · 10.5% ESOP pool · SAR/USD 3.75
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ minWidth: 180 }}>
            <label style={LABEL}>Track</label>
            <select style={INPUT} value={calcTrack} onChange={e => setCalcTrack(e.target.value as "tech" | "non_tech")}>
              <option value="tech">Tech (P75)</option>
              <option value="non_tech">Non-Tech (P66)</option>
            </select>
          </div>
          <div style={{ minWidth: 240 }}>
            <label style={LABEL}>Grade</label>
            <select style={INPUT} value={calcGrade} onChange={e => setCalcGrade(e.target.value)}>
              {availGrades.map(g => {
                const b = bands.find(x => x.grade === g && x.track === calcTrack);
                return <option key={g} value={g}>{g} — {b?.label ?? ""}</option>;
              })}
            </select>
          </div>
          {sel && (
            <div style={{
              padding: "9px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: hasEq ? "#f0fdf4" : "#f8fafc",
              border: `1px solid ${hasEq ? "#bbf7d0" : "#e2e8f0"}`,
              color: hasEq ? "#16a34a" : "#94a3b8",
            }}>
              {hasEq ? `Equity eligible · ${eqPct.toFixed(4)}% of company` : "No equity at this grade"}
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ color: "#6b7a99", padding: 16 }}>Loading…</div>
        ) : !sel ? (
          <div style={{ color: "#dc2626", padding: 16 }}>No band for {calcGrade} {calcTrack} — add it below.</div>
        ) : (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={COMP_CARD}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#6b7a99", letterSpacing: "0.12em", marginBottom: 14 }}>BASE SALARY · KSA</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                {([["Min 80%", min], ["Mid 100%", mid], ["Max 120%", max]] as [string,number][]).map(([lbl, val]) => (
                  <div key={lbl} style={{ textAlign:"center", padding:"10px 4px", borderRadius:8, background:lbl.startsWith("Mid")?"#0a1628":"#f8fafc", color:lbl.startsWith("Mid")?"white":"#1a2540" }}>
                    <div style={{ fontSize:9, marginBottom:4, opacity:0.65 }}>{lbl}</div>
                    <div style={{ fontWeight:700, fontSize:12 }}>{val.toLocaleString()}</div>
                    <div style={{ fontSize:9, opacity:0.55, marginTop:2 }}>SAR/mo</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop:"1px solid #f0f4f8", paddingTop:12 }}>
                <div style={{ fontSize:11, color:"#6b7a99", marginBottom:3 }}>Annual Basic</div>
                <div style={{ fontWeight:700, color:"#0a1628", fontSize:13 }}>
                  {(min*12).toLocaleString()} — <span style={{color:"#c8a84b"}}>{(mid*12).toLocaleString()}</span> — {(max*12).toLocaleString()} SAR
                </div>
              </div>
            </div>

            <div style={COMP_CARD}>
              <div style={{ fontSize:10, fontWeight:800, color:"#6b7a99", letterSpacing:"0.12em", marginBottom:14 }}>EQUITY (ESOP)</div>
              {hasEq ? (
                <>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                    <div style={{ padding:"10px 8px", borderRadius:8, background:"#fefce8" }}>
                      <div style={{ fontSize:9, color:"#92400e", marginBottom:3 }}>% of Company</div>
                      <div style={{ fontWeight:800, color:"#92400e", fontSize:14 }}>{eqPct.toFixed(4)}%</div>
                    </div>
                    <div style={{ padding:"10px 8px", borderRadius:8, background:"#fefce8" }}>
                      <div style={{ fontSize:9, color:"#92400e", marginBottom:3 }}>Grant Value</div>
                      <div style={{ fontWeight:700, color:"#92400e", fontSize:12 }}>{usdFmt(eqUSD)}</div>
                      <div style={{ fontSize:10, color:"#b45309" }}>{sarFmt(eqSAR)}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:13, color:"#374151", marginBottom:6 }}><b>Annual vest:</b> {sarFmt(vestSAR)}</div>
                  <div style={{ fontSize:11, color:"#6b7a99", lineHeight:1.6 }}>4-year vest · 1-year cliff<br/>25% at year 1, monthly thereafter</div>
                </>
              ) : (
                <div style={{ fontSize:13, color:"#94a3b8", paddingTop:8, lineHeight:1.6 }}>
                  Equity from L5 (non-tech) · L7 (tech).<br/>Not eligible at this grade.
                </div>
              )}
            </div>

            <div style={COMP_CARD}>
              <div style={{ fontSize:10, fontWeight:800, color:"#6b7a99", letterSpacing:"0.12em", marginBottom:14 }}>BENEFITS</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <BenRow icon="✓" label="Medical Insurance" sub="All staff" />
                <BenRow icon="✓" label={`BYOL Laptop — SAR ${LAPTOP_SAR.toLocaleString()}`} sub="~$900 one-time" />
                <div style={{ borderTop:"1px solid #f0f4f8", paddingTop:12 }}>
                  <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", marginBottom:10 }}>
                    <input type="checkbox" checked={isRelocating} onChange={e => setIsRelocating(e.target.checked)} />
                    <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Relocation Grant</span>
                    <span style={{ fontSize:11, color:"#6b7a99" }}>(relocating to KSA)</span>
                  </label>
                  {isRelocating && (
                    <div style={{ paddingLeft:4 }}>
                      <label style={LABEL}>Dependents</label>
                      <select style={{ ...INPUT, width:170, marginBottom:10 }} value={dependents} onChange={e => setDependents(Number(e.target.value))}>
                        {[0,1,2,3,4].map(n=><option key={n} value={n}>{n} dependent{n!==1?"s":""}</option>)}
                      </select>
                      <div style={{ fontWeight:700, color:"#0a1628", fontSize:14 }}>
                        {sarFmt(relocGrant)}
                        <span style={{ fontWeight:400, color:"#6b7a99", fontSize:11, marginLeft:8 }}>
                          1 mo basic{dependents>0?` +${dependents*10}%`:""}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ ...COMP_CARD, background:"#0a1628", color:"white" }}>
              <div style={{ fontSize:10, fontWeight:800, color:"#e8c97a", letterSpacing:"0.12em", marginBottom:18 }}>TOTAL ANNUAL (MID)</div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <TRow label="Annual Basic" value={`SAR ${annualMid.toLocaleString()}`} />
                {hasEq && <TRow label="Annual Equity Vest" value={sarFmt(vestSAR)} gold />}
                {isRelocating && <TRow label="Relocation (one-time)" value={sarFmt(relocGrant)} blue />}
                <div style={{ borderTop:"1px solid rgba(255,255,255,0.15)", paddingTop:14, marginTop:4 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                    <span style={{ fontWeight:700, fontSize:14 }}>Total Annual</span>
                    <span style={{ fontSize:18, fontWeight:800, color:"#e8c97a" }}>SAR {Math.round(totalAnnual).toLocaleString()}</span>
                  </div>
                  <div style={{ textAlign:"right", fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:4 }}>
                    ≈ {usdFmt(totalAnnual/SAR_PER_USD)} USD
                  </div>
                </div>
                <div style={{ borderTop:"1px solid rgba(255,255,255,0.08)", paddingTop:10, fontSize:10, color:"rgba(255,255,255,0.3)", lineHeight:1.6 }}>
                  Medical included · BYOL SAR {LAPTOP_SAR.toLocaleString()} one-time
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:"#0a1628" }}>Salary Bands</div>
            <div style={{ fontSize:12, color:"#6b7a99", marginTop:2 }}>KSA · 100 Compa midpoints · admin-editable</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={handleExcelExport} style={EXPORT_BTN("#16a34a")}>⬇ Excel</button>
            <button onClick={handlePDFExport}   style={EXPORT_BTN("#dc2626")}>⬇ PDF</button>
            <button onClick={handleWordExport}  style={EXPORT_BTN("#2563eb")}>⬇ Word</button>
            <button onClick={() => setShowAdd(true)} style={BTN()}>+ Add Band</button>
          </div>
        </div>

        {showAdd && (
          <div style={{ ...CARD, border:"2px solid #e8c97a", marginBottom:16 }}>
            <div style={{ fontWeight:700, color:"#0a1628", marginBottom:12 }}>New Salary Band</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12 }}>
              <div><label style={LABEL}>Grade</label>
                <select style={INPUT} value={addForm.grade} onChange={e => setAddForm(f=>({...f,grade:e.target.value}))}>
                  {LEVELS.map(l=><option key={l}>{l}</option>)}
                </select>
              </div>
              <div><label style={LABEL}>Track</label>
                <select style={INPUT} value={addForm.track} onChange={e => setAddForm(f=>({...f,track:e.target.value}))}>
                  <option value="tech">Tech (P75)</option>
                  <option value="non_tech">Non-Tech (P66)</option>
                </select>
              </div>
              <div><label style={LABEL}>Label</label>
                <input style={INPUT} value={addForm.label} onChange={e => setAddForm(f=>({...f,label:e.target.value}))} placeholder="e.g. Staff Engineer" />
              </div>
              <div><label style={LABEL}>Midpoint SAR/mo</label>
                <input style={INPUT} type="number" value={addForm.midpoint_sar} onChange={e => setAddForm(f=>({...f,midpoint_sar:Number(e.target.value)}))} />
              </div>
              <div><label style={LABEL}>Equity % of Company</label>
                <input style={INPUT} type="number" step="0.0001" value={addForm.equity_pct} onChange={e => setAddForm(f=>({...f,equity_pct:Number(e.target.value)}))} />
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:12 }}>
              <button onClick={addBand} disabled={saving} style={BTN()}>Save</button>
              <button onClick={()=>setShowAdd(false)} style={BTN("#f1f5f9","#475569")}>Cancel</button>
            </div>
          </div>
        )}

        {editBand && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ background:"white", borderRadius:16, padding:28, width:500, maxWidth:"92vw", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
              <div style={{ fontWeight:700, color:"#0a1628", fontSize:16, marginBottom:20 }}>Edit — {editBand.grade} {editBand.track==="tech"?"Tech":"Non-Tech"}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><label style={LABEL}>Grade</label>
                  <select style={INPUT} value={editForm.grade} onChange={e=>setEditForm(f=>({...f,grade:e.target.value}))}>
                    {LEVELS.map(l=><option key={l}>{l}</option>)}
                  </select>
                </div>
                <div><label style={LABEL}>Track</label>
                  <select style={INPUT} value={editForm.track} onChange={e=>setEditForm(f=>({...f,track:e.target.value}))}>
                    <option value="tech">Tech (P75)</option>
                    <option value="non_tech">Non-Tech (P66)</option>
                  </select>
                </div>
                <div style={{gridColumn:"span 2"}}><label style={LABEL}>Label / Title</label>
                  <input style={INPUT} value={editForm.label} onChange={e=>setEditForm(f=>({...f,label:e.target.value}))} />
                </div>
                <div><label style={LABEL}>Midpoint SAR/month</label>
                  <input style={INPUT} type="number" value={editForm.midpoint_sar} onChange={e=>setEditForm(f=>({...f,midpoint_sar:Number(e.target.value)}))} />
                </div>
                <div><label style={LABEL}>Equity % of Company</label>
                  <input style={INPUT} type="number" step="0.0001" value={editForm.equity_pct} onChange={e=>setEditForm(f=>({...f,equity_pct:Number(e.target.value)}))} />
                  <div style={{fontSize:11,color:"#6b7a99",marginTop:4}}>
                    = {usdFmt((editForm.equity_pct/100)*VALUATION_USD)} @ $200M · {sarFmt((editForm.equity_pct/100)*VALUATION_USD*SAR_PER_USD)}
                  </div>
                </div>
              </div>
              <div style={{display:"flex",gap:8,marginTop:20}}>
                <button onClick={saveEdit} disabled={saving} style={BTN()}>Save Changes</button>
                <button onClick={()=>setEditBand(null)} style={BTN("#f1f5f9","#475569")}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ background:"white", borderRadius:12, overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.07)", overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, minWidth:720 }}>
            <thead>
              <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e2e8f0" }}>
                {["Grade","Track","Label","Min","Mid","Max","Equity %","Grant Value",""].map(h=>(
                  <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:"#6b7a99",textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{padding:20,textAlign:"center",color:"#6b7a99"}}>Loading…</td></tr>
              ) : bands.length===0 ? (
                <tr><td colSpan={9} style={{padding:20,textAlign:"center",color:"#6b7a99"}}>
                  No bands yet — run <code>node --env-file=.env.local create-salary-bands-table.mjs</code>
                </td></tr>
              ) : bands.map(b=>{
                const bMin=Math.round(b.midpoint_sar*0.8), bMax=Math.round(b.midpoint_sar*1.2);
                const bEqUSD=(b.equity_pct/100)*VALUATION_USD;
                return (
                  <tr key={b.id} style={{borderBottom:"1px solid #f0f4f8"}}
                      onMouseEnter={e=>(e.currentTarget.style.background="#fafbfc")}
                      onMouseLeave={e=>(e.currentTarget.style.background="")}>
                    <td style={{padding:"10px 12px"}}>
                      <span style={{fontWeight:700,color:"#0a1628",padding:"2px 8px",background:"#f0f4f8",borderRadius:6}}>{b.grade}</span>
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,fontWeight:600,
                        background:b.track==="tech"?"#e0e7ff":"#fef3c7",
                        color:b.track==="tech"?"#3730a3":"#92400e"}}>
                        {b.track==="tech"?"Tech P75":"Non-Tech P66"}
                      </span>
                    </td>
                    <td style={{padding:"10px 12px",color:"#374151",fontSize:12}}>{b.label??""}</td>
                    <td style={{padding:"10px 12px",color:"#94a3b8",fontSize:12}}>{bMin.toLocaleString()}</td>
                    <td style={{padding:"10px 12px",fontWeight:700,color:"#0a1628"}}>{b.midpoint_sar.toLocaleString()}</td>
                    <td style={{padding:"10px 12px",color:"#94a3b8",fontSize:12}}>{bMax.toLocaleString()}</td>
                    <td style={{padding:"10px 12px",fontWeight:600,color:b.equity_pct>0?"#16a34a":"#cbd5e1"}}>
                      {b.equity_pct>0?`${b.equity_pct.toFixed(4)}%`:"—"}
                    </td>
                    <td style={{padding:"10px 12px",fontSize:12,color:b.equity_pct>0?"#374151":"#cbd5e1"}}>
                      {b.equity_pct>0?`${usdFmt(bEqUSD)} · SAR ${Math.round(bEqUSD*SAR_PER_USD).toLocaleString()}`:"—"}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>startEdit(b)} style={BTN("#f1f5f9","#475569")}>Edit</button>
                        <button onClick={()=>delBand(b.id,`${b.grade} ${b.track}`)} style={BTN("#fee2e2","#dc2626")}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function BenRow({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return (
    <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
      <span style={{color:"#16a34a",fontSize:14,lineHeight:1.4}}>{icon}</span>
      <div>
        <div style={{fontSize:13,color:"#374151"}}>{label}</div>
        <div style={{fontSize:11,color:"#6b7a99"}}>{sub}</div>
      </div>
    </div>
  );
}

function TRow({ label, value, gold, blue }: { label: string; value: string; gold?: boolean; blue?: boolean }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontSize:12,color:"rgba(255,255,255,0.55)"}}>{label}</span>
      <span style={{fontWeight:600,color:gold?"#e8c97a":blue?"#93c5fd":"white"}}>{value}</span>
    </div>
  );
}

// ── Portal Tab ────────────────────────────────────────────────────────────────
interface DirEntry {
  id: string; name: string; title: string; department: string; team: string | null;
  location: string; avatar_url: string | null; linkedin_url: string | null;
  bio: string | null; email: string | null; start_year: number | null;
  sort_order: number; is_active: boolean;
}
interface Announcement {
  id: string; title: string; body: string; category: string; pinned: boolean; author: string; createdAt: string;
}

const ANN_CATS = ["general", "policy", "culture", "milestone", "ops"];
const DIR_DEPTS = ["Engineering", "Product", "Data", "Design", "People", "Finance", "Legal", "Marketing", "Operations", "Leadership", "Sales"];

// ── Absence Tab ───────────────────────────────────────────────────────────────
interface AbsenceRow {
  id: string; employee_name: string; employee_email: string; type_name: string; category: string;
  start_date: string; end_date: string; days_requested: number; reason: string; status: string;
  is_saudi: boolean; document_submitted: boolean; manager_notes: string | null;
  approved_by: string | null; approved_at: string | null; createdAt: string;
}
interface AbsenceStat { status: string; cnt: number; days: number; }
interface AbsenceType { id: string; name: string; }

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:  { bg: "#fef3c7", color: "#b45309" },
  approved: { bg: "#f0fdf4", color: "#16a34a" },
  rejected: { bg: "#fef2f2", color: "#dc2626" },
  cancelled:{ bg: "#f1f5f9", color: "#64748b" },
};
const CAT_EMOJI: Record<string, string> = {
  annual:"🌴", sick:"🏥", hajj:"🕌", maternity:"👶", paternity:"👶",
  marriage:"💍", bereavement:"🌹", unpaid:"📋", study:"📚", emergency:"🚨",
};

function AbsenceTab({ showToast }: { showToast: (m: string) => void }) {
  const [rows, setRows]     = useState<AbsenceRow[]>([]);
  const [stats, setStats]   = useState<AbsenceStat[]>([]);
  const [types, setTypes]   = useState<AbsenceType[]>([]);
  const [year, setYear]     = useState(String(new Date().getFullYear()));
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType]     = useState("");
  const [filterEmail, setFilterEmail]   = useState("");
  const [updating, setUpdating]         = useState<string | null>(null);
  const [noteModal, setNoteModal]       = useState<{ id: string; currentStatus: string } | null>(null);
  const [noteText, setNoteText]         = useState("");
  const [pendingStatus, setPendingStatus] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams({ year });
    if (filterStatus) params.set("status", filterStatus);
    if (filterType)   params.set("type", filterType);
    if (filterEmail)  params.set("email", filterEmail);
    const d = await fetch(`/api/admin/absence?${params}`).then(r => r.json());
    setRows(d.rows || []); setStats(d.stats || []); setTypes(d.types || []);
  }, [year, filterStatus, filterType, filterEmail]);

  function handleExcelExport() {
    exportToExcel("absence_records", [{
      name: "Absence",
      data: rows.map(r => ({
        employee_name: r.employee_name, employee_email: r.employee_email,
        type_name: r.type_name, category: r.category,
        start_date: r.start_date, end_date: r.end_date,
        days_requested: r.days_requested, status: r.status,
        approved_by: r.approved_by || "", reason: r.reason,
      })),
    }]);
  }
  function handlePDFExport() {
    exportToPDF("Absence Records", ["Employee", "Type", "Start", "End", "Days", "Status"],
      rows.map(r => [r.employee_name, r.type_name, r.start_date, r.end_date, r.days_requested, r.status]),
      `${year} · ${rows.length} records`
    );
  }
  function handleWordExport() {
    const trs = rows.map(r =>
      `<tr><td>${r.employee_name}</td><td>${r.type_name}</td><td>${r.start_date}</td><td>${r.end_date}</td><td>${r.days_requested}</td><td>${r.status}</td><td>${r.approved_by || "—"}</td></tr>`
    ).join("");
    exportToWord("absence_records", "Absence Records",
      `<table><thead><tr><th>Employee</th><th>Type</th><th>Start</th><th>End</th><th>Days</th><th>Status</th><th>Approved By</th></tr></thead><tbody>${trs}</tbody></table>`
    );
  }

  useEffect(() => { load(); }, [load]);

  function openNote(id: string, newStatus: string) {
    setNoteModal({ id, currentStatus: newStatus });
    setPendingStatus(newStatus); setNoteText("");
  }

  async function applyDecision() {
    if (!noteModal) return;
    setUpdating(noteModal.id);
    await fetch(`/api/admin/absence/${noteModal.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: pendingStatus, manager_notes: noteText }),
    });
    showToast(`Request ${pendingStatus}`);
    setNoteModal(null); setUpdating(null); load();
  }

  const totalPending  = stats.find(s => s.status === "pending")?.cnt ?? 0;
  const totalApproved = stats.find(s => s.status === "approved")?.cnt ?? 0;
  const totalDays     = stats.find(s => s.status === "approved")?.days ?? 0;

  return (
    <>
      {/* Note / decision modal */}
      {noteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, width: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0a1628", marginBottom: 16 }}>
              {pendingStatus === "approved" ? "✓ Approve Request" : pendingStatus === "rejected" ? "✕ Reject Request" : "Update Request"}
            </div>
            <label style={LABEL}>HR / Manager Notes (sent to employee)</label>
            <textarea style={{ ...INPUT, height: 100, resize: "none", marginBottom: 16 }}
              placeholder="Add notes for the employee (optional for approval, recommended for rejection)…"
              value={noteText} onChange={e => setNoteText(e.target.value)} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={applyDecision} style={BTN(pendingStatus === "approved" ? "#16a34a" : "#dc2626")}>
                Confirm {pendingStatus}
              </button>
              <button onClick={() => setNoteModal(null)} style={BTN("#f1f5f9", "#475569")}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0a1628" }}>Absence Management</div>
          <div style={{ fontSize: 13, color: "#6b7a99", marginTop: 2 }}>Saudi Labor Law compliant · Review, approve, or reject employee leave requests</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={handleExcelExport} style={EXPORT_BTN("#16a34a")}>⬇ Excel</button>
          <button onClick={handlePDFExport}   style={EXPORT_BTN("#dc2626")}>⬇ PDF</button>
          <button onClick={handleWordExport}  style={EXPORT_BTN("#2563eb")}>⬇ Word</button>
          <select value={year} onChange={e => setYear(e.target.value)} style={{ ...INPUT, width: 100 }}>
            {["2024","2025","2026","2027"].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Pending Review", value: totalPending, bg: "#fef3c7", color: "#b45309" },
          { label: "Approved this year", value: totalApproved, bg: "#f0fdf4", color: "#16a34a" },
          { label: "Days approved", value: totalDays, bg: "#eff6ff", color: "#1d4ed8" },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#6b7a99", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ ...CARD, padding: "14px 20px", display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <input style={{ ...INPUT, maxWidth: 200 }} placeholder="Search by email…" value={filterEmail}
          onChange={e => setFilterEmail(e.target.value)} />
        <select style={{ ...INPUT, maxWidth: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {["pending","approved","rejected","cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={{ ...INPUT, maxWidth: 200 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All leave types</option>
          {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button onClick={load} style={BTN()}>Filter</button>
        <button onClick={() => { setFilterStatus(""); setFilterType(""); setFilterEmail(""); }} style={BTN("#f1f5f9", "#475569")}>Clear</button>
      </div>

      {/* Rows */}
      {rows.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", background: "white", borderRadius: 12, color: "#94a3b8" }}>
          No absence requests found
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map(r => {
            const st = STATUS_COLORS[r.status] ?? STATUS_COLORS.pending;
            return (
              <div key={r.id} style={{ background: "white", borderRadius: 12, padding: "16px 20px", border: "1px solid #f0f4f8", boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 16 }}>{CAT_EMOJI[r.category] ?? "📋"}</span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#0a1628" }}>{r.employee_name}</span>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>{r.employee_email}</span>
                      {r.is_saudi && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 20, background: "#fef3c7", color: "#b45309", fontWeight: 700 }}>Saudi</span>}
                      <span style={{ fontSize: 10, padding: "2px 9px", borderRadius: 20, fontWeight: 700, background: st.bg, color: st.color }}>{r.status}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#475569", marginBottom: 3 }}>
                      <strong>{r.type_name}</strong> · {r.start_date} → {r.end_date} · <strong>{r.days_requested} day{r.days_requested !== 1 ? "s" : ""}</strong>
                    </div>
                    {r.reason && <div style={{ fontSize: 12, color: "#6b7a99" }}>Reason: {r.reason}</div>}
                    {r.document_submitted && <div style={{ fontSize: 11, color: "#0891b2", marginTop: 3 }}>📎 Document submitted</div>}
                    {r.manager_notes && (
                      <div style={{ marginTop: 6, padding: "6px 10px", background: "#f8fafc", borderRadius: 6, fontSize: 12, color: "#374151" }}>
                        HR: {r.manager_notes} {r.approved_by && <span style={{ color: "#94a3b8" }}>— {r.approved_by}</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, flexDirection: "column", alignItems: "flex-end" }}>
                    {r.status === "pending" && (
                      <>
                        <button onClick={() => openNote(r.id, "approved")} disabled={!!updating}
                          style={BTN("#16a34a")}>✓ Approve</button>
                        <button onClick={() => openNote(r.id, "rejected")} disabled={!!updating}
                          style={BTN("#fee2e2", "#dc2626")}>✕ Reject</button>
                      </>
                    )}
                    {r.status === "approved" && (
                      <button onClick={() => openNote(r.id, "rejected")} disabled={!!updating}
                        style={BTN("#f1f5f9", "#475569")}>Revoke</button>
                    )}
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function PortalTab({ showToast }: { showToast: (m: string) => void }) {
  const [section, setSection]     = useState<"directory" | "announcements">("announcements");
  const [entries, setEntries]     = useState<DirEntry[]>([]);
  const [anns, setAnns]           = useState<Announcement[]>([]);
  const [saving, setSaving]       = useState(false);

  // Announcements form state
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [editAnn, setEditAnn]         = useState<Announcement | null>(null);
  const [annForm, setAnnForm]         = useState({ title: "", body: "", category: "general", pinned: false, author: "People Team" });
  const [annAiLoading, setAnnAiLoading] = useState(false);

  // Directory form state
  const [showDirForm, setShowDirForm] = useState(false);
  const [editDir, setEditDir]         = useState<DirEntry | null>(null);
  const [dirForm, setDirForm]         = useState({ name: "", title: "", department: "Engineering", team: "", location: "Riyadh, KSA", email: "", linkedin_url: "", bio: "", start_year: "", sort_order: "0", is_active: true });
  const [bioAiLoading, setBioAiLoading] = useState(false);

  async function generateAnnouncement() {
    if (!annForm.title) { alert("Enter a title first"); return; }
    setAnnAiLoading(true);
    try {
      const d = await aiGenerate("announcement", { title: annForm.title, category: annForm.category, author: annForm.author });
      setAnnForm(f => ({ ...f, body: d.content || f.body }));
      showToast("Announcement body generated");
    } catch { alert("AI generation failed"); }
    setAnnAiLoading(false);
  }

  async function generateBio() {
    if (!dirForm.name || !dirForm.title) { alert("Enter name and job title first"); return; }
    setBioAiLoading(true);
    try {
      const d = await aiGenerate("directory_bio", { name: dirForm.name, title: dirForm.title, department: dirForm.department, team: dirForm.team, location: dirForm.location, start_year: dirForm.start_year });
      setDirForm(f => ({ ...f, bio: d.content || f.bio }));
      showToast("Bio generated");
    } catch { alert("AI generation failed"); }
    setBioAiLoading(false);
  }

  useEffect(() => { loadAll(); }, []);
  function loadAll() {
    fetch("/api/admin/directory").then(r => r.json()).then(setEntries).catch(() => {});
    fetch("/api/admin/announcements").then(r => r.json()).then(setAnns).catch(() => {});
  }

  // Announcements CRUD
  function startEditAnn(a: Announcement) {
    setEditAnn(a); setShowAnnForm(true);
    setAnnForm({ title: a.title, body: a.body, category: a.category, pinned: a.pinned, author: a.author });
  }
  async function saveAnn() {
    setSaving(true);
    if (editAnn) {
      await fetch(`/api/admin/announcements/${editAnn.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(annForm) });
      showToast("Announcement updated");
    } else {
      await fetch("/api/admin/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(annForm) });
      showToast("Announcement posted");
    }
    setEditAnn(null); setShowAnnForm(false); setAnnForm({ title: "", body: "", category: "general", pinned: false, author: "People Team" });
    loadAll(); setSaving(false);
  }
  async function delAnn(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    showToast("Deleted"); loadAll();
  }

  // Directory CRUD
  function startEditDir(e: DirEntry) {
    setEditDir(e); setShowDirForm(true);
    setDirForm({ name: e.name, title: e.title, department: e.department, team: e.team ?? "", location: e.location, email: e.email ?? "", linkedin_url: e.linkedin_url ?? "", bio: e.bio ?? "", start_year: e.start_year ? String(e.start_year) : "", sort_order: String(e.sort_order), is_active: e.is_active });
  }
  async function saveDir() {
    setSaving(true);
    const payload = { ...dirForm, start_year: dirForm.start_year ? Number(dirForm.start_year) : null, sort_order: Number(dirForm.sort_order) };
    if (editDir) {
      await fetch(`/api/admin/directory/${editDir.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      showToast("Directory entry updated");
    } else {
      await fetch("/api/admin/directory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      showToast("Entry added to colleague directory");
    }
    setEditDir(null); setShowDirForm(false); setDirForm({ name: "", title: "", department: "Engineering", team: "", location: "Riyadh, KSA", email: "", linkedin_url: "", bio: "", start_year: "", sort_order: "0", is_active: true });
    loadAll(); setSaving(false);
  }
  async function delDir(id: string, name: string) {
    if (!confirm(`Remove "${name}" from the directory?`)) return;
    await fetch(`/api/admin/directory/${id}`, { method: "DELETE" });
    showToast("Removed"); loadAll();
  }

  const SECTION_BTN = (s: "directory" | "announcements"): React.CSSProperties => ({
    padding: "8px 20px", borderRadius: 7, border: "1.5px solid",
    borderColor: section === s ? "#0a1628" : "#e2e8f0",
    background: section === s ? "#0a1628" : "white",
    color: section === s ? "white" : "#6b7a99",
    fontFamily: "Outfit,sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer",
  });

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0a1628" }}>Employee Portal Management</div>
          <div style={{ fontSize: 12, color: "#6b7a99", marginTop: 2 }}>Manage what colleagues see in the portal — announcements and team directory</div>
        </div>
        <a href="/portal" target="_blank" style={{ fontSize: 12, color: "#3b82f6", textDecoration: "none", fontWeight: 600 }}>Preview Portal →</a>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button style={SECTION_BTN("announcements")} onClick={() => setSection("announcements")}>📢 Announcements</button>
        <button style={SECTION_BTN("directory")} onClick={() => setSection("directory")}>👥 Team Directory</button>
      </div>

      {/* ── Announcements section ── */}
      {section === "announcements" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0a1628" }}>Announcements ({anns.length})</div>
            <button onClick={() => { setEditAnn(null); setShowAnnForm(true); setAnnForm({ title: "", body: "", category: "general", pinned: false, author: "People Team" }); }} style={BTN()}>+ Post Announcement</button>
          </div>

          {showAnnForm && (
            <div style={{ ...CARD, border: "2px solid #e8c97a", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: "#0a1628" }}>{editAnn ? "Edit Announcement" : "New Announcement"}</div>
                <button onClick={generateAnnouncement} disabled={annAiLoading} style={annAiLoading ? AI_BTN_LOADING : AI_BTN}>
                  {annAiLoading ? "Generating…" : "✦ Generate Body"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={LABEL}>Title</label>
                  <input style={INPUT} value={annForm.title} onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Office closed on National Day" />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={LABEL}>Body</label>
                  <textarea style={{ ...INPUT, minHeight: 100, resize: "vertical" }} value={annForm.body} onChange={e => setAnnForm(f => ({ ...f, body: e.target.value }))} placeholder="Write manually or click ✦ Generate Body above…" />
                </div>
                <div>
                  <label style={LABEL}>Category</label>
                  <select style={INPUT} value={annForm.category} onChange={e => setAnnForm(f => ({ ...f, category: e.target.value }))}>
                    {ANN_CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LABEL}>Author</label>
                  <input style={INPUT} value={annForm.author} onChange={e => setAnnForm(f => ({ ...f, author: e.target.value }))} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" id="pinned" checked={annForm.pinned} onChange={e => setAnnForm(f => ({ ...f, pinned: e.target.checked }))} />
                  <label htmlFor="pinned" style={{ fontSize: 13, color: "#374151", cursor: "pointer" }}>Pin to top of portal dashboard</label>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveAnn} disabled={saving || !annForm.title || !annForm.body} style={BTN()}>
                  {saving ? "Saving…" : editAnn ? "Save Changes" : "Post"}
                </button>
                <button onClick={() => { setShowAnnForm(false); setEditAnn(null); }} style={BTN("#f1f5f9", "#475569")}>Cancel</button>
              </div>
            </div>
          )}

          {anns.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: 12 }}>No announcements yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {anns.map(a => (
                <div key={a.id} style={{ ...CARD, marginBottom: 0, border: a.pinned ? "1.5px solid #e8c97a" : "1px solid #f0f4f8" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        {a.pinned && <span style={{ fontSize: 12 }}>📌</span>}
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#0a1628" }}>{a.title}</span>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#f1f5f9", color: "#64748b", fontWeight: 600 }}>{a.category}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, marginBottom: 6 }}>{a.body}</div>
                      <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{a.author} · {new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => startEditAnn(a)} style={BTN("#f1f5f9", "#475569")}>Edit</button>
                      <button onClick={() => delAnn(a.id, a.title)} style={BTN("#fee2e2", "#dc2626")}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Directory section ── */}
      {section === "directory" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0a1628" }}>Team Directory ({entries.filter(e => e.is_active).length} active)</div>
            <button onClick={() => { setEditDir(null); setShowDirForm(true); setDirForm({ name: "", title: "", department: "Engineering", team: "", location: "Riyadh, KSA", email: "", linkedin_url: "", bio: "", start_year: "", sort_order: "0", is_active: true }); }} style={BTN()}>+ Add Person</button>
          </div>

          {showDirForm && (
            <div style={{ ...CARD, border: "2px solid #e8c97a", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: "#0a1628" }}>{editDir ? "Edit Directory Entry" : "Add to Directory"}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={LABEL}>Full Name *</label>
                  <input style={INPUT} value={dirForm.name} onChange={e => setDirForm(f => ({ ...f, name: e.target.value }))} placeholder="Ahmed Al-Hassan" />
                </div>
                <div>
                  <label style={LABEL}>Job Title *</label>
                  <input style={INPUT} value={dirForm.title} onChange={e => setDirForm(f => ({ ...f, title: e.target.value }))} placeholder="Staff Engineer" />
                </div>
                <div>
                  <label style={LABEL}>Department *</label>
                  <select style={INPUT} value={dirForm.department} onChange={e => setDirForm(f => ({ ...f, department: e.target.value }))}>
                    {DIR_DEPTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LABEL}>Team / Sub-team</label>
                  <input style={INPUT} value={dirForm.team} onChange={e => setDirForm(f => ({ ...f, team: e.target.value }))} placeholder="Platform" />
                </div>
                <div>
                  <label style={LABEL}>Location</label>
                  <input style={INPUT} value={dirForm.location} onChange={e => setDirForm(f => ({ ...f, location: e.target.value }))} />
                </div>
                <div>
                  <label style={LABEL}>Work Email</label>
                  <input style={INPUT} value={dirForm.email} onChange={e => setDirForm(f => ({ ...f, email: e.target.value }))} placeholder="name@think-ai.com" />
                </div>
                <div>
                  <label style={LABEL}>LinkedIn URL</label>
                  <input style={INPUT} value={dirForm.linkedin_url} onChange={e => setDirForm(f => ({ ...f, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/…" />
                </div>
                <div>
                  <label style={LABEL}>Year Joined</label>
                  <input style={INPUT} type="number" value={dirForm.start_year} onChange={e => setDirForm(f => ({ ...f, start_year: e.target.value }))} placeholder="2024" />
                </div>
                <div>
                  <label style={LABEL}>Sort Order</label>
                  <input style={INPUT} type="number" value={dirForm.sort_order} onChange={e => setDirForm(f => ({ ...f, sort_order: e.target.value }))} placeholder="0 = first" />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <label style={{ ...LABEL, marginBottom: 0 }}>Short Bio</label>
                    <button onClick={generateBio} disabled={bioAiLoading} style={bioAiLoading ? AI_BTN_LOADING : AI_BTN}>
                      {bioAiLoading ? "Generating…" : "✦ Generate Bio"}
                    </button>
                  </div>
                  <textarea style={{ ...INPUT, minHeight: 72, resize: "vertical" }} value={dirForm.bio} onChange={e => setDirForm(f => ({ ...f, bio: e.target.value }))} placeholder="Write manually or click ✦ Generate Bio above — 1-2 sentence professional summary" />
                </div>
                {editDir && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" id="dir-active" checked={dirForm.is_active} onChange={e => setDirForm(f => ({ ...f, is_active: e.target.checked }))} />
                    <label htmlFor="dir-active" style={{ fontSize: 13, color: "#374151", cursor: "pointer" }}>Active (visible in portal)</label>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveDir} disabled={saving || !dirForm.name || !dirForm.title} style={BTN()}>
                  {saving ? "Saving…" : editDir ? "Save Changes" : "Add to Directory"}
                </button>
                <button onClick={() => { setShowDirForm(false); setEditDir(null); }} style={BTN("#f1f5f9", "#475569")}>Cancel</button>
              </div>
            </div>
          )}

          {entries.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: 12 }}>No directory entries yet. Add your first team member.</div>
          ) : (
            <div style={{ background: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    {["Name", "Title", "Department", "Location", "Email", "Year", "Active", ""].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6b7a99", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id} style={{ borderBottom: "1px solid #f0f4f8" }}
                        onMouseEnter={ev => (ev.currentTarget.style.background = "#fafbfc")}
                        onMouseLeave={ev => (ev.currentTarget.style.background = "")}>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0a1628" }}>{e.name}</td>
                      <td style={{ padding: "10px 14px", color: "#475569" }}>{e.title}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#eff6ff", color: "#1d4ed8", fontWeight: 600 }}>{e.department}</span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#6b7a99", fontSize: 12 }}>{e.location}</td>
                      <td style={{ padding: "10px 14px", color: "#6b7a99", fontSize: 12 }}>{e.email ?? "—"}</td>
                      <td style={{ padding: "10px 14px", color: "#6b7a99", fontSize: 12 }}>{e.start_year ?? "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: e.is_active ? "#f0fdf4" : "#fef2f2", color: e.is_active ? "#16a34a" : "#dc2626" }}>
                          {e.is_active ? "Active" : "Hidden"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => startEditDir(e)} style={BTN("#f1f5f9", "#475569")}>Edit</button>
                          <button onClick={() => delDir(e.id, e.name)} style={BTN("#fee2e2", "#dc2626")}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Medical Tab ────────────────────────────────────────────────────────────────
interface MedicalMember {
  id: string; action: string; member_type: string; relationship: string;
  full_name_english: string; full_name_arabic: string | null;
  employee_staff_id: string | null; is_saudi: boolean; national_id_iqama: string | null;
  nationality: string | null; gender: string | null; date_of_birth: string | null;
  marital_status: string | null; mobile: string | null; work_email: string | null;
  city_region: string | null; effective_date: string | null; billing_frequency: string | null;
  life_insurance: boolean; pre_existing: boolean; status_remarks: string | null;
  termination_date: string | null; reason: string | null; submitted_by: string | null;
}

const DELETE_REASONS = ["Resignation","Termination","Final Exit","Dependent left KSA","Death","Transfer to other policy","Other"];

function MedicalTab({ showToast }: { showToast: (m: string) => void }) {
  const [members, setMembers] = useState<MedicalMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<"all" | "add" | "delete">("all");
  const [showForm, setShowForm] = useState(false);
  const [formAction, setFormAction] = useState<"add" | "delete">("add");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({
    member_type: "employee", relationship: "self", full_name_english: "", full_name_arabic: "",
    employee_staff_id: "", is_saudi: "true", national_id_iqama: "", border_number: "",
    nationality: "", gender: "", date_of_birth: "", marital_status: "", mobile: "",
    work_email: "", city_region: "", sponsor_unified_no: "", effective_date: "",
    billing_frequency: "Annual", life_insurance: "false", pre_existing: "false",
    original_effective_date: "", termination_date: "", reason: "Resignation",
    last_working_day: "", days_covered: "", annual_premium_sar: "", pro_rata_refund_sar: "",
    insurer_refund_approved_sar: "", status_remarks: "", submitted_by: "",
  });

  const isSaudi = form.is_saudi === "true";

  const load = useCallback(async () => {
    setLoading(true);
    const p = filterAction !== "all" ? `?action=${filterAction}` : "";
    const r = await fetch(`/api/admin/medical${p}`);
    if (r.ok) { const d = await r.json(); setMembers(d.members ?? []); }
    setLoading(false);
  }, [filterAction]);

  useEffect(() => { load(); }, [load]);

  async function submitForm() {
    setSaving(true);
    const payload: Record<string, unknown> = { ...form };
    payload.action = formAction;
    payload.is_saudi = form.is_saudi === "true";
    payload.life_insurance = form.life_insurance === "true";
    payload.pre_existing = form.pre_existing === "true";
    for (const k of ["days_covered","annual_premium_sar","pro_rata_refund_sar","insurer_refund_approved_sar"]) {
      payload[k] = form[k] ? parseFloat(form[k]) : null;
    }
    const r = await fetch("/api/admin/medical", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (r.ok) { showToast(`Member ${formAction === "add" ? "addition" : "deletion"} saved`); setShowForm(false); load(); }
    else showToast("Failed to save");
    setSaving(false);
  }

  async function del(id: string, name: string) {
    if (!confirm(`Delete record for "${name}"?`)) return;
    await fetch(`/api/admin/medical/${id}`, { method: "DELETE" });
    showToast("Record deleted"); load();
  }

  function handleExcelExport() {
    exportToExcel("medical_records", [{
      name: "Medical",
      data: members.map(m => ({
        action: m.action, full_name_english: m.full_name_english,
        member_type: m.member_type, relationship: m.relationship,
        employee_staff_id: m.employee_staff_id || "",
        national_id_iqama: m.national_id_iqama || "",
        nationality: m.nationality || "", gender: m.gender || "",
        date_of_birth: m.date_of_birth || "", mobile: m.mobile || "",
        work_email: m.work_email || "", city_region: m.city_region || "",
        effective_date: m.effective_date || "", termination_date: m.termination_date || "",
        submitted_by: m.submitted_by || "", status_remarks: m.status_remarks || "",
      })),
    }]);
  }
  function handlePDFExport() {
    exportToPDF("Medical Records", ["Action", "Name", "Type", "Relationship", "National ID", "Nationality", "DOB"],
      members.map(m => [m.action, m.full_name_english, m.member_type, m.relationship, m.national_id_iqama || "—", m.nationality || "—", m.date_of_birth || "—"]),
      "THINK-AI Medical Insurance · Confidential"
    );
  }
  function handleWordExport() {
    const trs = members.map(m =>
      `<tr><td>${m.action}</td><td>${m.full_name_english}</td><td>${m.member_type}</td><td>${m.relationship}</td><td>${m.national_id_iqama || "—"}</td><td>${m.nationality || "—"}</td></tr>`
    ).join("");
    exportToWord("medical_records", "Medical Records",
      `<table><thead><tr><th>Action</th><th>Name</th><th>Type</th><th>Relationship</th><th>National ID</th><th>Nationality</th></tr></thead><tbody>${trs}</tbody></table>`
    );
  }

  const filtered = members.filter(m => filterAction === "all" || m.action === filterAction);
  const addCount = members.filter(m => m.action === "add").length;
  const delCount = members.filter(m => m.action === "delete").length;

  const FL = (label: string, key: string, type = "text") => (
    <div key={key}>
      <label style={LABEL}>{label}</label>
      <input type={type} style={INPUT} value={form[key] ?? ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
    </div>
  );
  const FS = (label: string, key: string, opts: string[]) => (
    <div key={key}>
      <label style={LABEL}>{label}</label>
      <select style={INPUT} value={form[key] ?? ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}>
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        {[{ label: "Total Records", value: members.length, color: "#0a1628" }, { label: "Additions", value: addCount, color: "#16a34a" }, { label: "Deletions", value: delCount, color: "#dc2626" }].map(c => (
          <div key={c.label} style={{ background: "white", borderRadius: 10, padding: "14px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", minWidth: 140 }}>
            <div style={{ fontSize: 10, color: "#6b7a99", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {(["all","add","delete"] as const).map(a => (
            <button key={a} onClick={() => setFilterAction(a)} style={{ ...BTN(filterAction === a ? "#0a1628" : "#f1f5f9", filterAction === a ? "white" : "#475569"), textTransform: "capitalize" as const }}>
              {a === "all" ? "All Records" : a === "add" ? "Additions" : "Deletions"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleExcelExport} style={EXPORT_BTN("#16a34a")}>⬇ Excel</button>
          <button onClick={handlePDFExport}   style={EXPORT_BTN("#dc2626")}>⬇ PDF</button>
          <button onClick={handleWordExport}  style={EXPORT_BTN("#2563eb")}>⬇ Word</button>
          <button onClick={() => { setFormAction("add"); setShowForm(true); }} style={BTN("#16a34a")}>+ Add Member</button>
          <button onClick={() => { setFormAction("delete"); setShowForm(true); }} style={BTN("#dc2626")}>− Delete Member</button>
        </div>
      </div>

      {showForm && (
        <div style={{ ...CARD, border: `2px solid ${formAction === "add" ? "#16a34a" : "#dc2626"}`, marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0a1628", marginBottom: 16 }}>
            {formAction === "add" ? "Member Addition Form" : "Member Deletion Form"}
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7a99", textTransform: "uppercase" as const, marginBottom: 10 }}>Member Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {FS("Member Type", "member_type", ["employee","dependent"])}
            {FS("Relationship", "relationship", ["self","spouse","son","daughter","parent","other"])}
            {FL("Full Name (English) *", "full_name_english")}
            {FL("Full Name (Arabic)", "full_name_arabic")}
            {FL("Employee / Staff ID", "employee_staff_id")}
            <div>
              <label style={LABEL}>Saudi National?</label>
              <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
                <label style={{ display: "flex", gap: 6, cursor: "pointer" }}><input type="radio" checked={isSaudi} onChange={() => setForm(f => ({ ...f, is_saudi: "true" }))} /> Saudi</label>
                <label style={{ display: "flex", gap: 6, cursor: "pointer" }}><input type="radio" checked={!isSaudi} onChange={() => setForm(f => ({ ...f, is_saudi: "false" }))} /> Non-Saudi</label>
              </div>
            </div>
            {isSaudi ? FL("National ID", "national_id_iqama") : FL("Iqama Number", "national_id_iqama")}
            {!isSaudi && FL("Border Number", "border_number")}
            {FL("Nationality", "nationality")}
            {FS("Gender", "gender", ["","Male","Female"])}
            {FL("Date of Birth", "date_of_birth", "date")}
            {FS("Marital Status", "marital_status", ["","Single","Married","Divorced","Widowed"])}
            {FL("Mobile", "mobile")}
            {FL("Work Email", "work_email", "email")}
            {FS("City / Region", "city_region", ["","Riyadh","Jeddah","Dammam / Al Khobar","Mecca","Medina","NEOM","Other"])}
            {!isSaudi && FL("Sponsor / Unified No.", "sponsor_unified_no")}
          </div>

          {formAction === "add" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {FL("Effective Date", "effective_date", "date")}
              {FS("Billing Frequency", "billing_frequency", ["Annual","Quarterly","Monthly"])}
              <div>
                <label style={LABEL}>Life Insurance</label>
                <select style={INPUT} value={form.life_insurance} onChange={e => setForm(f => ({ ...f, life_insurance: e.target.value }))}><option value="false">No</option><option value="true">Yes</option></select>
              </div>
              <div>
                <label style={LABEL}>Pre-existing Conditions</label>
                <select style={INPUT} value={form.pre_existing} onChange={e => setForm(f => ({ ...f, pre_existing: e.target.value }))}><option value="false">No</option><option value="true">Yes</option></select>
              </div>
            </div>
          )}

          {formAction === "delete" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {FL("Original Effective Date", "original_effective_date", "date")}
              {FL("Termination Date", "termination_date", "date")}
              {FS("Reason for Deletion", "reason", DELETE_REASONS)}
              {FL("Last Working Day", "last_working_day", "date")}
              {FL("Days Covered", "days_covered", "number")}
              {FL("Annual Premium (SAR)", "annual_premium_sar", "number")}
              {FL("Pro-Rata Refund (SAR)", "pro_rata_refund_sar", "number")}
              {FL("Insurer Refund Approved (SAR)", "insurer_refund_approved_sar", "number")}
              <div style={{ gridColumn: "span 2" }}>
                <label style={LABEL}>Status Remarks</label>
                <textarea style={{ ...INPUT, minHeight: 56, resize: "vertical" }} value={form.status_remarks ?? ""} onChange={e => setForm(f => ({ ...f, status_remarks: e.target.value }))} />
              </div>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>{FL("Submitted By", "submitted_by")}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={submitForm} disabled={saving || !form.full_name_english} style={BTN(saving ? "#94a3b8" : formAction === "add" ? "#16a34a" : "#dc2626")}>
              {saving ? "Saving…" : `Submit ${formAction === "add" ? "Addition" : "Deletion"}`}
            </button>
            <button onClick={() => setShowForm(false)} style={BTN("#f1f5f9", "#475569")}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: "#94a3b8", padding: 20 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", background: "white", borderRadius: 12, color: "#94a3b8" }}>No medical records. Use the buttons above to add or delete members.</div>
      ) : (
        <div style={{ background: "white", borderRadius: 12, overflow: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                {["Action","Name","Relationship","National ID","Nationality","DOB","Mobile","Effective/Term Date","Submitted By",""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6b7a99", textTransform: "uppercase" as const, letterSpacing: "0.06em", whiteSpace: "nowrap" as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} style={{ borderBottom: "1px solid #f0f4f8" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 700, background: m.action === "add" ? "#f0fdf4" : "#fef2f2", color: m.action === "add" ? "#16a34a" : "#dc2626" }}>
                      {m.action === "add" ? "+ Add" : "− Del"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "#0a1628" }}>{m.full_name_english}</td>
                  <td style={{ padding: "10px 14px", color: "#475569", textTransform: "capitalize" as const }}>{m.relationship}</td>
                  <td style={{ padding: "10px 14px", color: "#6b7a99", fontSize: 12 }}>{m.national_id_iqama ?? "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#6b7a99", fontSize: 12 }}>{m.nationality ?? "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#6b7a99", fontSize: 12 }}>{m.date_of_birth ?? "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#6b7a99", fontSize: 12 }}>{m.mobile ?? "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#6b7a99", fontSize: 12 }}>{m.effective_date ?? m.termination_date ?? "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#6b7a99", fontSize: 12 }}>{m.submitted_by ?? "—"}</td>
                  <td style={{ padding: "10px 14px" }}><button onClick={() => del(m.id, m.full_name_english)} style={BTN("#fee2e2", "#dc2626")}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─── Onboarding Tab ──────────────────────────────────────────────────────────
interface OEmployee {
  id: string; name: string; role: string; department: string; level: string;
  isExpat: boolean; status: string; startDate: string | null;
  onboarding_token: string | null; onboarding_completed: boolean;
  checklists: Array<{ id: string; phase: string; items: Array<{ id: string; label: string; done: boolean }> }>;
}

function OnboardingTab({ showToast }: { showToast: (m: string) => void }) {
  const [employees, setEmployees] = useState<OEmployee[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<"all" | "active" | "probation">("all");

  useEffect(() => {
    fetch("/api/admin/onboarding")
      .then(r => r.json())
      .then(data => { setEmployees(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function getProgress(checklists: OEmployee["checklists"]) {
    const all = checklists.flatMap(c => c.items);
    const done = all.filter(i => i.done).length;
    return { done, total: all.length, pct: all.length ? Math.round((done / all.length) * 100) : 0 };
  }

  function daysSince(startDate: string | null) {
    if (!startDate) return 0;
    return Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000);
  }

  function phaseInfo(days: number) {
    if (days <= 30)  return { label: "Pre-boarding / Week 1", color: "#6366f1", bg: "#eef2ff" };
    if (days <= 60)  return { label: "Day 30 — Learn",        color: "#0ea5e9", bg: "#e0f2fe" };
    if (days <= 90)  return { label: "Day 60 — Contribute",   color: "#f59e0b", bg: "#fffbeb" };
    if (days <= 180) return { label: "Day 90 — Own",          color: "#8b5cf6", bg: "#f5f3ff" };
    return { label: "Probation window closing", color: "#94a3b8", bg: "#f1f5f9" };
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(window.location.origin + "/join/" + token);
    showToast("Onboarding link copied!");
  }

  const filtered      = employees.filter(e => filter === "all" || e.status === filter);
  const totalItems    = employees.flatMap(e => e.checklists.flatMap(c => c.items));
  const doneItems     = totalItems.filter(i => i.done);
  const pctDone       = totalItems.length ? Math.round((doneItems.length / totalItems.length) * 100) : 0;
  const completedCount = employees.filter(e => e.onboarding_completed).length;

  if (loading) return <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>Loading onboarding data&hellip;</div>;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Active Onboardees",  value: employees.length,                   color: "#0a1628" },
          { label: "Self-Onboarded",     value: completedCount,                     color: "#16a34a" },
          { label: "In Progress",        value: employees.length - completedCount,  color: "#f59e0b" },
          { label: "Overall Completion", value: pctDone + "%",                      color: "#7c3aed" },
        ].map(s => (
          <div key={s.label} style={{ ...CARD, padding: "18px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#6b7a99", fontWeight: 700, marginTop: 4, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["all", "probation", "active"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 16px", borderRadius: 20, border: "1.5px solid", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif", background: filter === f ? "#0a1628" : "white", color: filter === f ? "white" : "#475569", borderColor: filter === f ? "#0a1628" : "#e2e8f0" }}>
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <a href="/onboarding" style={{ padding: "6px 16px", borderRadius: 20, border: "1.5px solid #e2e8f0", fontSize: 12, fontWeight: 700, color: "#475569", textDecoration: "none", background: "white" }}>Full Onboarding View &rarr;</a>
      </div>

      {filtered.length === 0 && (
        <div style={{ ...CARD, padding: 48, textAlign: "center", color: "#94a3b8" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>&#128640;</div>
          <p>No active onboardees. <a href="/employees" style={{ color: "#1d4ed8" }}>Add a team member</a> to auto-generate their checklist.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(330px,1fr))", gap: 16 }}>
        {filtered.map(e => {
          const days  = daysSince(e.startDate);
          const prog  = getProgress(e.checklists);
          const phase = phaseInfo(days);
          return (
            <div key={e.id} style={{ ...CARD, padding: 0, overflow: "hidden" }}>
              <div style={{ background: phase.bg, padding: "14px 18px", borderBottom: "2px solid " + phase.color + "33" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0a1628" }}>{e.name}</div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{e.role} &middot; {e.department} &middot; {e.level}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: "#0a1628", color: "white", padding: "2px 8px", borderRadius: 10 }}>Day {days}</span>
                    {e.onboarding_completed && <span style={{ fontSize: 10, fontWeight: 700, background: "#dcfce7", color: "#16a34a", padding: "1px 7px", borderRadius: 10 }}>Self-onboarded &#10003;</span>}
                    {e.isExpat && <span style={{ fontSize: 10, fontWeight: 700, background: "#e0f2fe", color: "#0369a1", padding: "1px 7px", borderRadius: 10 }}>Expat</span>}
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: phase.color, marginTop: 8 }}>{phase.label}</div>
              </div>

              <div style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7a99", marginBottom: 6 }}>
                  <span>{prog.done} / {prog.total} tasks</span>
                  <span style={{ fontWeight: 700, color: prog.pct === 100 ? "#16a34a" : "#0a1628" }}>{prog.pct}%</span>
                </div>
                <div style={{ height: 7, background: "#e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: prog.pct + "%", background: prog.pct === 100 ? "#16a34a" : phase.color, borderRadius: 10, transition: "width 0.4s" }} />
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10 }}>
                  {e.checklists.map(cl => {
                    const allDone = cl.items.every(i => i.done);
                    const anyDone = cl.items.some(i => i.done);
                    return (
                      <span key={cl.phase} style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: allDone ? "#dcfce7" : anyDone ? "#fef9c3" : "#f1f5f9", color: allDone ? "#16a34a" : anyDone ? "#92400e" : "#64748b" }}>
                        {cl.phase.replace(/_/g, " ")}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div style={{ padding: "10px 18px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 8, background: "#fafbff" }}>
                <a href={"/onboarding/" + e.id} style={{ ...BTN("#0a1628"), fontSize: 11, textDecoration: "none", display: "inline-block" }}>View Checklist</a>
                {e.onboarding_token && (
                  <button onClick={() => copyLink(e.onboarding_token!)} style={{ ...BTN("#f0fdf4", "#16a34a"), fontSize: 11 }}>Copy Join Link</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}


// ── Contracts Tab ─────────────────────────────────────────────────────────────
interface Contract {
  id: string; employee_id: string; employee_name: string; employee_email: string;
  employee_role: string; employee_level: string; employee_department: string;
  is_expat: boolean; status: string; contract_type: string;
  start_date: string|null; end_date: string|null; joining_date: string|null;
  basic_salary_sar: number|null; housing_allowance_sar: number|null;
  transport_allowance_sar: number|null; total_monthly_sar: number|null;
  probation_days: number; non_compete_scope: string|null;
  termination_compensation_sar: number|null; ssco_code: string|null;
  ssco_title_en: string|null; ssco_title_ar: string|null;
  functional_title_en: string|null; functional_title_ar: string|null;
  qiwa_reference: string|null; notes: string|null; createdAt: string;
}
interface VerifyCheck { category: string; item: string; status: "pass"|"fail"|"warning"|"info"; detail: string }
interface VerifyResult {
  analysis: {
    extracted?: Record<string,unknown>;
    checks?: VerifyCheck[];
    saudization?: { ssco_code:string; ssco_title:string; is_reserved_saudi_only:boolean; recommendation:string; next_review_date:string };
    overall?: string;
    summary?: string;
    error?: string;
    error_type?: string;
    raw?: unknown;
  };
  employee?: { name:string; role:string; level:string } | null;
  filename?: string;
  analyzed_at?: string;
}
const CONTRACT_COLORS: Record<string,{bg:string;color:string}> = {
  draft:{bg:"#f1f5f9",color:"#475569"},sent:{bg:"#eff6ff",color:"#2563eb"},
  signed:{bg:"#dcfce7",color:"#16a34a"},expired:{bg:"#fee2e2",color:"#dc2626"},
};
const STATUS_ICON: Record<string,string> = { pass:"✅", fail:"❌", warning:"⚠️", info:"ℹ️" };
const STATUS_COLOR: Record<string,string> = { pass:"#16a34a", fail:"#dc2626", warning:"#d97706", info:"#2563eb" };
const BLANK_CF = {
  employee_id:"",contract_type:"fixed_term",status:"draft",
  start_date:"",end_date:"",joining_date:"",
  basic_salary_sar:"",housing_allowance_sar:"0",transport_allowance_sar:"0",total_monthly_sar:"",
  probation_days:"90",non_compete_scope:"Kingdom of Saudi Arabia, 1 year",
  termination_compensation_sar:"",ssco_code:"",ssco_title_en:"",ssco_title_ar:"",
  functional_title_en:"",functional_title_ar:"",qiwa_reference:"",notes:"",
};

function ContractsTab({employees,showToast}:{employees:Employee[];showToast:(m:string)=>void}){
  const [contracts,setContracts]=useState<Contract[]>([]);
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [editing,setEditing]=useState<Contract|null>(null);
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState("");
  const [sf,setSf]=useState("all");
  const [form,setForm]=useState(BLANK_CF);
  // Upload / Verify state
  const [showVerify,setShowVerify]=useState(false);
  const [verifyEmpId,setVerifyEmpId]=useState("");
  const [verifyFile,setVerifyFile]=useState<File|null>(null);
  const [verifying,setVerifying]=useState(false);
  const [verifyResult,setVerifyResult]=useState<VerifyResult|null>(null);
  const fileInputRef=useRef<HTMLInputElement>(null);

  const load=useCallback(async()=>{
    setLoading(true);
    const r=await fetch("/api/admin/contracts");
    if(r.ok)setContracts(await r.json());
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  function openNew(){setEditing(null);setForm(BLANK_CF);setSaveError("");setShowForm(true);}
  function openEdit(c:Contract){
    setEditing(c);
    setSaveError("");
    setForm({
      employee_id:c.employee_id,contract_type:c.contract_type,status:c.status,
      start_date:c.start_date?.slice(0,10)||"",end_date:c.end_date?.slice(0,10)||"",
      joining_date:c.joining_date?.slice(0,10)||"",
      basic_salary_sar:c.basic_salary_sar?.toString()||"",
      housing_allowance_sar:c.housing_allowance_sar?.toString()||"0",
      transport_allowance_sar:c.transport_allowance_sar?.toString()||"0",
      total_monthly_sar:c.total_monthly_sar?.toString()||"",
      probation_days:c.probation_days?.toString()||"90",
      non_compete_scope:c.non_compete_scope||"Kingdom of Saudi Arabia, 1 year",
      termination_compensation_sar:c.termination_compensation_sar?.toString()||"",
      ssco_code:c.ssco_code||"",ssco_title_en:c.ssco_title_en||"",ssco_title_ar:c.ssco_title_ar||"",
      functional_title_en:c.functional_title_en||"",functional_title_ar:c.functional_title_ar||"",
      qiwa_reference:c.qiwa_reference||"",notes:c.notes||"",
    });
    setShowForm(true);
  }

  function onEmpChg(id:string){
    const e=employees.find(x=>x.id===id);
    if(!e){setForm(f=>({...f,employee_id:id}));return;}
    const ssco=suggestSSCO(e.role,e.level);
    const sd=form.start_date||new Date().toISOString().slice(0,10);
    const ed=new Date(sd);ed.setFullYear(ed.getFullYear()+1);
    setForm(f=>({
      ...f,employee_id:id,
      functional_title_en:f.functional_title_en||e.role,
      ssco_code:ssco.code,ssco_title_en:ssco.en,ssco_title_ar:ssco.ar,
      end_date:f.end_date||ed.toISOString().slice(0,10),
    }));
  }

  function onTitleChange(title:string){
    setForm(f=>{
      if(!title.trim())return{...f,functional_title_en:title};
      const ssco=suggestSSCOFromTitle(title);
      return{...f,functional_title_en:title,ssco_code:ssco.code,ssco_title_en:ssco.en,ssco_title_ar:ssco.ar};
    });
  }

  function onStart(s:string){
    if(!s)return;
    const d=new Date(s);d.setFullYear(d.getFullYear()+1);
    setForm(f=>({...f,start_date:s,end_date:d.toISOString().slice(0,10),joining_date:f.joining_date||s}));
  }

  function recalc(f:typeof BLANK_CF){
    return((parseFloat(f.basic_salary_sar)||0)+(parseFloat(f.housing_allowance_sar)||0)+(parseFloat(f.transport_allowance_sar)||0)).toString();
  }

  async function save(){
    setSaveError("");
    if(!form.employee_id){setSaveError("Please select an employee before saving.");return;}
    if(!form.start_date){setSaveError("Please enter a start date.");return;}
    setSaving(true);
    try{
      const payload={
        ...form,
        basic_salary_sar:form.basic_salary_sar?parseFloat(form.basic_salary_sar):null,
        housing_allowance_sar:parseFloat(form.housing_allowance_sar)||0,
        transport_allowance_sar:parseFloat(form.transport_allowance_sar)||0,
        total_monthly_sar:parseFloat(form.total_monthly_sar)||null,
        probation_days:Math.min(180,parseInt(form.probation_days)||90),
        termination_compensation_sar:form.termination_compensation_sar?parseFloat(form.termination_compensation_sar):null,
      };
      const url=editing?`/api/admin/contracts/${editing.id}`:"/api/admin/contracts";
      const r=await fetch(url,{method:editing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const data=await r.json();
      if(r.ok){
        showToast(editing?"Contract updated successfully":"Contract draft saved");
        setShowForm(false);
        load();
      }else{
        setSaveError(data.error||"Save failed — please check all fields and try again.");
      }
    }catch(e:unknown){
      setSaveError("Network error: "+(e instanceof Error?e.message:"Unknown error"));
    }finally{
      setSaving(false);
    }
  }

  async function del(id:string,n:string){
    if(!confirm("Delete contract for "+n+"?"))return;
    await fetch("/api/admin/contracts/"+id,{method:"DELETE"});
    showToast("Contract deleted");load();
  }

  function printC(c:Contract){
    const html=generateContractHTML({
      name_en:c.employee_name,email:c.employee_email,
      position_title_en:c.functional_title_en||c.employee_role,
      position_title_ar:c.functional_title_ar||undefined,
      ssco_code:c.ssco_code||undefined,ssco_title_en:c.ssco_title_en||undefined,ssco_title_ar:c.ssco_title_ar||undefined,
      start_date:c.start_date||new Date().toISOString().slice(0,10),
      end_date:c.end_date||"",joining_date:c.joining_date||c.start_date||undefined,
      basic_salary_sar:c.basic_salary_sar||0,
      housing_allowance_sar:c.housing_allowance_sar||0,
      transport_allowance_sar:c.transport_allowance_sar||0,
      total_monthly_sar:c.total_monthly_sar||c.basic_salary_sar||0,
      probation_days:c.probation_days||90,
      non_compete_scope:c.non_compete_scope||undefined,
      termination_compensation_sar:c.termination_compensation_sar||undefined,
    });
    const w=window.open("","_blank");if(w){w.document.write(html);w.document.close();}
  }

  async function runVerify(){
    if(!verifyFile){showToast("Please select a file to upload");return;}
    setVerifying(true);setVerifyResult(null);
    try{
      const fd=new FormData();
      fd.append("file",verifyFile);
      if(verifyEmpId)fd.append("employee_id",verifyEmpId);
      const r=await fetch("/api/admin/contracts/verify",{method:"POST",body:fd});
      const data=await r.json();
      if(r.ok){
        setVerifyResult(data);
      } else {
        // Show error inside the modal (not just as a toast)
        setVerifyResult({ analysis: { error: data.error||"Verification failed", error_type: data.error_type||"unknown" }, employee: null, filename: verifyFile.name, analyzed_at: new Date().toISOString() });
      }
    }catch(e:unknown){
      const msg="Network error: "+(e instanceof Error?e.message:"Unknown");
      setVerifyResult({ analysis: { error: msg, error_type: "network" }, employee: null, filename: verifyFile?.name||"", analyzed_at: new Date().toISOString() });
    }finally{setVerifying(false);}
  }

  const filtered=sf==="all"?contracts:contracts.filter(c=>c.status===sf);
  const RESERVED=["1212","2423","3333"];
  const selectedSsco=suggestSSCO(form.functional_title_en||"",form.employee_id?employees.find(e=>e.id===form.employee_id)?.level||"L6":"L6");
  const isReservedSsco=RESERVED.includes(form.ssco_code);
  const selectedEmpIsExpat=form.employee_id?(employees.find(e=>e.id===form.employee_id) as any)?.isExpat||false:false;

  return(<>
    {/* Header */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div>
        <div style={{fontSize:18,fontWeight:700,color:"#0a1628"}}>Employment Contracts</div>
        <div style={{fontSize:12,color:"#6b7a99"}}>Qiwa-aligned bilingual · KSA Labour Law (2025) · Nitaqat Saudization reviewed every 6 months</div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>exportToExcel("contracts",[{name:"Contracts",data:filtered.map(c=>({Employee:c.employee_name,Role:c.employee_role,SSCO:c.ssco_code||"",Status:c.status,Start:c.start_date||"",End:c.end_date||"","Salary SAR":c.total_monthly_sar||"","Qiwa Ref":c.qiwa_reference||""}))}])} style={EXPORT_BTN("#16a34a")}>&#x2B07; Excel</button>
        <button onClick={()=>exportToPDF("Employment Contracts",["Employee","Role","SSCO","Status","Period","Salary SAR"],filtered.map(c=>[c.employee_name,c.employee_role,c.ssco_code||"",c.status,(c.start_date||"")+" to "+(c.end_date||""),c.total_monthly_sar?.toString()||""]),"THINK-AI · Riyadh KSA")} style={EXPORT_BTN("#dc2626")}>&#x2B07; PDF</button>
        <button onClick={()=>{setShowVerify(true);setVerifyResult(null);setVerifyFile(null);}} style={EXPORT_BTN("#7c3aed")}>&#x2B06; Verify Qiwa Contract</button>
        <button onClick={openNew} style={BTN("#0a1628")}>+ New Contract</button>
      </div>
    </div>

    {/* Status filter */}
    <div style={{display:"flex",gap:8,marginBottom:16}}>
      {["all","draft","sent","signed","expired"].map(s=><button key={s} onClick={()=>setSf(s)} style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid",borderColor:sf===s?"#0a1628":"#e2e8f0",background:sf===s?"#0a1628":"white",color:sf===s?"white":"#6b7a99",fontSize:12,fontWeight:600,cursor:"pointer"}}>{s}</button>)}
      <span style={{marginLeft:"auto",fontSize:12,color:"#94a3b8",alignSelf:"center"}}>{filtered.length} contracts</span>
    </div>

    {/* Saudization info banner */}
    <div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:10,padding:"10px 16px",marginBottom:16,fontSize:12,color:"#92400e"}}>
      <strong>Saudization / Nitaqat Update — Jul 2026:</strong> SSCO 1212 (HR Manager) and 2423 (HR Specialist) are <strong>RESERVED for Saudi nationals NOW</strong> in tech sector. SSCO 3333 (HR Clerk) reserved from Oct 2026. All other THINK-AI roles (engineers, product, design, marketing) remain open. Next Nitaqat review: <strong>Jan 2027</strong>.
    </div>

    {/* Contract list */}
    {loading?<div style={{padding:40,textAlign:"center",color:"#94a3b8"}}>Loading contracts...</div>
    :filtered.length===0?<div style={{padding:48,textAlign:"center",background:"#f8fafc",borderRadius:14,color:"#94a3b8"}}>
      No contracts yet. Click <strong>+ New Contract</strong> to generate a Qiwa-aligned bilingual employment contract.
    </div>
    :<div style={{display:"flex",flexDirection:"column" as const,gap:10}}>
      {filtered.map(c=>{
        const sc=CONTRACT_COLORS[c.status]??CONTRACT_COLORS.draft;
        const reserved=RESERVED.includes(c.ssco_code||"")&&c.is_expat;
        return(<div key={c.id} style={{...CARD,padding:"14px 18px"}}>
          {reserved&&<div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:6,padding:"6px 12px",marginBottom:10,fontSize:11,color:"#dc2626",fontWeight:700}}>
            SSCO {c.ssco_code} is RESERVED for Saudi nationals — this expat employee needs reclassification before Qiwa authentication
          </div>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" as const}}>
                <span style={{fontWeight:700,fontSize:14,color:"#0a1628"}}>{c.employee_name}</span>
                <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,...sc,fontWeight:600}}>{c.status}</span>
                {c.ssco_code&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:"#eff6ff",color:"#2563eb",fontWeight:700}}>SSCO {c.ssco_code}</span>}
                {c.qiwa_reference&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:"#f0fdf4",color:"#16a34a"}}>Qiwa: {c.qiwa_reference}</span>}
                {c.is_expat&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:"#fef9c3",color:"#92400e"}}>Expat</span>}
              </div>
              <div style={{fontSize:12,color:"#6b7a99",marginTop:4}}>
                {c.functional_title_en||c.employee_role}
                {c.ssco_title_en?" · "+c.ssco_title_en:""}
                {c.start_date?" · "+c.start_date.slice(0,10)+" → "+(c.end_date?.slice(0,10)||"?"):""}
                {c.total_monthly_sar?" · SAR "+Number(c.total_monthly_sar).toLocaleString()+"/mo":""}
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button onClick={()=>printC(c)} style={{...BTN("#fffbeb","#92400e"),fontSize:11}}>Generate & Print</button>
              <button onClick={()=>openEdit(c)} style={BTN("#f1f5f9","#475569")}>Edit</button>
              <button onClick={()=>del(c.id,c.employee_name)} style={BTN("#fee2e2","#dc2626")}>Delete</button>
            </div>
          </div>
        </div>);
      })}
    </div>}

    {/* ── NEW / EDIT CONTRACT MODAL ── */}
    {showForm&&(
      <div style={{position:"fixed" as const,inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",overflowY:"auto",padding:"24px 16px"}}>
        <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:800,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
          <div style={{background:"#0a1628",borderRadius:"16px 16px 0 0",padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{color:"white",fontWeight:700,fontSize:16}}>{editing?"Edit Employment Contract":"New Employment Contract"}</div>
              <div style={{color:"rgba(255,255,255,0.5)",fontSize:12}}>Qiwa-aligned · KSA Labour Law (Royal Decree M/51 — 2025 amendments)</div>
            </div>
            <button onClick={()=>setShowForm(false)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.6)",fontSize:22,cursor:"pointer",lineHeight:1}}>&#x2715;</button>
          </div>

          <div style={{padding:"20px 24px",maxHeight:"68vh",overflowY:"auto"}}>
            {/* Error message */}
            {saveError&&<div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:13,color:"#dc2626",fontWeight:600}}>
              {saveError}
            </div>}

            {/* Section 1: Employee */}
            <div style={SECTION_HEADING}>1. Employee</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{gridColumn:"1/-1"}}>
                <label style={LABEL}>Employee * <span style={{color:"#dc2626"}}>(required)</span></label>
                <select value={form.employee_id} onChange={e=>onEmpChg(e.target.value)} style={{...INPUT,borderColor:!form.employee_id&&saveError?"#dc2626":""}}>
                  <option value="">— Select employee —</option>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.name} · {e.role} · {e.level}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL}>Functional Title (EN) — auto-suggests SSCO</label>
                <input value={form.functional_title_en} onChange={e=>onTitleChange(e.target.value)} style={INPUT} placeholder="e.g. Software Engineer"/>
              </div>
              <div>
                <label style={LABEL}>Functional Title (AR) المسمى الوظيفي</label>
                <input value={form.functional_title_ar} onChange={e=>setForm(f=>({...f,functional_title_ar:e.target.value}))} style={{...INPUT,direction:"rtl" as const,textAlign:"right" as const}} placeholder="مثال: مهندس برمجيات"/>
              </div>
            </div>

            {/* Section 2: SSCO */}
            <div style={SECTION_HEADING}>2. SSCO / Qiwa Classification</div>
            <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"9px 13px",marginBottom:10,fontSize:11,color:"#1e40af"}}>
              Auto-suggested when you type a job title above. For expat employees use <strong>1120 (Executive)</strong>. Codes 1212 and 2423 are reserved for Saudi nationals. Review cycle: every 6 months (next: Jan 2027).
            </div>
            <div style={{display:"grid",gridTemplateColumns:"110px 1fr 1fr",gap:12}}>
              <div>
                <label style={LABEL}>SSCO Code</label>
                <input value={form.ssco_code} onChange={e=>setForm(f=>({...f,ssco_code:e.target.value}))} style={INPUT} placeholder="e.g. 1120"/>
              </div>
              <div>
                <label style={LABEL}>Qiwa Profession (EN)</label>
                <input value={form.ssco_title_en} onChange={e=>setForm(f=>({...f,ssco_title_en:e.target.value}))} style={INPUT}/>
              </div>
              <div>
                <label style={LABEL}>Qiwa Profession (AR) المهنة</label>
                <input value={form.ssco_title_ar} onChange={e=>setForm(f=>({...f,ssco_title_ar:e.target.value}))} style={{...INPUT,direction:"rtl" as const,textAlign:"right" as const}}/>
              </div>
            </div>
            {isReservedSsco&&selectedEmpIsExpat&&(
              <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:6,padding:"8px 12px",marginTop:8,fontSize:12,color:"#dc2626",fontWeight:700}}>
                SSCO {form.ssco_code} is RESERVED for Saudi nationals. This employee is marked as Expat — change SSCO to 1120 before uploading to Qiwa.
              </div>
            )}
            {isReservedSsco&&!selectedEmpIsExpat&&(
              <div style={{background:"#fefce8",border:"1px solid #fde047",borderRadius:6,padding:"8px 12px",marginTop:8,fontSize:12,color:"#92400e"}}>
                SSCO {form.ssco_code} is reserved for Saudi nationals. Employee is marked as local — confirm Saudi nationality in employee profile.
              </div>
            )}

            {/* Section 3: Period */}
            <div style={SECTION_HEADING}>3. Contract Period</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              <div>
                <label style={LABEL}>Start Date * <span style={{color:"#dc2626"}}>(required)</span></label>
                <input type="date" value={form.start_date} onChange={e=>onStart(e.target.value)} style={{...INPUT,borderColor:!form.start_date&&saveError?"#dc2626":""}}/>
              </div>
              <div>
                <label style={LABEL}>End Date (auto: start + 1 yr)</label>
                <input type="date" value={form.end_date} onChange={e=>setForm(f=>({...f,end_date:e.target.value}))} style={INPUT}/>
              </div>
              <div>
                <label style={LABEL}>Joining / Commencement Date</label>
                <input type="date" value={form.joining_date} onChange={e=>setForm(f=>({...f,joining_date:e.target.value}))} style={INPUT}/>
              </div>
              <div>
                <label style={LABEL}>Probation Days (max 180 · Article 53)</label>
                <input type="number" value={form.probation_days} min={1} max={180} onChange={e=>setForm(f=>({...f,probation_days:Math.min(180,parseInt(e.target.value)||90).toString()}))} style={INPUT}/>
                <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>Standard: 90 days · Extendable to 180 by written mutual consent</div>
              </div>
              <div>
                <label style={LABEL}>Contract Type</label>
                <select value={form.contract_type} onChange={e=>setForm(f=>({...f,contract_type:e.target.value}))} style={INPUT}>
                  <option value="fixed_term">Fixed Term (1 year)</option>
                  <option value="unlimited">Unlimited Duration</option>
                  <option value="part_time">Part Time</option>
                </select>
              </div>
              <div>
                <label style={LABEL}>Status</label>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={INPUT}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent to Employee</option>
                  <option value="signed">Signed</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            {/* Section 4: Compensation */}
            <div style={SECTION_HEADING}>4. Compensation (SAR)</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12}}>
              <div>
                <label style={LABEL}>Basic Salary</label>
                <input type="number" value={form.basic_salary_sar} onChange={e=>{const v=e.target.value;setForm(f=>{const n={...f,basic_salary_sar:v};return{...n,total_monthly_sar:recalc(n)};})}} style={INPUT} placeholder="0"/>
              </div>
              <div>
                <label style={LABEL}>Housing Allowance</label>
                <input type="number" value={form.housing_allowance_sar} onChange={e=>{const v=e.target.value;setForm(f=>{const n={...f,housing_allowance_sar:v};return{...n,total_monthly_sar:recalc(n)};})}} style={INPUT} placeholder="0"/>
              </div>
              <div>
                <label style={LABEL}>Transport Allowance</label>
                <input type="number" value={form.transport_allowance_sar} onChange={e=>{const v=e.target.value;setForm(f=>{const n={...f,transport_allowance_sar:v};return{...n,total_monthly_sar:recalc(n)};})}} style={INPUT} placeholder="0"/>
              </div>
              <div>
                <label style={LABEL}>Total Monthly (auto)</label>
                <input value={form.total_monthly_sar||recalc(form)} readOnly style={{...INPUT,background:"#f8fafc",fontWeight:700,color:"#0a1628"}}/>
              </div>
              <div style={{gridColumn:"1/-1"}}>
                <label style={LABEL}>Termination Compensation SAR (Article 77/78 — typically 2-3 months salary)</label>
                <input type="number" value={form.termination_compensation_sar} onChange={e=>setForm(f=>({...f,termination_compensation_sar:e.target.value}))} style={INPUT} placeholder="Leave blank to omit from contract"/>
              </div>
            </div>

            {/* Section 5: Additional Terms */}
            <div style={SECTION_HEADING}>5. Additional Terms & Qiwa</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <label style={LABEL}>Non-Compete Scope (Article 83)</label>
                <input value={form.non_compete_scope} onChange={e=>setForm(f=>({...f,non_compete_scope:e.target.value}))} style={INPUT} placeholder="Kingdom of Saudi Arabia, 1 year"/>
              </div>
              <div>
                <label style={LABEL}>Qiwa Reference Number</label>
                <input value={form.qiwa_reference} onChange={e=>setForm(f=>({...f,qiwa_reference:e.target.value}))} style={INPUT} placeholder="Fill after authentication on Qiwa"/>
              </div>
              <div style={{gridColumn:"1/-1"}}>
                <label style={LABEL}>Internal Notes (not printed on contract)</label>
                <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{...INPUT,height:56,resize:"vertical" as const}} placeholder="Internal notes for HR team"/>
              </div>
            </div>
          </div>

          <div style={{padding:"16px 24px",borderTop:"1px solid #e2e8f0",display:"flex",gap:10,justifyContent:"flex-end",alignItems:"center"}}>
            {saveError&&<span style={{fontSize:12,color:"#dc2626",flex:1}}>{saveError}</span>}
            <button onClick={()=>setShowForm(false)} style={BTN("#f1f5f9","#475569")}>Cancel</button>
            <button onClick={save} disabled={saving} style={BTN("#0a1628")}>
              {saving?"Saving...":editing?"Update Contract":"Save Draft"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── VERIFY / UPLOAD QIWA CONTRACT MODAL ── */}
    {showVerify&&(
      <div style={{position:"fixed" as const,inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",overflowY:"auto",padding:"24px 16px"}}>
        <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:800,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
          <div style={{background:"#4c1d95",borderRadius:"16px 16px 0 0",padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{color:"white",fontWeight:700,fontSize:16}}>Verify Qiwa Contract — AI Compliance Check</div>
              <div style={{color:"rgba(255,255,255,0.6)",fontSize:12}}>Upload PDF or image of contract printed from Qiwa · AI validates against Saudi Labour Law + employee data</div>
            </div>
            <button onClick={()=>setShowVerify(false)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.6)",fontSize:22,cursor:"pointer",lineHeight:1}}>&#x2715;</button>
          </div>

          <div style={{padding:"24px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
              <div>
                <label style={LABEL}>Compare against employee (optional)</label>
                <select value={verifyEmpId} onChange={e=>setVerifyEmpId(e.target.value)} style={INPUT}>
                  <option value="">— No employee comparison —</option>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.name} · {e.role}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL}>Upload Contract Document</label>
                <div
                  onClick={()=>fileInputRef.current?.click()}
                  style={{...INPUT,cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:"#f8fafc",border:"2px dashed #cbd5e1",minHeight:44,justifyContent:"center"}}
                >
                  {verifyFile?<><span style={{fontSize:16}}>📄</span><span style={{fontSize:13,fontWeight:600,color:"#0a1628"}}>{verifyFile.name}</span></>
                  :<><span style={{fontSize:16}}>&#x2B06;</span><span style={{fontSize:13,color:"#94a3b8"}}>Click to upload PDF or image</span></>}
                </div>
                <input
                  ref={fileInputRef} type="file" accept=".pdf,image/*"
                  style={{display:"none"}}
                  onChange={e=>setVerifyFile(e.target.files?.[0]||null)}
                />
              </div>
            </div>

            <div style={{display:"flex",gap:10,marginBottom:20}}>
              <button onClick={runVerify} disabled={verifying||!verifyFile} style={{...BTN("#4c1d95"),opacity:verifying||!verifyFile?0.5:1}}>
                {verifying?"Analyzing with AI...":"Run AI Compliance Check"}
              </button>
              {verifyFile&&<button onClick={()=>{setVerifyFile(null);setVerifyResult(null);}} style={BTN("#f1f5f9","#475569")}>Clear</button>}
            </div>

            {verifying&&<div style={{padding:32,textAlign:"center",color:"#6b7a99"}}>
              <div style={{fontSize:32,marginBottom:8}}>&#x1F4CA;</div>
              <div style={{fontWeight:600,color:"#0a1628",marginBottom:4}}>Analyzing contract with AI...</div>
              <div style={{fontSize:12}}>Extracting fields · Checking KSA Labour Law compliance · Validating Saudization codes</div>
            </div>}

            {verifyResult&&verifyResult.analysis&&!verifyResult.analysis.error&&(<>
              {/* Overall badge */}
              {verifyResult.analysis.overall&&(
                <div style={{background:verifyResult.analysis.overall==="compliant"?"#f0fdf4":verifyResult.analysis.overall==="critical_issues"?"#fef2f2":"#fffbeb",border:"1px solid",borderColor:verifyResult.analysis.overall==="compliant"?"#86efac":verifyResult.analysis.overall==="critical_issues"?"#fca5a5":"#fcd34d",borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:verifyResult.analysis.overall==="compliant"?"#15803d":verifyResult.analysis.overall==="critical_issues"?"#dc2626":"#92400e"}}>
                      {verifyResult.analysis.overall==="compliant"?"Contract COMPLIANT":"Contract has "+(verifyResult.analysis.overall==="critical_issues"?"CRITICAL ISSUES":"Issues Found")}
                    </div>
                    <div style={{fontSize:12,color:"#6b7a99",marginTop:2}}>{verifyResult.analysis.summary}</div>
                  </div>
                  <div style={{fontSize:28}}>{verifyResult.analysis.overall==="compliant"?"✅":verifyResult.analysis.overall==="critical_issues"?"❌":"⚠️"}</div>
                </div>
              )}

              {/* Checks list */}
              {verifyResult.analysis.checks&&verifyResult.analysis.checks.length>0&&(
                <div style={{marginBottom:16}}>
                  <div style={SECTION_HEADING}>Compliance Checks</div>
                  <div style={{display:"flex",flexDirection:"column" as const,gap:6}}>
                    {verifyResult.analysis.checks.map((chk,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 12px",background:"#f8fafc",borderRadius:8,borderLeft:"3px solid",borderLeftColor:STATUS_COLOR[chk.status]||"#e2e8f0"}}>
                        <span style={{fontSize:14,flexShrink:0}}>{STATUS_ICON[chk.status]||"•"}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:600,color:"#0a1628"}}>{chk.category}: {chk.item}</div>
                          {chk.detail&&<div style={{fontSize:11,color:"#6b7a99",marginTop:2}}>{chk.detail}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Saudization */}
              {verifyResult.analysis.saudization&&(
                <div style={{background:"#f5f3ff",border:"1px solid #ddd6fe",borderRadius:10,padding:"12px 16px",marginBottom:16}}>
                  <div style={SECTION_HEADING}>Saudization / Nitaqat</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}>
                    <div><span style={{color:"#6b7a99"}}>SSCO Code:</span> <strong>{verifyResult.analysis.saudization.ssco_code}</strong> — {verifyResult.analysis.saudization.ssco_title}</div>
                    <div><span style={{color:"#6b7a99"}}>Next Review:</span> <strong>{verifyResult.analysis.saudization.next_review_date}</strong></div>
                    <div style={{gridColumn:"1/-1"}}><span style={{color:verifyResult.analysis.saudization.is_reserved_saudi_only?"#dc2626":"#16a34a",fontWeight:700}}>{verifyResult.analysis.saudization.is_reserved_saudi_only?"RESERVED for Saudi nationals":"Open to all nationalities"}</span></div>
                    <div style={{gridColumn:"1/-1",color:"#475569"}}>{verifyResult.analysis.saudization.recommendation}</div>
                  </div>
                </div>
              )}

              {/* Extracted data */}
              {verifyResult.analysis.extracted&&(
                <details style={{marginTop:8}}>
                  <summary style={{cursor:"pointer",fontSize:12,fontWeight:600,color:"#6b7a99",marginBottom:6}}>Raw extracted contract data</summary>
                  <div style={{background:"#f8fafc",borderRadius:8,padding:12,fontSize:11,color:"#475569",fontFamily:"monospace",whiteSpace:"pre-wrap" as const}}>
                    {JSON.stringify(verifyResult.analysis.extracted,null,2)}
                  </div>
                </details>
              )}
            </>)}

            {verifyResult?.analysis?.error&&(
              <div style={{background: verifyResult.analysis.error_type==="credit_balance"?"#fffbeb":"#fef2f2", border:"1px solid", borderColor: verifyResult.analysis.error_type==="credit_balance"?"#fcd34d":"#fca5a5", borderRadius:10, padding:"16px 20px"}}>
                <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                  <span style={{fontSize:22}}>{verifyResult.analysis.error_type==="credit_balance"?"⚠️":"❌"}</span>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color: verifyResult.analysis.error_type==="credit_balance"?"#92400e":"#dc2626",marginBottom:4}}>
                      {verifyResult.analysis.error_type==="credit_balance"?"AI Analysis Unavailable — Low Credit Balance":"Analysis Failed"}
                    </div>
                    <div style={{fontSize:12.5,color:"#374151",lineHeight:1.6}}>
                      {verifyResult.analysis.error}
                    </div>
                    {verifyResult.analysis.error_type==="credit_balance"&&(
                      <div style={{marginTop:8,fontSize:12,color:"#6b7a99"}}>
                        Top up credits at <strong>console.anthropic.com</strong> → Billing to restore contract AI checks.
                      </div>
                    )}
                    {verifyResult.analysis.raw!=null&&<div style={{marginTop:8,fontSize:11,opacity:0.8,color:"#dc2626"}}>{String(verifyResult.analysis.raw).slice(0,500)}</div>}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{padding:"16px 24px",borderTop:"1px solid #e2e8f0",display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button onClick={()=>setShowVerify(false)} style={BTN("#f1f5f9","#475569")}>Close</button>
          </div>
        </div>
      </div>
    )}
  </>);
}

// ── Payroll & Payslips ────────────────────────────────────────────────────────
// Data source is the uploaded Excel file only — no lookup/validation against
// the Team (hr_employees) records, since payroll rows may not exist there yet.
interface ParsedPayslipRow {
  employeeIdCode: string; name: string; workEmail: string; subtitle: string;
  location: string; joiningDate: string; employmentType: string; qiwaRegistered: boolean;
  idType: string; idTypeLabel: string; idNumber: string;
  iban: string; bank: string; contact: string; currency: string; isForeign: boolean;
  earnings: PayslipLine[]; deductions: PayslipLine[]; gross: number;
  totalDeductions: number; netSalarySar: number; transferAmount: number; gosiEmployer: number;
  note?: string; reconciliationNote?: string; flagged: boolean; payPeriod: string;
}

function fmt2(n: number) { return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function PayrollTab({ showToast }: { showToast: (m: string) => void }) {
  const [period, setPeriod] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [rows, setRows] = useState<ParsedPayslipRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function upload() {
    if (!file) { showToast("Please select the payroll Excel file"); return; }
    if (!period.trim()) { showToast("Please enter the pay period (e.g. June 2026)"); return; }
    setParsing(true);
    setParseError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("period", period.trim());
      const r = await fetch("/api/admin/payroll/parse", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) { setParseError(data.error || "Failed to parse file"); return; }
      setRows(data.rows as ParsedPayslipRow[]);
      showToast(`Parsed ${data.rows.length} payslip${data.rows.length === 1 ? "" : "s"}`);
    } catch (e: unknown) {
      setParseError("Network error: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setParsing(false);
    }
  }

  function updateRow(i: number, patch: Partial<ParsedPayslipRow>) {
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  function updateLine(i: number, section: "earnings" | "deductions", li: number, amount: number) {
    setRows(rs => rs.map((r, idx) => {
      if (idx !== i) return r;
      const earnings = section === "earnings" ? r.earnings.map((l, x) => x === li ? { ...l, amount } : l) : r.earnings;
      const deductions = section === "deductions" ? r.deductions.map((l, x) => x === li ? { ...l, amount } : l) : r.deductions;
      const gross = earnings.reduce((s, l) => s + l.amount, 0);
      const totalDeductions = deductions.reduce((s, l) => s + l.amount, 0);
      const netSalarySar = gross - totalDeductions;
      const transferAmount = r.isForeign ? Math.round((netSalarySar / 3.75) * 100) / 100 : netSalarySar;
      return { ...r, earnings, deductions, gross, totalDeductions, netSalarySar, transferAmount };
    }));
  }

  function preview(row: ParsedPayslipRow) {
    const html = generatePayslipHTML({
      employeeIdCode: row.employeeIdCode, name: row.name, subtitle: row.subtitle, idTypeLabel: row.idTypeLabel,
      idNumber: row.idNumber, employmentType: row.employmentType, location: row.location,
      joiningDate: row.joiningDate, payPeriod: row.payPeriod, qiwaRegistered: row.qiwaRegistered,
      bank: row.bank, iban: row.iban, contact: row.contact,
      earnings: row.earnings, deductions: row.deductions, gross: row.gross,
      totalDeductions: row.totalDeductions, netSalarySar: row.netSalarySar, transferAmount: row.transferAmount,
      currency: row.currency, isForeign: row.isForeign, gosiEmployer: row.gosiEmployer,
      note: row.note, reconciliationNote: row.reconciliationNote,
    });
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  }

  function emailDraft(row: ParsedPayslipRow) {
    if (!row.workEmail) { showToast("Add a work email for this employee before emailing"); return; }
    const subject = `THINK-AI Payslip — ${row.payPeriod}`;
    const body = `Hi ${row.name.split(" ")[0]},\n\nPlease find attached your payslip for ${row.payPeriod}.\n\nNet pay: ${fmt2(row.transferAmount)} ${row.currency}\n\n(Remember to attach the downloaded/printed PDF — this draft does not attach it automatically.)\n\nBest,\nTHINK-AI People Team`;
    window.location.href = `mailto:${row.workEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div>
      <div style={SECTION_HEADING}>Upload Monthly Payroll</div>
      <div style={CARD}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={LABEL}>Pay period</label>
            <input style={INPUT} placeholder="e.g. June 2026" value={period} onChange={e => setPeriod(e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>Payroll file (.xlsx)</label>
            <div onClick={() => fileInputRef.current?.click()} style={{ ...INPUT, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: "#f8fafc", border: "2px dashed #cbd5e1", minHeight: 40 }}>
              {file ? <span style={{ fontSize: 13, fontWeight: 600 }}>📄 {file.name}</span> : <span style={{ fontSize: 13, color: "#94a3b8" }}>Click to upload</span>}
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
        </div>
        <button onClick={upload} disabled={parsing} style={{ ...BTN("#4c1d95"), opacity: parsing ? 0.5 : 1 }}>{parsing ? "Parsing..." : "Parse Payroll File"}</button>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 10 }}>
          Reads only the uploaded file — nothing is checked against Team records. Sending is manual: preview/print each payslip as a PDF, then use the email draft button — it opens your mail client pre-filled, but you attach the PDF yourself.
        </div>
        {parseError && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, fontSize: 12, color: "#dc2626" }}>
            {parseError}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <div style={SECTION_HEADING}>Generated Payslips ({rows.length}) — review before sending</div>
          {rows.map((row, i) => {
            return (
              <div key={i} style={CARD}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0a1628" }}>Payslip #{i + 1}</div>
                  {row.flagged && <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>⚠ Review needed</span>}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div><label style={LABEL}>Employee ID</label><input value={row.employeeIdCode} onChange={e => updateRow(i, { employeeIdCode: e.target.value })} style={INPUT} /></div>
                  <div style={{ gridColumn: "span 2" }}><label style={LABEL}>Name</label><input value={row.name} onChange={e => updateRow(i, { name: e.target.value })} style={INPUT} /></div>
                  <div><label style={LABEL}>Location</label><input value={row.location} onChange={e => updateRow(i, { location: e.target.value })} style={INPUT} /></div>
                  <div>
                    <label style={LABEL}>Employment type</label>
                    <select value={row.employmentType} onChange={e => updateRow(i, { employmentType: e.target.value })} style={INPUT}>
                      <option value="Full time">Full time</option>
                      <option value="Part time">Part time</option>
                    </select>
                  </div>
                  <div>
                    <label style={LABEL}>Qiwa registered</label>
                    <select value={row.qiwaRegistered ? "yes" : "no"} onChange={e => updateRow(i, { qiwaRegistered: e.target.value === "yes" })} style={INPUT}>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                  <div><label style={LABEL}>Joining date</label><input value={row.joiningDate} onChange={e => updateRow(i, { joiningDate: e.target.value })} style={INPUT} /></div>
                  <div><label style={LABEL}>Pay period</label><input value={row.payPeriod} onChange={e => updateRow(i, { payPeriod: e.target.value })} style={INPUT} /></div>
                  <div><label style={LABEL}>ID type label</label><input value={row.idTypeLabel} onChange={e => updateRow(i, { idTypeLabel: e.target.value })} style={INPUT} /></div>
                  <div><label style={LABEL}>ID number</label><input value={row.idNumber} onChange={e => updateRow(i, { idNumber: e.target.value })} style={INPUT} /></div>
                  <div><label style={LABEL}>Bank</label><input value={row.bank} onChange={e => updateRow(i, { bank: e.target.value })} style={INPUT} /></div>
                  <div style={{ gridColumn: "span 2" }}><label style={LABEL}>IBAN / Account</label><input value={row.iban} onChange={e => updateRow(i, { iban: e.target.value })} style={INPUT} /></div>
                  <div><label style={LABEL}>Contact</label><input value={row.contact} onChange={e => updateRow(i, { contact: e.target.value })} style={INPUT} /></div>
                  <div>
                    <label style={LABEL}>Currency</label>
                    <input value={row.currency} onChange={e => { const currency = e.target.value.toUpperCase(); const isForeign = currency !== "SAR" && currency !== ""; updateRow(i, { currency, isForeign, transferAmount: isForeign ? Math.round((row.netSalarySar / 3.75) * 100) / 100 : row.netSalarySar }); }} style={INPUT} />
                  </div>
                  <div><label style={LABEL}>GOSI employer contribution (SAR, info only)</label><input type="number" step="0.01" value={row.gosiEmployer} onChange={e => updateRow(i, { gosiEmployer: parseFloat(e.target.value) || 0 })} style={INPUT} /></div>
                  <div><label style={LABEL}>Work email (for the email draft only — not printed)</label><input value={row.workEmail} onChange={e => updateRow(i, { workEmail: e.target.value })} style={INPUT} placeholder="name@think-ai.com" /></div>
                  <div style={{ gridColumn: "span 3" }}><label style={LABEL}>Remark (shown on payslip if present)</label><input value={row.note || ""} onChange={e => updateRow(i, { note: e.target.value || undefined })} style={INPUT} /></div>
                </div>

                {row.reconciliationNote && (
                  <div style={{ fontSize: 12, color: "#7f1d1d", background: "#fef2f2", borderLeft: "3px solid #dc2626", borderRadius: 6, padding: "8px 12px", marginBottom: 12 }}>
                    <strong>Check before issuing:</strong> {row.reconciliationNote}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7a99", marginBottom: 6 }}>EARNINGS</div>
                    {row.earnings.map((l, li) => (
                      <div key={li} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 }}>
                        <span style={{ fontSize: 13 }}>{l.label}</span>
                        <input type="number" step="0.01" value={l.amount} onChange={e => updateLine(i, "earnings", li, parseFloat(e.target.value) || 0)} style={{ ...INPUT, width: 110, textAlign: "right", padding: "6px 8px" }} />
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: "1px solid #e2e8f0", paddingTop: 6, fontSize: 13 }}>
                      <span>Gross</span><span>{fmt2(row.gross)}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7a99", marginBottom: 6 }}>DEDUCTIONS</div>
                    {row.deductions.length === 0 && <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>None</div>}
                    {row.deductions.map((l, li) => (
                      <div key={li} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 }}>
                        <span style={{ fontSize: 13 }}>{l.label}</span>
                        <input type="number" step="0.01" value={l.amount} onChange={e => updateLine(i, "deductions", li, parseFloat(e.target.value) || 0)} style={{ ...INPUT, width: 110, textAlign: "right", padding: "6px 8px" }} />
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: "1px solid #e2e8f0", paddingTop: 6, fontSize: 13 }}>
                      <span>Total deductions</span><span>{fmt2(row.totalDeductions)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#6b7a99", textTransform: "uppercase", letterSpacing: "0.06em" }}>{row.isForeign ? "Amount Transferred" : "Net Pay Transferred"}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <input type="number" step="0.01" value={row.transferAmount} onChange={e => updateRow(i, { transferAmount: parseFloat(e.target.value) || 0 })} style={{ ...INPUT, width: 140, fontSize: 20, fontWeight: 800, color: "#2563eb", border: "none", padding: "2px 0" }} />
                      <span style={{ fontSize: 13, color: "#6b7a99" }}>{row.currency}</span>
                    </div>
                    {row.isForeign && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Net salary {fmt2(row.netSalarySar)} SAR · transferred at SAR 3.75 = 1 {row.currency}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => preview(row)} style={BTN("#0a1628")}>🖨 Preview / Print</button>
                    <button onClick={() => emailDraft(row)} disabled={!row.workEmail} style={{ ...BTN("#e8c97a", "#0a1628"), opacity: row.workEmail ? 1 : 0.5 }}>✉ Email Draft</button>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
