"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Candidate {
  id: string;
  name: string;
  currentRole: string | null;
  currentCompany: string | null;
  country: string | null;
  city: string | null;
  yearsExperience: number | null;
  specialty: string | null;
  stage: string;
  matchScore: number | null;
  hasAICompanyExp: boolean;
  culturalBackground: string | null;
  linkedinUrl: string | null;
  skills: string[];
  job?: { id: string; title: string } | null;
}

const STAGES = [
  { key: "sourced", label: "Sourced", color: "#6366f1" },
  { key: "screening", label: "Screening", color: "#0ea5e9" },
  { key: "interview", label: "Interview", color: "#f59e0b" },
  { key: "offer", label: "Offer", color: "#8b5cf6" },
  { key: "hired", label: "Hired", color: "#10b981" },
  { key: "rejected", label: "Rejected", color: "#94a3b8" },
];

export default function RecruitmentPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [moving, setMoving] = useState<string | null>(null);

  useEffect(() => { loadCandidates(); }, []);

  async function loadCandidates() {
    const r = await fetch("/api/recruitment/candidates");
    setCandidates(await r.json());
  }

  async function moveStage(candidateId: string, newStage: string) {
    setMoving(candidateId);
    await fetch(`/api/recruitment/candidates/${candidateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    setMoving(null);
    loadCandidates();
  }

  function scoreRing(score: number | null) {
    if (score === null) return null;
    const cls = score >= 75 ? "score-high" : score >= 50 ? "score-med" : "score-low";
    return <div className={`score-ring ${cls}`}>{score}</div>;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="display-font">ATS Pipeline</h1>
          <p>{candidates.length} candidates across all roles</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/recruitment/candidates" className="btn btn-outline btn-sm">All Candidates</Link>
          <Link href="/recruitment/jobs" className="btn btn-outline btn-sm">Open Roles</Link>
          <Link href="/recruitment/candidates?import=1" className="btn btn-primary btn-sm">+ Import Profile</Link>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${STAGES.length}, 1fr)`, gap: 12, minWidth: "900px", overflowX: "auto" }}>
          {STAGES.map((stage) => {
            const stageCandidates = candidates.filter((c) => c.stage === stage.key);
            return (
              <div key={stage.key} className="stage-col">
                <div className="stage-col-header">
                  <span style={{ color: stage.color }}>{stage.label}</span>
                  <span style={{ background: stage.color + "20", color: stage.color, padding: "1px 6px", borderRadius: 10, fontSize: 11 }}>
                    {stageCandidates.length}
                  </span>
                </div>
                {stageCandidates.map((c) => (
                  <div key={c.id} className="candidate-card" onClick={() => setSelected(c)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#0f2140" }}>{c.name}</div>
                      {scoreRing(c.matchScore)}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7a99", marginBottom: 4 }}>
                      {c.currentRole ?? "—"}{c.currentCompany ? ` · ${c.currentCompany}` : ""}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {c.country && <span className="badge badge-gray" style={{ fontSize: 10 }}>{c.country}</span>}
                      {c.hasAICompanyExp && <span className="badge badge-blue" style={{ fontSize: 10 }}>AI exp</span>}
                      {c.yearsExperience && <span className="badge badge-gray" style={{ fontSize: 10 }}>{c.yearsExperience}y</span>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Candidate detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-box" style={{ width: 620 }}>
            <div className="modal-header">
              <div>
                <h3>{selected.name}</h3>
                <div style={{ fontSize: 13, color: "#6b7a99", marginTop: 2 }}>
                  {selected.currentRole ?? "Role unknown"}{selected.currentCompany ? ` · ${selected.currentCompany}` : ""}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <InfoRow label="Location" value={[selected.city, selected.country].filter(Boolean).join(", ") || "—"} />
                <InfoRow label="Experience" value={selected.yearsExperience ? `${selected.yearsExperience} years` : "—"} />
                <InfoRow label="Specialty" value={selected.specialty ?? "—"} />
                <InfoRow label="Background" value={selected.culturalBackground ?? "—"} />
                <InfoRow label="AI Company Exp" value={selected.hasAICompanyExp ? "Yes" : "No"} />
                <InfoRow label="Current Stage" value={STAGES.find((s) => s.key === selected.stage)?.label ?? selected.stage} />
              </div>
              {selected.skills?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div className="form-label" style={{ marginBottom: 6 }}>Skills</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {selected.skills.map((s: string) => <span key={s} className="badge badge-gray">{s}</span>)}
                  </div>
                </div>
              )}
              {selected.matchScore !== null && (() => {
                let matchData: Record<string, unknown> = {};
                // Try to parse matchNotes from candidate record
                try { matchData = {}; } catch { /* ok */ }
                return (
                  <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>AI Match Score: {selected.matchScore}/100</div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${selected.matchScore}%`, background: selected.matchScore >= 75 ? "#10b981" : selected.matchScore >= 50 ? "#f59e0b" : "#ef4444" }} />
                    </div>
                  </div>
                );
              })()}
              <div>
                <div className="form-label" style={{ marginBottom: 8 }}>Move to Stage</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {STAGES.filter((s) => s.key !== selected.stage).map((s) => (
                    <button key={s.key}
                      className="btn btn-outline btn-sm"
                      style={{ borderColor: s.color, color: s.color }}
                      disabled={moving === selected.id}
                      onClick={async () => {
                        await moveStage(selected.id, s.key);
                        setSelected({ ...selected, stage: s.key });
                      }}>
                      → {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {selected.linkedinUrl && (
                <a href={selected.linkedinUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                  View LinkedIn
                </a>
              )}
              <button className="btn btn-outline" onClick={() => setSelected(null)}>Close</button>
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
