"use client";
import { useEffect, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  label: string;
  owner: string;
  done: boolean;
  doneAt?: string | null;
  doneBy?: string | null;
  required?: boolean;
  expatOnly?: boolean;
}

interface Checklist {
  id: string;
  phase: string;
  items: ChecklistItem[];
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  level: string;
  department: string;
  isExpat: boolean;
  status: string;
  startDate: string;
}

interface MeetingRecord {
  month: number;
  manager: string;
  date: string;
  notes: string;
  status: "scheduled" | "completed" | "missed";
  createdAt: string;
}

// ── Phase metadata ────────────────────────────────────────────────────────────

const PHASE_META: Record<string, { label: string; days: string; color: string; accent: string }> = {
  preboarding: { label: "Pre-Boarding",         days: "Before Day 1",          color: "#6366f1", accent: "#ede9fe" },
  week1:       { label: "Week 1",               days: "Day 1–7",               color: "#0ea5e9", accent: "#e0f2fe" },
  day30:       { label: "Day 1–30",             days: "30-Day Check-in",       color: "#10b981", accent: "#d1fae5" },
  day60:       { label: "Day 31–60",            days: "Mid-Probation Review",  color: "#f59e0b", accent: "#fef3c7" },
  day90:       { label: "Day 61–90",            days: "Probation Completion",  color: "#8b5cf6", accent: "#ede9fe" },
};

type TabKey = "journey" | "decision" | "performance";

