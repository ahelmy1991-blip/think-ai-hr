"use client";
import { useEffect, useState } from "react";

interface Job {
  id: string;
  title: string;
  department: string;
  level: string;
  location: string;
  status: string;
  minYearsExp: number;
  maxYearsExp: number;
  specialty: string;
  preferAIExp: boolean;
  headcount: number;
  targetCountries: string[];
  description: string;
  _count?: { candidates: number };
}

const DEPARTMENTS = ["Engineering","Product","Design","Data Science","Operations","Finance","People","Sales","Marketing"];
const LEVELS = ["L5","L6","L7","L8","L9","L10","L11","L12","L13","L14","L15"];
const COUNTRIES = ["Saudi Arabia","UAE","Egypt","Jordan","Pakistan","India","Tunisia","Morocco","Lebanon","UK","Germany","USA","Canada"];

function linkedinSearchUrl(job: Job): string {
  const base = "https://www.linkedin.com/search/results/people/";
  const params = new URLSearchParams();
  const keywords = [job.specialty, job.preferAIExp ? "AI machine learning" : "", job.title].filter(Boolean).join(" ");
  params.set("keywords", keywords);
  if (job.targetCountries?.length > 0) params.set("geoUrn", "");
  return `${base}?${params.toString()}`;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: "", department: "Engineering", level: "L3", location: "Riyadh, KSA",
    description: "", specialty: "", minYearsExp: "3", maxYearsExp: "8",
    preferAIExp: true, headcount: "1", targetCountries: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadJobs(); }, []);

  async function loadJobs() {
    const r = await fetch("/api/recruitment/jobs");
    setJobs(await r.json());
  }

  async function saveJob() {
    setSaving(true);
    const r = await fetch("/api/recruitment/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, minYearsExp: Number(form.minYearsExp), maxYearsExp: Number(form.maxYearsExp), headcount: Number(form.headcount) }),
    });
    if (r.ok) { setShowAdd(false); loadJobs(); }
    else { const d = await r.json(); alert(d.error); }
    setSaving(false);
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/recruitment/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadJobs();
  }

  function toggleCountry(c: string) {
    setForm((f) => ({
      ...f,
      targetCountries: f.targetCountries.includes(c) ? f.targetCountries.filter((x) => x !== c) : [...f.targetCountries, c],
    }));
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="display-font">Open Roles</h1>
          <p>{jobs.filter((j) => j.status === "open").length} active · {jobs.length} total</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Create Role</button>
      </div>

      <div className="page-body">
        {jobs.length === 0 && (
          <div className="card" style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💼</div>
            <p>No roles yet. Create your first position to start building your ATS pipeline.</p>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {jobs.map((job) => (
            <div key={job.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 18, fontWeight: 600, color: "#0f2140" }}>{job.title}</span>
                    <span className={`badge ${job.status === "open" ? "badge-green" : job.status === "closed" ? "badge-gray" : "badge-amber"}`}>{job.status}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7a99", marginBottom: 8 }}>
                    {job.department} · {job.level} · {job.location} · {job.minYearsExp}–{job.maxYearsExp}y exp · {job.headcount} headcount
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {job.specialty && <span className="badge badge-blue">{job.specialty}</span>}
                    {job.preferAIExp && <span className="badge badge-navy">AI exp preferred</span>}
                    {job.targetCountries?.map((c) => <span key={c} className="badge badge-gray">{c}</span>)}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1d4ed8" }}>
                    {job._count?.candidates ?? 0} candidates
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <a href={linkedinSearchUrl(job)} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                      LinkedIn Search
                    </a>
                    {job.status === "open"
                      ? <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(job.id, "closed")}>Close</button>
                      : <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(job.id, "open")}>Reopen</button>
                    }
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal-box" style={{ width: 640 }}>
            <div className="modal-header">
              <h3>Create Open Role</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label className="form-label">Job Title *</label>
                <input className="form-input" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Senior ML Engineer" />
              </div>
              <div>
                <label className="form-label">Department</label>
                <select className="form-input form-select" value={form.department} onChange={(e) => setForm({...form, department: e.target.value})}>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Level</label>
                <select className="form-input form-select" value={form.level} onChange={(e) => setForm({...form, level: e.target.value})}>
                  {LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Location</label>
                <input className="form-input" value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} />
              </div>
              <div>
                <label className="form-label">Specialty / Focus Area</label>
                <input className="form-input" value={form.specialty} onChange={(e) => setForm({...form, specialty: e.target.value})} placeholder="Computer Vision, NLP, MLOps..." />
              </div>
              <div>
                <label className="form-label">Min Years Exp</label>
                <input className="form-input" type="number" min="0" value={form.minYearsExp} onChange={(e) => setForm({...form, minYearsExp: e.target.value})} />
              </div>
              <div>
                <label className="form-label">Max Years Exp</label>
                <input className="form-input" type="number" min="0" value={form.maxYearsExp} onChange={(e) => setForm({...form, maxYearsExp: e.target.value})} />
              </div>
              <div>
                <label className="form-label">Headcount</label>
                <input className="form-input" type="number" min="1" value={form.headcount} onChange={(e) => setForm({...form, headcount: e.target.value})} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" id="preferAI" checked={form.preferAIExp} onChange={(e) => setForm({...form, preferAIExp: e.target.checked})} />
                <label htmlFor="preferAI" style={{ fontSize: 13 }}>Prefer AI company background</label>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label className="form-label">Target Countries</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {COUNTRIES.map((c) => (
                    <button key={c} type="button"
                      onClick={() => toggleCountry(c)}
                      style={{ padding: "3px 8px", border: `1px solid ${form.targetCountries.includes(c) ? "#1d4ed8" : "#d0d8eb"}`, borderRadius: 4, background: form.targetCountries.includes(c) ? "#dbeafe" : "white", color: form.targetCountries.includes(c) ? "#1d4ed8" : "#475569", fontSize: 12, cursor: "pointer" }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label className="form-label">Job Description *</label>
                <textarea className="form-input form-textarea" style={{ minHeight: 100 }} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Describe the role, responsibilities, and what success looks like..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveJob} disabled={saving || !form.title || !form.description}>
                {saving ? "Creating..." : "Create Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
