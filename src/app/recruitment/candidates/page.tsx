"use client";
import { useEffect, useState } from "react";

interface Job { id: string; title: string }
interface Candidate {
  id: string; name: string; email: string | null; currentRole: string | null; currentCompany: string | null;
  country: string | null; city: string | null; yearsExperience: number | null; specialty: string | null;
  culturalBackground: string | null; hasAICompanyExp: boolean; aiCompanies: string[]; skills: string[];
  matchScore: number | null; matchNotes: string | null; stage: string; linkedinUrl: string | null;
  profileText: string | null; languages: string[]; notes: string | null;
  job?: { id: string; title: string } | null;
}

const STAGES = ["sourced","screening","interview","offer","hired","rejected"];

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [matchResult, setMatchResult] = useState<Record<string, unknown> | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [profileText, setProfileText] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [importJobId, setImportJobId] = useState("");
  const [importing, setImporting] = useState(false);
  const [matching, setMatching] = useState(false);
  const [filter, setFilter] = useState({ country: "", minExp: "", maxExp: "", hasAIExp: "", stage: "" });

  useEffect(() => {
    loadCandidates();
    fetch("/api/recruitment/jobs").then((r) => r.json()).then(setJobs);
  }, []);

  async function loadCandidates() {
    const params = new URLSearchParams();
    if (filter.country) params.set("country", filter.country);
    if (filter.minExp) params.set("minExp", filter.minExp);
    if (filter.maxExp) params.set("maxExp", filter.maxExp);
    if (filter.hasAIExp) params.set("hasAIExp", filter.hasAIExp);
    if (filter.stage) params.set("stage", filter.stage);
    const r = await fetch(`/api/recruitment/candidates?${params}`);
    setCandidates(await r.json());
  }

  async function importProfile() {
    if (!profileText.trim()) return;
    setImporting(true);
    const r = await fetch("/api/recruitment/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileText, linkedinUrl, jobId: importJobId || null }),
    });
    const data = await r.json();
    if (r.ok) {
      setShowImport(false);
      setProfileText(""); setLinkedinUrl(""); setImportJobId("");
      loadCandidates();
      setSelected(data.candidate);
    } else alert(data.error);
    setImporting(false);
  }

  async function runMatch(candidate: Candidate, jobId: string) {
    setMatching(true);
    const r = await fetch("/api/recruitment/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId: candidate.id, jobId }),
    });
    const data = await r.json();
    if (r.ok) {
      setMatchResult(data.match);
      setSelected(data.candidate);
      loadCandidates();
    } else alert(data.error);
    setMatching(false);
  }

  function scoreColor(score: number | null) {
    if (score === null) return "#94a3b8";
    return score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="display-font">Candidate Database</h1>
          <p>{candidates.length} candidates · AI scoring · LinkedIn import</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowImport(true)}>+ Import LinkedIn Profile</button>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="card" style={{ padding: "14px 16px", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label className="form-label">Country</label>
            <input className="form-input" style={{ width: 140 }} placeholder="Saudi Arabia..." value={filter.country} onChange={(e) => setFilter({...filter, country: e.target.value})} />
          </div>
          <div>
            <label className="form-label">Min Exp (y)</label>
            <input className="form-input" type="number" style={{ width: 90 }} value={filter.minExp} onChange={(e) => setFilter({...filter, minExp: e.target.value})} />
          </div>
          <div>
            <label className="form-label">Max Exp (y)</label>
            <input className="form-input" type="number" style={{ width: 90 }} value={filter.maxExp} onChange={(e) => setFilter({...filter, maxExp: e.target.value})} />
          </div>
          <div>
            <label className="form-label">Stage</label>
            <select className="form-input form-select" style={{ width: 130 }} value={filter.stage} onChange={(e) => setFilter({...filter, stage: e.target.value})}>
              <option value="">All stages</option>
              {STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">AI Exp</label>
            <select className="form-input form-select" style={{ width: 100 }} value={filter.hasAIExp} onChange={(e) => setFilter({...filter, hasAIExp: e.target.value})}>
              <option value="">Any</option>
              <option value="true">Yes</option>
            </select>
          </div>
          <button className="btn btn-primary btn-sm" onClick={loadCandidates} style={{ marginBottom: 1 }}>Filter</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilter({ country:"",minExp:"",maxExp:"",hasAIExp:"",stage:"" }); loadCandidates(); }} style={{ marginBottom: 1 }}>Reset</button>
        </div>

        <div className="card">
          <table className="data-table">
            <thead><tr>
              <th>Candidate</th><th>Location</th><th>Experience</th><th>Specialty</th>
              <th>Background</th><th>AI Exp</th><th>Stage</th><th>Score</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {candidates.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>
                  No candidates yet. Import LinkedIn profiles to build your pipeline.
                </td></tr>
              )}
              {candidates.map((c) => (
                <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => { setSelected(c); setMatchResult(null); }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{c.currentRole ?? "—"}{c.currentCompany ? ` · ${c.currentCompany}` : ""}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{[c.city, c.country].filter(Boolean).join(", ") || "—"}</td>
                  <td style={{ fontSize: 13 }}>{c.yearsExperience ? `${c.yearsExperience}y` : "—"}</td>
                  <td style={{ fontSize: 13 }}>{c.specialty ?? "—"}</td>
                  <td style={{ fontSize: 12, color: "#6b7a99" }}>{c.culturalBackground ?? "—"}</td>
                  <td>{c.hasAICompanyExp ? <span className="badge badge-blue">Yes</span> : <span className="badge badge-gray">No</span>}</td>
                  <td><span className="badge badge-gray">{c.stage}</span></td>
                  <td>
                    {c.matchScore !== null
                      ? <span style={{ fontWeight: 700, color: scoreColor(c.matchScore) }}>{c.matchScore}</span>
                      : <span style={{ color: "#94a3b8" }}>—</span>}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(c); setMatchResult(null); }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-box" style={{ width: 680 }}>
            <div className="modal-header">
              <div>
                <h3>{selected.name}</h3>
                <div style={{ fontSize: 13, color: "#6b7a99" }}>{selected.currentRole ?? "—"} · {[selected.city, selected.country].filter(Boolean).join(", ") || "—"}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                <InfoRow label="Experience" value={selected.yearsExperience ? `${selected.yearsExperience} years` : "—"} />
                <InfoRow label="Specialty" value={selected.specialty ?? "—"} />
                <InfoRow label="Background" value={selected.culturalBackground ?? "—"} />
                <InfoRow label="AI Company Exp" value={selected.hasAICompanyExp ? "Yes" : "No"} />
                <InfoRow label="Languages" value={selected.languages?.join(", ") || "—"} />
                <InfoRow label="Current Stage" value={selected.stage} />
              </div>
              {selected.aiCompanies?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="form-label" style={{ marginBottom: 6 }}>AI Companies</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {selected.aiCompanies.map((c: string) => <span key={c} className="badge badge-navy">{c}</span>)}
                  </div>
                </div>
              )}
              {selected.skills?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="form-label" style={{ marginBottom: 6 }}>Skills</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {selected.skills.map((s: string) => <span key={s} className="badge badge-gray">{s}</span>)}
                  </div>
                </div>
              )}
              {selected.notes && (
                <div style={{ marginBottom: 16, padding: "10px 12px", background: "#f8fafc", borderRadius: 8, fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
                  {selected.notes}
                </div>
              )}

              {/* AI Matching */}
              <div style={{ borderTop: "1px solid #e5e9f0", paddingTop: 14 }}>
                <div className="form-label" style={{ marginBottom: 8 }}>Run AI Match Score</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select className="form-input form-select" style={{ flex: 1 }}
                    defaultValue=""
                    onChange={(e) => e.target.value && runMatch(selected, e.target.value)}>
                    <option value="">Select a role to score against...</option>
                    {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                  </select>
                  {matching && <span style={{ color: "#6b7a99", fontSize: 13, display: "flex", alignItems: "center" }}>Scoring...</span>}
                </div>
              </div>

              {matchResult && (
                <div style={{ marginTop: 14, padding: "14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e5e9f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      AI Verdict: {String(matchResult.verdict ?? "—")}
                    </span>
                    <span style={{ fontSize: 24, fontWeight: 800, color: scoreColor(Number(matchResult.score)) }}>
                      {String(matchResult.score ?? "—")}<span style={{ fontSize: 14, color: "#94a3b8" }}>/100</span>
                    </span>
                  </div>
                  {(matchResult.strengths as string[] || []).length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#16a34a", marginBottom: 3 }}>STRENGTHS</div>
                      {(matchResult.strengths as string[]).map((s, i) => <div key={i} style={{ fontSize: 13, color: "#334155" }}>• {s}</div>)}
                    </div>
                  )}
                  {(matchResult.gaps as string[] || []).length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#dc2626", marginBottom: 3 }}>GAPS</div>
                      {(matchResult.gaps as string[]).map((g, i) => <div key={i} style={{ fontSize: 13, color: "#334155" }}>• {g}</div>)}
                    </div>
                  )}
                  {matchResult.ksa_readiness != null && (
                    <div style={{ fontSize: 12, marginTop: 8, color: "#6b7a99" }}>
                      KSA Readiness: <strong>{String(matchResult.ksa_readiness)}</strong>{matchResult.ksa_notes != null ? ` — ${String(matchResult.ksa_notes)}` : ""}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {selected.linkedinUrl && (
                <a href={selected.linkedinUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">LinkedIn</a>
              )}
              <button className="btn btn-outline" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowImport(false)}>
          <div className="modal-box" style={{ width: 640 }}>
            <div className="modal-header">
              <h3>Import LinkedIn Profile</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowImport(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ padding: "10px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 13, color: "#1d4ed8" }}>
                On LinkedIn, open a candidate profile → copy all text (Ctrl+A, Ctrl+C) → paste below. Claude will extract structured data automatically.
              </div>
              <div>
                <label className="form-label">LinkedIn Profile URL (optional)</label>
                <input className="form-input" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/username" />
              </div>
              <div>
                <label className="form-label">Link to Role (optional)</label>
                <select className="form-input form-select" value={importJobId} onChange={(e) => setImportJobId(e.target.value)}>
                  <option value="">No role — add to general pool</option>
                  {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Profile Text * (paste from LinkedIn)</label>
                <textarea className="form-input form-textarea" style={{ minHeight: 180 }} value={profileText}
                  onChange={(e) => setProfileText(e.target.value)}
                  placeholder="Paste the full LinkedIn profile text here — name, headline, experience, education, skills..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowImport(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={importProfile} disabled={importing || !profileText.trim()}>
                {importing ? "Importing with AI..." : "Import Profile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="form-label">{label}</div>
      <div style={{ fontSize: 13.5, color: "#334155" }}>{value}</div>
    </div>
  );
}
