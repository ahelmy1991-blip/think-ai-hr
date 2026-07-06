"use client";
import { useEffect, useState } from "react";

interface Job {
  id: string; title: string; department: string; level: string;
  location: string; jobType: string; description: string;
  requirements: string[]; minYearsExp: number; maxYearsExp: number;
  specialty: string; headcount: number; createdAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  "full-time": "Full-Time", "part-time": "Part-Time", "contract": "Contract", "internship": "Internship",
};

const DEPT_COLOR: Record<string, string> = {
  Engineering: "#3b82f6", Product: "#8b5cf6", Data: "#06b6d4",
  Design: "#ec4899", People: "#22c55e", Finance: "#f59e0b",
  Legal: "#6366f1", Marketing: "#f97316", Operations: "#14b8a6", Leadership: "#c8a84b",
};

export default function JobsPage() {
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [dept, setDept]       = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Open Roles — THINK-AI Portal";
    fetch("/api/portal/jobs").then(r => r.json()).then(setJobs).finally(() => setLoading(false));
  }, []);

  const depts   = ["All", ...Array.from(new Set(jobs.map(j => j.department))).sort()];
  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const matchQ = !q || j.title.toLowerCase().includes(q) || j.department.toLowerCase().includes(q) || j.description.toLowerCase().includes(q);
    return matchQ && (dept === "All" || j.department === dept);
  });

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg, #050d1a 0%, #0f2140 50%)", padding: "28px 40px 24px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#93c5fd", marginBottom: 6 }}>Employee Portal</div>
        <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 28, fontWeight: 600, color: "white", margin: 0 }}>Open Roles</h1>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{jobs.length} position{jobs.length !== 1 ? "s" : ""} · Riyadh, KSA</p>
      </div>

      <div style={{ padding: "24px 40px" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search roles…"
            style={{
              flex: "1 1 240px", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0",
              fontSize: 13, outline: "none", fontFamily: "Outfit, sans-serif", color: "#0a1628",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = "#3b82f6"; }}
            onBlur={e  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {depts.map(d => (
              <button key={d} onClick={() => setDept(d)} style={{
                padding: "8px 14px", borderRadius: 20, border: "1.5px solid",
                borderColor: dept === d ? "#3b82f6" : "#e2e8f0",
                background: dept === d ? "#eff6ff" : "white",
                color: dept === d ? "#1d4ed8" : "#6b7a99",
                fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Outfit, sans-serif",
              }}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ color: "#94a3b8", padding: 24, textAlign: "center" }}>Loading roles…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: 12 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💼</div>
            No open roles match your search.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filtered.map(j => {
              const dc = DEPT_COLOR[j.department] ?? "#6b7a99";
              const isOpen = expanded === j.id;
              const reqs   = Array.isArray(j.requirements) ? j.requirements : [];
              return (
                <div key={j.id} style={{
                  background: "white", borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  border: "1px solid #f0f4f8", overflow: "hidden",
                }}>
                  <div style={{ padding: "20px 22px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10.5, padding: "2px 9px", borderRadius: 20, background: `${dc}18`, color: dc, fontWeight: 700 }}>
                            {j.department}
                          </span>
                          <span style={{ fontSize: 10.5, padding: "2px 9px", borderRadius: 20, background: "#f1f5f9", color: "#64748b", fontWeight: 600 }}>
                            {j.level}
                          </span>
                          <span style={{ fontSize: 10.5, padding: "2px 9px", borderRadius: 20, background: "#f0fdf4", color: "#16a34a", fontWeight: 600 }}>
                            {TYPE_LABEL[j.jobType] ?? j.jobType}
                          </span>
                          {j.headcount > 1 && (
                            <span style={{ fontSize: 10.5, padding: "2px 9px", borderRadius: 20, background: "#fff7ed", color: "#c2410c", fontWeight: 600 }}>
                              {j.headcount} openings
                            </span>
                          )}
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0a1628", margin: "0 0 6px" }}>{j.title}</h3>
                        <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#94a3b8" }}>
                          <span>📍 {j.location}</span>
                          <span>🗓 {j.minYearsExp}–{j.maxYearsExp} yrs exp</span>
                          {j.specialty && <span>✦ {j.specialty}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button onClick={() => setExpanded(isOpen ? null : j.id)} style={{
                          padding: "8px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0",
                          background: "white", color: "#475569", fontSize: 12, fontWeight: 600,
                          cursor: "pointer", fontFamily: "Outfit, sans-serif",
                        }}>
                          {isOpen ? "Less ▲" : "Details ▼"}
                        </button>
                        <a href={`mailto:people@think-ai.com?subject=Interest in ${encodeURIComponent(j.title)}`} style={{
                          padding: "8px 16px", borderRadius: 8, background: "#0a1628",
                          color: "white", fontSize: 12, fontWeight: 600, textDecoration: "none",
                          display: "inline-flex", alignItems: "center",
                        }}>
                          Apply →
                        </a>
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #f0f4f8" }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0a1628", marginBottom: 10 }}>About the Role</h4>
                        <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 16 }}>{j.description}</p>
                        {reqs.length > 0 && (
                          <>
                            <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0a1628", marginBottom: 8 }}>Requirements</h4>
                            <ul style={{ margin: 0, paddingLeft: 18 }}>
                              {reqs.map((r, i) => (
                                <li key={i} style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>{r}</li>
                              ))}
                            </ul>
                          </>
                        )}
                        <div style={{ marginTop: 16, padding: "12px 16px", background: "#f0f7ff", borderRadius: 8, fontSize: 12.5, color: "#1e40af" }}>
                          Interested? Email <strong>people@think-ai.com</strong> with your CV and the role title.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