function getPhase(key: string) {
  return PHASE_META[key] ?? { label: key, days: "", color: "#64748b", accent: "#f1f5f9" };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysSince(startDate: string): number {
  return Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
}

function phaseLabel(days: number) {
  if (days <= 0)  return { text: "Pre-boarding", color: "#6366f1" };
  if (days <= 7)  return { text: "Week 1", color: "#0ea5e9" };
  if (days <= 30) return { text: "Day 1–30", color: "#10b981" };
  if (days <= 60) return { text: "Day 31–60", color: "#f59e0b" };
  if (days <= 90) return { text: "Day 61–90", color: "#8b5cf6" };
  return { text: "Onboarding complete", color: "#16a34a" };
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const INP: React.CSSProperties = {
  width: "100%", padding: "10px 13px", borderRadius: 8,
  border: "1.5px solid #e2e8f0", fontSize: 13,
  fontFamily: "Outfit, sans-serif", boxSizing: "border-box",
  color: "#1a2540", outline: "none",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function PortalOnboardingPage() {
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [employee, setEmployee]     = useState<Employee | null>(null);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [activePhase, setActivePhase] = useState<string>("");
  const [saving, setSaving]         = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState<TabKey>("journey");

  // Probation decision state
  const [decisionMode, setDecisionMode] = useState<"confirm" | "extend" | "terminate" | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [extendEndDate, setExtendEndDate] = useState("");
  const [decisionSaving, setDecisionSaving] = useState(false);
  const [decisionDone, setDecisionDone]   = useState<string | null>(null);

  // Performance 1:1 state
  const [meetings, setMeetings]       = useState<MeetingRecord[]>([]);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingMonth, setMeetingMonth]     = useState("");
  const [meetingManager, setMeetingManager] = useState("");
  const [meetingDate, setMeetingDate]       = useState("");
  const [meetingNotes, setMeetingNotes]     = useState("");
  const [meetingSaving, setMeetingSaving]   = useState(false);

  useEffect(() => { document.title = "My Onboarding — THINK-AI Portal"; }, []);

  useEffect(() => {
    if (checklists.length && !activePhase) {
      const first = checklists.find(c => Object.keys(PHASE_META).includes(c.phase));
      setActivePhase(first ? first.phase : checklists[0].phase);
    }
  }, [checklists, activePhase]);

  const journeyChecklists = checklists.filter(c => Object.keys(PHASE_META).includes(c.phase));

  async function lookup(emailOverride?: string) {
    const target = emailOverride ?? emailInput;
    if (!target) return;
    setLoading(true); setError(""); setEmployee(null); setChecklists([]); setActivePhase("");
    setActiveTab("journey"); setDecisionMode(null); setDecisionDone(null); setMeetings([]);
    const r = await fetch(`/api/portal/onboarding?email=${encodeURIComponent(target)}`);
    if (r.ok) {
      const d = await r.json();
      setEmployee(d.employee);
      setChecklists(d.checklists ?? []);
    } else {
      const d = await r.json().catch(() => ({}));
      setError(d.error ?? "Employee not found. Please use your work email.");
    }
    setLoading(false);
  }

  async function loadMeetings(email: string) {
    setMeetingLoading(true);
    const r = await fetch(`/api/portal/onboarding/meeting?email=${encodeURIComponent(email)}`);
    if (r.ok) {
      const d = await r.json();
      setMeetings(d.meetings ?? []);
    }
    setMeetingLoading(false);
  }

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab);
    if (tab === "performance" && employee && meetings.length === 0) {
      loadMeetings(employee.email);
    }
  }

  async function toggleItem(checklistId: string, itemId: string) {
    if (!employee) return;
    setSaving(checklistId);

    const updated = checklists.map(cl => {
      if (cl.id !== checklistId) return cl;
      return {
        ...cl,
        items: cl.items.map(item =>
          item.id === itemId
            ? { ...item, done: !item.done, doneAt: !item.done ? new Date().toISOString() : null, doneBy: !item.done ? employee.name : null }
            : item
        ),
      };
    });

    const target = updated.find(cl => cl.id === checklistId)!;
    const r = await fetch(`/api/portal/onboarding?email=${encodeURIComponent(employee.email)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklistId, items: target.items }),
    });

    if (r.ok) { setChecklists(updated); }
    setSaving(null);
  }

  async function submitDecision() {
    if (!employee || !decisionMode) return;
    setDecisionSaving(true);
    const body: Record<string, unknown> = {
      email: employee.email,
      decision: decisionMode,
      notes: decisionNotes,
    };
    if (decisionMode === "extend" && extendEndDate) body.new_end_date = extendEndDate;
    const r = await fetch("/api/portal/onboarding/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      const d = await r.json();
      setDecisionDone(d.status);
      setEmployee(prev => prev ? { ...prev, status: d.status } : prev);
      setDecisionMode(null);
    } else {
      const d = await r.json().catch(() => ({}));
      alert("Error: " + (d.error ?? "Failed"));
    }
    setDecisionSaving(false);
  }

  async function submitMeeting() {
    if (!employee || !meetingMonth || !meetingManager || !meetingDate) return;
    setMeetingSaving(true);
    const r = await fetch("/api/portal/onboarding/meeting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: employee.email,
        month: parseInt(meetingMonth),
        manager: meetingManager,
        date: meetingDate,
        notes: meetingNotes,
        status: "scheduled",
      }),
    });
    if (r.ok) {
      setShowMeetingForm(false);
      setMeetingMonth(""); setMeetingManager(""); setMeetingDate(""); setMeetingNotes("");
      await loadMeetings(employee.email);
    } else {
      const d = await r.json().catch(() => ({}));
      alert("Error: " + (d.error ?? "Failed"));
    }
    setMeetingSaving(false);
  }

  async function updateMeetingStatus(month: number, status: "scheduled" | "completed" | "missed") {
    if (!employee) return;
    await fetch("/api/portal/onboarding/meeting", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: employee.email, month, status }),
    });
    await loadMeetings(employee.email);
  }

  // ── Overall progress ───────────────────────────────────────────────────────
  const allItems  = (journeyChecklists ?? []).flatMap(cl => cl.items ?? []);
  const totalDone = allItems.filter(i => i?.done).length;
  const totalPct  = allItems.length ? Math.round((totalDone / allItems.length) * 100) : 0;

  const days    = employee ? daysSince(employee.startDate) : 0;
  const current = employee ? phaseLabel(days) : null;

  // Show probation section when day >= 85 or status is day90 / probation
  const showProbationSection = employee &&
    (days >= 85 || employee.status === "probation" || employee.status === "active" || days >= 60);
  const showPerformanceSection = employee &&
    (employee.status === "active" || employee.status === "confirmed");

  // For extend: max +90 days from today
  const maxExtendDate = employee ? addDays(new Date().toISOString().slice(0, 10), 90) : "";

  const TABS: { key: TabKey; label: string }[] = [
    { key: "journey", label: "Onboarding Journey" },
    ...(showProbationSection ? [{ key: "decision" as TabKey, label: "Probation Decision" }] : []),
    ...(showPerformanceSection ? [{ key: "performance" as TabKey, label: "Performance 1:1s" }] : []),
  ];

  return (
    <div>
      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg, #050d1a 0%, #0f2140 60%, #1a3a6e 100%)",
        padding: "28px 40px 0", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -60, right: -60, width: 280, height: 280,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#93c5fd", marginBottom: 6 }}>
            Employee Portal
          </div>
          <h1 style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 28, fontWeight: 700, color: "white", margin: 0 }}>
            My Onboarding
          </h1>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)", marginTop: 4, marginBottom: employee ? 0 : 20 }}>
            Your 30/60/90-day onboarding journey at THINK-AI
          </p>
        </div>

        {/* Main tabs — shown when loaded */}
        {employee && (
          <div style={{ display: "flex", gap: 2, marginTop: 16 }}>
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => handleTabChange(tab.key)} style={{
                padding: "9px 20px", border: "none", background: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: "Outfit, sans-serif",
                color: activeTab === tab.key ? "white" : "rgba(255,255,255,0.45)",
                borderBottom: activeTab === tab.key ? "2.5px solid #6366f1" : "2.5px solid transparent",
                transition: "all 0.15s",
              }}>
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: "28px 40px", maxWidth: 940 }}>

        {/* ── Email lookup ── */}
        {!employee && (
          <div style={{ background: "white", borderRadius: 14, padding: 28, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", maxWidth: 480 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0a1628", marginBottom: 6 }}>Enter your work email</div>
            <div style={{ fontSize: 13, color: "#6b7a99", marginBottom: 20 }}>
              View your personal onboarding checklist and track your progress through probation.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="email" style={{ ...INP, flex: 1 }}
                placeholder="name@think-ai.com"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && lookup()}
              />
              <button onClick={() => lookup()} disabled={loading} style={{
                padding: "10px 20px", borderRadius: 8, border: "none",
                background: loading ? "#94a3b8" : "#0a1628",
                color: "white", fontSize: 13, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "Outfit, sans-serif",
              }}>
                {loading ? "…" : "View"}
              </button>
            </div>
            {error && <div style={{ marginTop: 12, fontSize: 13, color: "#dc2626" }}>{error}</div>}
          </div>
        )}

        {/* ── Loaded state ── */}
        {employee && (
          <>
            {/* Employee header card */}
            <div style={{
              background: "white", borderRadius: 14, padding: "20px 24px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.07)", marginBottom: 16,
              display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
            }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{
                  width: 50, height: 50, borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366f1, #3b82f6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, color: "white", fontWeight: 700, flexShrink: 0,
                }}>
                  {employee.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#0a1628" }}>{employee.name}</div>
                  <div style={{ fontSize: 12.5, color: "#6b7a99", marginTop: 2 }}>
                    {employee.role} · {employee.level} · {employee.department}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, fontWeight: 700, background: "#f0f9ff", color: "#0369a1" }}>
                      Day {days}
                    </span>
                    {current && (
                      <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, fontWeight: 700, background: current.color + "18", color: current.color }}>
                        {current.text}
                      </span>
                    )}
                    {employee.isExpat && (
                      <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, fontWeight: 700, background: "#e0e7ff", color: "#3730a3" }}>Expat</span>
                    )}
                    <span style={{
                      fontSize: 10.5, padding: "2px 8px", borderRadius: 20, fontWeight: 700,
                      background: employee.status === "active" ? "#f0fdf4" : employee.status === "terminated" ? "#fef2f2" : "#fef3c7",
                      color: employee.status === "active" ? "#16a34a" : employee.status === "terminated" ? "#dc2626" : "#92400e",
                    }}>
                      {employee.status.replace(/_/g, " ")}
                    </span>
                    {totalPct === 100 && (
                      <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, fontWeight: 700, background: "#f0fdf4", color: "#16a34a" }}>All Complete</span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => { setEmployee(null); setChecklists([]); setActivePhase(""); setEmailInput(""); setMeetings([]); }}
                style={{
                  padding: "8px 16px", borderRadius: 7, border: "1.5px solid #e2e8f0",
                  background: "white", fontSize: 12, color: "#475569", cursor: "pointer",
                  fontFamily: "Outfit, sans-serif",
                }}>
                Switch account
              </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TAB: Journey                                                  */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "journey" && (
              <>
                {/* Phase sub-tabs */}
                {journeyChecklists.length > 0 && (
                  <div style={{
                    background: "white", borderRadius: 14,
                    boxShadow: "0 2px 10px rgba(0,0,0,0.07)", marginBottom: 16,
                    overflow: "hidden",
                  }}>
                    {/* Overall progress */}
                    <div style={{ padding: "18px 24px", borderBottom: "1px solid #f0f4f8" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0a1628" }}>Overall Onboarding Progress</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: totalPct === 100 ? "#16a34a" : "#0a1628" }}>
                          {totalDone} / {allItems.length} &nbsp;·&nbsp; {totalPct}%
                        </span>
                      </div>
                      <div style={{ height: 10, background: "#f0f4f8", borderRadius: 6, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 6, transition: "width 0.4s ease",
                          width: `${totalPct}%`,
                          background: totalPct === 100 ? "#16a34a" : "linear-gradient(90deg, #6366f1, #3b82f6)",
                        }} />
                      </div>
                    </div>

                    {/* Phase mini cards */}
                    <div style={{ padding: "16px 24px", display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {journeyChecklists.map(cl => {
                        const ph = getPhase(cl.phase);
                        const safeItems = cl.items ?? [];
                        const pDone = safeItems.filter(i => i?.done).length;
                        const pPct  = safeItems.length ? Math.round((pDone / safeItems.length) * 100) : 0;
                        return (
                          <button key={cl.phase} onClick={() => setActivePhase(cl.phase)} style={{
                            padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${activePhase === cl.phase ? ph.color : "#e2e8f0"}`,
                            background: activePhase === cl.phase ? ph.accent : "#f8fafc",
                            cursor: "pointer", minWidth: 120, textAlign: "left",
                            transition: "all 0.15s",
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: ph.color, marginBottom: 3 }}>{ph.label}</div>
                            <div style={{ fontSize: 10.5, color: "#6b7a99", marginBottom: 5 }}>{ph.days}</div>
                            <div style={{ height: 4, background: "#e2e8f0", borderRadius: 2 }}>
                              <div style={{ height: "100%", borderRadius: 2, width: `${pPct}%`, background: ph.color }} />
                            </div>
                            <div style={{ fontSize: 10.5, color: "#6b7a99", marginTop: 3 }}>{pDone}/{safeItems.length} done</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {journeyChecklists.length === 0 && (
                  <div style={{
                    background: "white", borderRadius: 14, padding: "48px 28px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
                    textAlign: "center", color: "#94a3b8",
                  }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>&#128640;</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0a1628", marginBottom: 6 }}>No onboarding checklist yet</div>
                    <div style={{ fontSize: 13 }}>Your People team will set up your checklist shortly. Check back soon.</div>
                  </div>
                )}

                {/* Active phase checklist */}
                {journeyChecklists.filter(cl => cl.phase === activePhase).map(cl => {
                  const ph = getPhase(cl.phase);
                  const clItems = cl.items ?? [];
                  const pDone  = clItems.filter(i => i?.done).length;
                  const pTotal = clItems.length;
                  const pPct   = pTotal ? Math.round((pDone / pTotal) * 100) : 0;
                  const isSavingThis = saving === cl.id;

                  return (
                    <div key={cl.id} style={{
                      background: "white", borderRadius: 14,
                      boxShadow: "0 2px 10px rgba(0,0,0,0.07)", overflow: "hidden",
                    }}>
                      <div style={{
                        padding: "18px 24px", background: ph.accent,
                        borderBottom: `3px solid ${ph.color}22`,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: ph.color }}>{ph.label}</div>
                          <div style={{ fontSize: 12, color: "#6b7a99", marginTop: 2 }}>{ph.days}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: ph.color }}>{pPct}%</div>
                          <div style={{ fontSize: 11, color: "#6b7a99" }}>{pDone}/{pTotal} complete</div>
                        </div>
                      </div>

                      <div style={{ height: 5, background: "#f0f4f8" }}>
                        <div style={{ height: "100%", width: `${pPct}%`, background: ph.color, transition: "width 0.4s ease" }} />
                      </div>

                      <div style={{ padding: "8px 0" }}>
                        {clItems.length === 0 && (
                          <div style={{ padding: "20px 24px", color: "#94a3b8", fontSize: 13 }}>No items for this phase.</div>
                        )}
                        {clItems.map((item, idx) => {
                          const isLast = idx === clItems.length - 1;
                          return (
                            <div key={item.id} style={{
                              display: "flex", alignItems: "flex-start", gap: 14,
                              padding: "13px 24px",
                              borderBottom: isLast ? "none" : "1px solid #f0f4f8",
                              background: item.done ? "#fafffe" : "white",
                              transition: "background 0.15s",
                            }}>
                              <div
                                onClick={() => !isSavingThis && toggleItem(cl.id, item.id)}
                                style={{
                                  width: 20, height: 20, borderRadius: 5, border: `2px solid ${item.done ? ph.color : "#cbd5e1"}`,
                                  background: item.done ? ph.color : "white",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  flexShrink: 0, marginTop: 1,
                                  cursor: isSavingThis ? "not-allowed" : "pointer",
                                  transition: "all 0.15s",
                                }}
                              >
                                {item.done && (
                                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                                    <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>

                              <div style={{ flex: 1 }}>
                                <span style={{
                                  fontSize: 13.5, fontWeight: item.done ? 400 : 600,
                                  color: item.done ? "#94a3b8" : "#1a2540",
                                  textDecoration: item.done ? "line-through" : "none",
                                  lineHeight: 1.4,
                                }}>
                                  {item.label}
                                </span>
                                {item.required && !item.done && (
                                  <span style={{ marginLeft: 8, fontSize: 9.5, color: "#dc2626", fontWeight: 700, background: "#fef2f2", padding: "1px 6px", borderRadius: 3 }}>REQUIRED</span>
                                )}
                                {item.done && item.doneAt && (
                                  <div style={{ fontSize: 11, color: "#b0bec5", marginTop: 3 }}>
                                    Completed {new Date(item.doneAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    {item.doneBy && <> &middot; {item.doneBy}</>}
                                  </div>
                                )}
                              </div>

                              <OwnerBadge owner={item.owner} />
                            </div>
                          );
                        })}
                      </div>

                      {pPct === 100 && (
                        <div style={{
                          padding: "12px 24px", background: "#f0fdf4", borderTop: "1px solid #d1fae5",
                          fontSize: 13, fontWeight: 700, color: "#16a34a", display: "flex", gap: 8, alignItems: "center",
                        }}>
                          <span>&#10003;</span> Phase complete!
                        </div>
                      )}
                      {isSavingThis && (
                        <div style={{ padding: "10px 24px", background: "#f8fafc", borderTop: "1px solid #f0f4f8", fontSize: 12, color: "#94a3b8" }}>
                          Saving&hellip;
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TAB: Probation Decision                                       */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "decision" && showProbationSection && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0a1628", marginBottom: 16 }}>
                  Probation Decision &mdash; Day {days}
                </div>

                {decisionDone && (
                  <div style={{
                    background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 12,
                    padding: "18px 24px", marginBottom: 20, fontSize: 14, color: "#166534", fontWeight: 600,
                  }}>
                    Decision recorded. Employee status updated to: <strong>{decisionDone.replace(/_/g, " ")}</strong>
                  </div>
                )}

                {!decisionDone && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 24 }}>

                    {/* Confirm */}
                    <div style={{ background: "white", borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", overflow: "hidden", border: decisionMode === "confirm" ? "2px solid #16a34a" : "2px solid transparent" }}>
                      <div style={{ padding: "18px 20px", background: "#f0fdf4", borderBottom: "1px solid #d1fae5" }}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>&#10003;</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#166534" }}>Confirm Probation Passed</div>
                        <div style={{ fontSize: 12, color: "#4ade80", marginTop: 4 }}>Employee has successfully completed probation</div>
                      </div>
                      <div style={{ padding: "14px 20px" }}>
                        <p style={{ fontSize: 12.5, color: "#6b7a99", margin: "0 0 12px" }}>
                          Confirms the employee as a permanent staff member. A confirmation letter will be generated for their records.
                        </p>
                        <button onClick={() => setDecisionMode(decisionMode === "confirm" ? null : "confirm")} style={{
                          width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
                          background: decisionMode === "confirm" ? "#16a34a" : "#f0fdf4",
                          color: decisionMode === "confirm" ? "white" : "#16a34a",
                          fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "Outfit, sans-serif",
                        }}>
                          {decisionMode === "confirm" ? "Selected" : "Select: Confirm"}
                        </button>
                      </div>
                    </div>

                    {/* Extend */}
                    <div style={{ background: "white", borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", overflow: "hidden", border: decisionMode === "extend" ? "2px solid #d97706" : "2px solid transparent" }}>
                      <div style={{ padding: "18px 20px", background: "#fef3c7", borderBottom: "1px solid #fde68a" }}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>&#8987;</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#92400e" }}>Extend Probation</div>
                        <div style={{ fontSize: 12, color: "#d97706", marginTop: 4 }}>Written consent required &mdash; Article 53 KSA Labour Law</div>
                      </div>
                      <div style={{ padding: "14px 20px" }}>
                        <p style={{ fontSize: 12.5, color: "#6b7a99", margin: "0 0 12px" }}>
                          Per KSA Labour Law Article 53, probation may be extended once. The total probation period must not exceed 180 days.
                          Written consent from the employee is mandatory.
                        </p>
                        <button onClick={() => setDecisionMode(decisionMode === "extend" ? null : "extend")} style={{
                          width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
                          background: decisionMode === "extend" ? "#d97706" : "#fef3c7",
                          color: decisionMode === "extend" ? "white" : "#92400e",
                          fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "Outfit, sans-serif",
                        }}>
                          {decisionMode === "extend" ? "Selected" : "Select: Extend"}
                        </button>
                      </div>
                    </div>

                    {/* Terminate */}
                    <div style={{ background: "white", borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", overflow: "hidden", border: decisionMode === "terminate" ? "2px solid #dc2626" : "2px solid transparent" }}>
                      <div style={{ padding: "18px 20px", background: "#fef2f2", borderBottom: "1px solid #fecaca" }}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>&#10060;</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#991b1b" }}>Initiate Termination</div>
                        <div style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>KSA Labour Law Article 77 process</div>
                      </div>
                      <div style={{ padding: "14px 20px" }}>
                        <p style={{ fontSize: 12.5, color: "#6b7a99", margin: "0 0 8px" }}>
                          Process per Article 77 (termination during probation):
                        </p>
                        <ul style={{ fontSize: 12, color: "#6b7a99", paddingLeft: 16, margin: "0 0 12px", lineHeight: 1.8 }}>
                          <li>Either party may terminate during probation without notice</li>
                          <li>No end-of-service indemnity applies during probation period</li>
                          <li>Provide written notice with reason documented</li>
                          <li>Final settlement within 7 days of last working day</li>
                        </ul>
                        <button onClick={() => setDecisionMode(decisionMode === "terminate" ? null : "terminate")} style={{
                          width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
                          background: decisionMode === "terminate" ? "#dc2626" : "#fef2f2",
                          color: decisionMode === "terminate" ? "white" : "#991b1b",
                          fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "Outfit, sans-serif",
                        }}>
                          {decisionMode === "terminate" ? "Selected" : "Select: Terminate"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Decision form */}
                {decisionMode && !decisionDone && (
                  <div style={{ background: "white", borderRadius: 14, padding: 24, boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0a1628", marginBottom: 16 }}>
                      {decisionMode === "confirm" && "Confirm Probation — Add Notes"}
                      {decisionMode === "extend" && "Extend Probation — New End Date + Written Consent"}
                      {decisionMode === "terminate" && "Initiate Termination — Document Reason"}
                    </div>

                    {decisionMode === "extend" && (
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
                          New Probation End Date (max +90 days from today)
                        </label>
                        <input type="date" style={{ ...INP, maxWidth: 240 }}
                          value={extendEndDate}
                          max={maxExtendDate}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={e => setExtendEndDate(e.target.value)}
                        />
                        <div style={{ fontSize: 11, color: "#6b7a99", marginTop: 4 }}>
                          Maximum extension end date: {maxExtendDate} (per KSA Labour Law, total probation cannot exceed 180 days)
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>
                        {decisionMode === "extend" ? "Written Consent Note / Justification (required)" : "Notes"}
                      </label>
                      <textarea
                        style={{ ...INP, minHeight: 100, resize: "vertical" }}
                        placeholder={
                          decisionMode === "confirm" ? "Add any notes about the confirmation..." :
                          decisionMode === "extend" ? "Document the reason for extension and confirm employee written consent has been obtained..." :
                          "Document the reason for termination per KSA Labour Law requirements..."
                        }
                        value={decisionNotes}
                        onChange={e => setDecisionNotes(e.target.value)}
                      />
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={submitDecision} disabled={decisionSaving || (decisionMode === "extend" && !extendEndDate)}
                        style={{
                          padding: "10px 24px", borderRadius: 8, border: "none", fontFamily: "Outfit, sans-serif",
                          background: decisionMode === "confirm" ? "#16a34a" : decisionMode === "extend" ? "#d97706" : "#dc2626",
                          color: "white", fontWeight: 700, fontSize: 13,
                          cursor: (decisionSaving || (decisionMode === "extend" && !extendEndDate)) ? "not-allowed" : "pointer",
                          opacity: (decisionSaving || (decisionMode === "extend" && !extendEndDate)) ? 0.6 : 1,
                        }}>
                        {decisionSaving ? "Saving..." : "Submit Decision"}
                      </button>
                      <button onClick={() => { setDecisionMode(null); setDecisionNotes(""); setExtendEndDate(""); }}
                        style={{
                          padding: "10px 20px", borderRadius: 8, border: "1.5px solid #e2e8f0",
                          background: "white", color: "#475569", fontSize: 13, cursor: "pointer",
                          fontFamily: "Outfit, sans-serif",
                        }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TAB: Performance 1:1s                                         */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "performance" && showPerformanceSection && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0a1628" }}>Monthly 1:1 Tracker</div>
                  <button onClick={() => setShowMeetingForm(!showMeetingForm)} style={{
                    padding: "8px 16px", borderRadius: 8, border: "none",
                    background: "#0a1628", color: "white", fontSize: 12.5, fontWeight: 600,
                    cursor: "pointer", fontFamily: "Outfit, sans-serif",
                  }}>
                    + Schedule 1:1
                  </button>
                </div>

                {/* Schedule form */}
                {showMeetingForm && (
                  <div style={{ background: "white", borderRadius: 14, padding: 24, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0a1628", marginBottom: 14 }}>Schedule a Monthly 1:1</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Month Number</label>
                        <input type="number" min="1" max="24" style={INP} placeholder="e.g. 1"
                          value={meetingMonth} onChange={e => setMeetingMonth(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Manager Name</label>
                        <input type="text" style={INP} placeholder="Manager name"
                          value={meetingManager} onChange={e => setMeetingManager(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Date</label>
                        <input type="date" style={INP}
                          value={meetingDate} onChange={e => setMeetingDate(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Notes / Agenda</label>
                      <textarea style={{ ...INP, minHeight: 80, resize: "vertical" }} placeholder="Meeting agenda or notes..."
                        value={meetingNotes} onChange={e => setMeetingNotes(e.target.value)} />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={submitMeeting} disabled={meetingSaving || !meetingMonth || !meetingManager || !meetingDate}
                        style={{
                          padding: "9px 20px", borderRadius: 8, border: "none",
                          background: (!meetingMonth || !meetingManager || !meetingDate || meetingSaving) ? "#94a3b8" : "#0a1628",
                          color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
                          fontFamily: "Outfit, sans-serif",
                        }}>
                        {meetingSaving ? "Saving..." : "Save 1:1"}
                      </button>
                      <button onClick={() => setShowMeetingForm(false)} style={{
                        padding: "9px 18px", borderRadius: 8, border: "1.5px solid #e2e8f0",
                        background: "white", color: "#475569", fontSize: 13, cursor: "pointer",
                        fontFamily: "Outfit, sans-serif",
                      }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {meetingLoading && (
                  <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading meetings...</div>
                )}

                {!meetingLoading && meetings.length === 0 && (
                  <div style={{
                    background: "white", borderRadius: 14, padding: "48px 28px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.07)", textAlign: "center", color: "#94a3b8",
                  }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>&#128197;</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0a1628", marginBottom: 6 }}>No 1:1s scheduled yet</div>
                    <div style={{ fontSize: 13 }}>Use the &ldquo;Schedule 1:1&rdquo; button above to record your monthly manager meeting.</div>
                  </div>
                )}

                {!meetingLoading && meetings.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {meetings.sort((a, b) => a.month - b.month).map(m => {
                      const statusColor = m.status === "completed" ? "#16a34a" : m.status === "missed" ? "#dc2626" : "#d97706";
                      const statusBg = m.status === "completed" ? "#f0fdf4" : m.status === "missed" ? "#fef2f2" : "#fef3c7";
                      return (
                        <div key={m.month} style={{
                          background: "white", borderRadius: 12, padding: "16px 20px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", gap: 16, alignItems: "flex-start",
                        }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: 10, background: "#f0f4f8",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0, fontSize: 12, fontWeight: 700, color: "#0a1628",
                          }}>
                            M{m.month}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                              <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0a1628" }}>Month {m.month} 1:1</span>
                              <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, fontWeight: 700, background: statusBg, color: statusColor }}>
                                {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: "#6b7a99" }}>
                              {m.manager} &middot; {m.date ? new Date(m.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : ""}
                            </div>
                            {m.notes && (
                              <div style={{ fontSize: 12, color: "#475569", marginTop: 5, fontStyle: "italic" }}>{m.notes}</div>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            {m.status !== "completed" && (
                              <button onClick={() => updateMeetingStatus(m.month, "completed")} style={{
                                padding: "5px 10px", borderRadius: 6, border: "1px solid #86efac",
                                background: "#f0fdf4", color: "#16a34a", fontSize: 11, fontWeight: 600,
                                cursor: "pointer", fontFamily: "Outfit, sans-serif",
                              }}>Done</button>
                            )}
                            {m.status !== "missed" && (
                              <button onClick={() => updateMeetingStatus(m.month, "missed")} style={{
                                padding: "5px 10px", borderRadius: 6, border: "1px solid #fecaca",
                                background: "#fef2f2", color: "#dc2626", fontSize: 11, fontWeight: 600,
                                cursor: "pointer", fontFamily: "Outfit, sans-serif",
                              }}>Missed</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Owner badge sub-component ─────────────────────────────────────────────────

const OWNER_META: Record<string, { label: string; bg: string; color: string }> = {
  people:   { label: "People Team", bg: "#ede9fe", color: "#7c3aed" },
  manager:  { label: "Manager",     bg: "#dbeafe", color: "#1d4ed8" },
  it:       { label: "IT",          bg: "#dcfce7", color: "#166534" },
  employee: { label: "You",         bg: "#fef3c7", color: "#92400e" },
  pro:      { label: "PRO",         bg: "#fee2e2", color: "#991b1b" },
};

function OwnerBadge({ owner }: { owner: string }) {
  const meta = OWNER_META[owner] ?? { label: owner, bg: "#f1f5f9", color: "#475569" };
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
      background: meta.bg, color: meta.color, flexShrink: 0, whiteSpace: "nowrap",
      alignSelf: "flex-start", marginTop: 2,
    }}>
      {meta.label}
    </span>
  );
}
