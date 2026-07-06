"use client";
import { useEffect, useState, useCallback } from "react";

interface AbsenceType {
  id: string; name: string; name_ar: string; category: string;
  max_days_per_year: number; paid_percentage: number;
  requires_document: boolean; saudi_only: boolean; expat_eligible: boolean; description: string;
}
interface Request {
  id: string; type_name: string; start_date: string; end_date: string;
  days_requested: number; reason: string; status: string; manager_notes: string | null; createdAt: string;
}
interface UsedDay { absence_type_id: string; used: number; }

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: "#fef3c7", color: "#b45309", label: "Pending" },
  approved: { bg: "#f0fdf4", color: "#16a34a", label: "Approved" },
  rejected: { bg: "#fef2f2", color: "#dc2626", label: "Rejected" },
  cancelled:{ bg: "#f1f5f9", color: "#64748b", label: "Cancelled" },
};

const CAT_ICON: Record<string, string> = {
  annual: "🌴", sick: "🏥", hajj: "🕌", maternity: "👶", paternity: "👶",
  marriage: "💍", bereavement: "🌹", unpaid: "📋", study: "📚", emergency: "🚨",
};

function businessDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start), e = new Date(end);
  if (e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const d = cur.getDay();
    if (d !== 5 && d !== 6) count++; // Fri/Sat are KSA weekend
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

const PAID_LABEL: Record<number, string> = { 100: "Full Pay", 75: "75% Pay", 0: "Unpaid" };

export default function AbsencePage() {
  const [view, setView]           = useState<"apply" | "history" | "types">("apply");
  const [types, setTypes]         = useState<AbsenceType[]>([]);
  const [requests, setRequests]   = useState<Request[]>([]);
  const [usedDays, setUsedDays]   = useState<UsedDay[]>([]);
  const [loading, setLoading]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]     = useState("");
  const [error, setError]         = useState("");
  const [emailLooked, setEmailLooked] = useState("");

  // Form
  const [form, setForm] = useState({
    employee_name: "", employee_email: "", absence_type_id: "",
    start_date: "", end_date: "", reason: "", is_saudi: false, document_submitted: false,
  });

  const days = businessDays(form.start_date, form.end_date);
  const selType = types.find(t => t.id === form.absence_type_id);

  useEffect(() => {
    document.title = "Absence Requests — THINK-AI Portal";
    fetch("/api/portal/absence").then(r => r.json()).then(d => setTypes(d.types || []));
  }, []);

  const lookupHistory = useCallback(async (email: string) => {
    if (!email) return;
    setLoading(true); setEmailLooked(email);
    const d = await fetch(`/api/portal/absence?email=${encodeURIComponent(email)}`).then(r => r.json());
    setRequests(d.requests || []); setUsedDays(d.usedDays || []);
    setLoading(false);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess("");
    if (!form.employee_name || !form.employee_email || !form.absence_type_id || !form.start_date || !form.end_date) {
      setError("Please fill in all required fields."); return;
    }
    if (days < 1) { setError("End date must be after start date."); return; }
    setSubmitting(true);
    const r = await fetch("/api/portal/absence", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, days_requested: days }),
    });
    const d = await r.json();
    if (r.ok) {
      setSuccess(`Request submitted! ID: ${d.id.slice(0, 8).toUpperCase()}. HR will review within 2 business days.`);
      setForm(f => ({ ...f, absence_type_id: "", start_date: "", end_date: "", reason: "" }));
      if (form.employee_email) lookupHistory(form.employee_email);
    } else {
      setError(d.error || "Failed to submit request.");
    }
    setSubmitting(false);
  }

  const getUsed = (typeId: string) => usedDays.find(u => u.absence_type_id === typeId)?.used ?? 0;
  const getBalance = (t: AbsenceType) => (t.max_days_per_year ?? 0) - getUsed(t.id);

  const TABS: { key: "apply" | "history" | "types"; label: string }[] = [
    { key: "apply", label: "Apply for Leave" },
    { key: "history", label: "My Requests" },
    { key: "types", label: "Leave Types & Entitlements" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #050d1a 0%, #0f2140 50%)", padding: "28px 40px 0" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#93c5fd", marginBottom: 6 }}>Employee Portal</div>
        <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 28, fontWeight: 600, color: "white", margin: 0 }}>Absence Management</h1>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)", marginTop: 4, marginBottom: 20 }}>Saudi Labor Law compliant · All leave types · HR review within 2 business days</p>
        <div style={{ display: "flex", gap: 2 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setView(t.key)} style={{
              padding: "9px 20px", border: "none", background: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, fontFamily: "Outfit, sans-serif",
              color: view === t.key ? "#e8c97a" : "rgba(255,255,255,0.5)",
              borderBottom: view === t.key ? "2px solid #e8c97a" : "2px solid transparent",
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "28px 40px", maxWidth: 900 }}>

        {/* ── Apply tab ── */}
        {view === "apply" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0a1628", marginBottom: 4 }}>Submit a Leave Request</div>
            <div style={{ fontSize: 13, color: "#6b7a99", marginBottom: 24 }}>
              All requests go to HR for review. You'll receive a response within 2 business days.
            </div>

            {success && (
              <div style={{ padding: "14px 18px", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, marginBottom: 20, fontSize: 13, color: "#16a34a" }}>
                ✓ {success}
              </div>
            )}
            {error && (
              <div style={{ padding: "14px 18px", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 10, marginBottom: 20, fontSize: 13, color: "#dc2626" }}>
                ✕ {error}
              </div>
            )}

            <form onSubmit={submit}>
              <div style={{ background: "white", borderRadius: 14, padding: 24, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7a99", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Your Details</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={LBL}>Full Name *</label>
                    <input required style={INP} placeholder="Ahmed Al-Hassan" value={form.employee_name}
                      onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={LBL}>Work Email *</label>
                    <input required type="email" style={INP} placeholder="name@think-ai.com" value={form.employee_email}
                      onChange={e => setForm(f => ({ ...f, employee_email: e.target.value }))} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 20 }}>
                    <input type="checkbox" id="saudi" checked={form.is_saudi} onChange={e => setForm(f => ({ ...f, is_saudi: e.target.checked }))} />
                    <label htmlFor="saudi" style={{ fontSize: 13, color: "#374151", cursor: "pointer" }}>I am a Saudi National</label>
                  </div>
                </div>
              </div>

              <div style={{ background: "white", borderRadius: 14, padding: 24, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7a99", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Leave Details</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={LBL}>Leave Type *</label>
                    <select required style={INP} value={form.absence_type_id}
                      onChange={e => setForm(f => ({ ...f, absence_type_id: e.target.value }))}>
                      <option value="">Select leave type…</option>
                      {types.map(t => (
                        <option key={t.id} value={t.id}>{CAT_ICON[t.category]} {t.name} — {PAID_LABEL[t.paid_percentage]}</option>
                      ))}
                    </select>
                    {selType && (
                      <div style={{ marginTop: 8, padding: "10px 14px", background: "#f0f7ff", borderRadius: 8, fontSize: 12, color: "#1e40af" }}>
                        {selType.description}
                        {selType.requires_document && <span style={{ fontWeight: 700, marginLeft: 8 }}>· Document required</span>}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={LBL}>Start Date *</label>
                    <input required type="date" style={INP} value={form.start_date}
                      onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div>
                    <label style={LBL}>End Date *</label>
                    <input required type="date" style={INP} value={form.end_date} min={form.start_date}
                      onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                  </div>

                  {/* Days preview */}
                  {form.start_date && form.end_date && (
                    <div style={{ gridColumn: "span 2", padding: "12px 16px", borderRadius: 10, background: days > 0 ? "#f0fdf4" : "#fef2f2", border: `1px solid ${days > 0 ? "#86efac" : "#fca5a5"}`, display: "flex", gap: 24, alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: days > 0 ? "#16a34a" : "#dc2626" }}>{days}</div>
                        <div style={{ fontSize: 11, color: "#6b7a99" }}>Working days<br/>(Sun–Thu)</div>
                      </div>
                      <div style={{ flex: 1, fontSize: 12.5, color: "#374151", lineHeight: 1.6 }}>
                        <strong>{form.start_date}</strong> to <strong>{form.end_date}</strong><br />
                        {selType && (
                          <>Entitlement: {selType.max_days_per_year} days/year · {PAID_LABEL[selType.paid_percentage]}</>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ gridColumn: "span 2" }}>
                    <label style={LBL}>Reason / Notes</label>
                    <textarea style={{ ...INP, minHeight: 80, resize: "vertical" }} placeholder="Brief reason for leave (optional for annual leave, required for sick/emergency)"
                      value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
                  </div>

                  {selType?.requires_document && (
                    <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="checkbox" id="doc" checked={form.document_submitted}
                        onChange={e => setForm(f => ({ ...f, document_submitted: e.target.checked }))} />
                      <label htmlFor="doc" style={{ fontSize: 13, color: "#374151", cursor: "pointer" }}>
                        I will submit the required document to HR (email: people@think-ai.com)
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" disabled={submitting || days < 1} style={{
                padding: "13px 28px", borderRadius: 10, border: "none",
                background: submitting || days < 1 ? "#94a3b8" : "#0a1628",
                color: "white", fontSize: 14, fontWeight: 700, cursor: submitting || days < 1 ? "not-allowed" : "pointer",
                fontFamily: "Outfit, sans-serif",
              }}>
                {submitting ? "Submitting…" : `Submit Request (${days} day${days !== 1 ? "s" : ""})`}
              </button>
            </form>
          </div>
        )}

        {/* ── History tab ── */}
        {view === "history" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0a1628", marginBottom: 4 }}>My Leave Requests</div>
            <p style={{ fontSize: 13, color: "#6b7a99", marginBottom: 20 }}>Enter your work email to see your requests and leave balances for the current year.</p>

            <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
              <input type="email" placeholder="Your work email…" style={{ ...INP, flex: 1 }} defaultValue={form.employee_email}
                onKeyDown={e => { if (e.key === "Enter") lookupHistory((e.target as HTMLInputElement).value); }}
                id="hist-email" />
              <button onClick={() => { const v = (document.getElementById("hist-email") as HTMLInputElement)?.value; lookupHistory(v); }}
                style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#0a1628", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Outfit, sans-serif" }}>
                Look Up
              </button>
            </div>

            {loading ? (
              <div style={{ color: "#94a3b8", padding: 20 }}>Loading…</div>
            ) : emailLooked && (
              <>
                {/* Balance summary */}
                {usedDays.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0a1628", marginBottom: 10 }}>Leave Balances — {new Date().getFullYear()}</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {types.filter(t => getUsed(t.id) > 0 || t.category === "annual" || t.category === "sick").map(t => {
                        const used = getUsed(t.id);
                        const bal  = getBalance(t);
                        return (
                          <div key={t.id} style={{ padding: "12px 16px", borderRadius: 10, background: "white", border: "1px solid #e2e8f0", minWidth: 140 }}>
                            <div style={{ fontSize: 18, marginBottom: 4 }}>{CAT_ICON[t.category]}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#0a1628" }}>{t.name}</div>
                            <div style={{ fontSize: 11, color: "#6b7a99", marginTop: 2 }}>{used} used / {t.max_days_per_year} days</div>
                            <div style={{ height: 4, background: "#f0f4f8", borderRadius: 2, marginTop: 6 }}>
                              <div style={{ height: "100%", borderRadius: 2, width: `${Math.min(100, (used / (t.max_days_per_year ?? 1)) * 100)}%`, background: bal < 5 ? "#ef4444" : "#22c55e" }} />
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: bal < 0 ? "#dc2626" : "#16a34a", marginTop: 4 }}>
                              {bal > 0 ? `${bal} remaining` : bal === 0 ? "Exhausted" : `${Math.abs(bal)} over`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Request history */}
                {requests.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", background: "#f8fafc", borderRadius: 12, color: "#94a3b8" }}>
                    No leave requests found for {emailLooked}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {requests.map(r => {
                      const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending;
                      return (
                        <div key={r.id} style={{ background: "white", borderRadius: 12, padding: "16px 20px", border: "1px solid #f0f4f8", boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                                <span style={{ fontWeight: 700, fontSize: 14, color: "#0a1628" }}>{r.type_name}</span>
                                <span style={{ fontSize: 10, padding: "2px 9px", borderRadius: 20, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                              </div>
                              <div style={{ fontSize: 12.5, color: "#475569" }}>
                                <strong>{r.start_date}</strong> → <strong>{r.end_date}</strong>
                                <span style={{ marginLeft: 10, color: "#94a3b8" }}>{r.days_requested} working day{r.days_requested !== 1 ? "s" : ""}</span>
                              </div>
                              {r.reason && <div style={{ fontSize: 12, color: "#6b7a99", marginTop: 4 }}>{r.reason}</div>}
                              {r.manager_notes && (
                                <div style={{ marginTop: 8, padding: "8px 12px", background: "#f8fafc", borderRadius: 7, fontSize: 12, color: "#374151" }}>
                                  <strong>HR notes:</strong> {r.manager_notes}
                                </div>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0, textAlign: "right" }}>
                              {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Leave types reference tab ── */}
        {view === "types" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0a1628", marginBottom: 4 }}>Leave Types & Entitlements</div>
            <p style={{ fontSize: 13, color: "#6b7a99", marginBottom: 20 }}>Saudi Labor Law (Royal Decree M/51) — applicable to all THINK-AI employees</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 14 }}>
              {types.map(t => (
                <div key={t.id} style={{ background: "white", borderRadius: 12, padding: "18px 20px", border: "1px solid #f0f4f8", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
                    <span style={{ fontSize: 24 }}>{CAT_ICON[t.category]}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#0a1628" }}>{t.name}</div>
                      <div style={{ fontSize: 11.5, color: "#6b7a99" }}>{t.name_ar}</div>
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700, background: "#f0fdf4", color: "#16a34a" }}>
                        {t.max_days_per_year} days/yr
                      </span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700, background: t.paid_percentage === 100 ? "#eff6ff" : t.paid_percentage === 75 ? "#fef3c7" : "#f1f5f9", color: t.paid_percentage === 100 ? "#1d4ed8" : t.paid_percentage === 75 ? "#b45309" : "#64748b" }}>
                        {PAID_LABEL[t.paid_percentage]}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.6, margin: 0 }}>{t.description}</p>
                  {t.requires_document && (
                    <div style={{ marginTop: 10, padding: "6px 10px", background: "#fff7ed", borderRadius: 6, fontSize: 11.5, color: "#c2410c" }}>
                      ⚠ Supporting document required
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const LBL: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#6b7a99", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 5 };
const INP: React.CSSProperties = { width: "100%", padding: "10px 13px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "Outfit, sans-serif", boxSizing: "border-box", color: "#1a2540", outline: "none" };
