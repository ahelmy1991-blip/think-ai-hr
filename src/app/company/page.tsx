"use client";
import { useState } from "react";

const GRADES = [
  { level: "L1",  title: "Associate I",            track: "IC",        mercer: "P1",        pc: "43-45", ssco: "Skilled",     equity: "None",     trackType: "ic"      },
  { level: "L2",  title: "Associate II",           track: "IC",        mercer: "P2",        pc: "46-48", ssco: "Skilled/High",equity: "None",     trackType: "ic"      },
  { level: "L3",  title: "Senior Associate",       track: "IC",        mercer: "P3",        pc: "49-51", ssco: "High-Skill",  equity: "None",     trackType: "ic"      },
  { level: "L4",  title: "Specialist I",           track: "IC",        mercer: "P4",        pc: "52-54", ssco: "High-Skill",  equity: "None",     trackType: "ic"      },
  { level: "L5",  title: "Specialist II",          track: "IC/Mgmt",   mercer: "P4-P5 / M1",pc: "53-55",ssco: "High-Skill",  equity: "~0.10%",   trackType: "fork"    },
  { level: "L6",  title: "Senior Specialist",      track: "IC/Mgmt",   mercer: "P5 / M2",   pc: "55-57",ssco: "High-Skill",  equity: "~0.15%",   trackType: "fork"    },
  { level: "L7",  title: "Lead I",                 track: "Mgmt/IC",   mercer: "P5-P6 / M3",pc: "58-59",ssco: "High-Skill",  equity: "~0.20%",   trackType: "mgmt"    },
  { level: "L8",  title: "Lead II",                track: "Mgmt",      mercer: "M3-M4",     pc: "60-62", ssco: "High-Skill",  equity: "~0.30%",   trackType: "mgmt"    },
  { level: "L9",  title: "Principal",              track: "IC/Mgmt",   mercer: "P6 / M4",   pc: "62-64",ssco: "High-Skill",  equity: "~0.40%",   trackType: "mgmt"    },
  { level: "L10", title: "Senior Principal",       track: "Sr Mgmt",   mercer: "M5",        pc: "64-66", ssco: "High-Skill",  equity: "~0.60%",   trackType: "exec"    },
  { level: "L11", title: "Executive I (VP)",       track: "Executive",  mercer: "E1",        pc: "66-68", ssco: "High-Skill",  equity: "~0.80%",   trackType: "exec"    },
  { level: "L12", title: "Executive II (C-Suite)", track: "Executive",  mercer: "E2",        pc: "68-70", ssco: "High-Skill",  equity: "~1.00%",   trackType: "exec"    },
  { level: "L13", title: "C-Suite / CEO",          track: "Executive",  mercer: "E3",        pc: "71-73", ssco: "—",           equity: "~1.50%",   trackType: "exec"    },
  { level: "L14", title: "Co-Founder",             track: "Founder",    mercer: "Founder",   pc: "—",     ssco: "—",           equity: "2-4%",     trackType: "founder" },
  { level: "L15", title: "Founder",                track: "Founder",    mercer: "Founder",   pc: "—",     ssco: "—",           equity: "Cap table", trackType: "founder"},
];

// DO NOT EDIT these values without explicit user request — admin-approved 2026-06-26.
// L1–L4: no equity. Grants run L5–L14.
const EQUITY_PCT: Record<string, number> = {
  L5: 0.10, L6: 0.15,
  L7: 0.20, L8: 0.30, L9: 0.40,
  L10: 0.60, L11: 0.80, L12: 1.00, L13: 1.50,
  L14: 3.00,
};

const TRACK_BG: Record<string, string> = {
  ic: "white",
  fork: "#f0f9ff",
  mgmt: "#f8fafc",
  exec: "#f5f3ff",
  founder: "#fffbeb",
};

const VALUES = [
  {
    id: "ownership",
    num: "1",
    name: "Ownership",
    principle: "Owners, not staff.",
    bullets: ["Own the outcome, not the task", "Be frugal with resources", "Mission over comfort"],
    color: "#0f2140",
    bg: "#e8f0fe",
    borderColor: "var(--navy-800)",
  },
  {
    id: "agility",
    num: "2",
    name: "Agility",
    principle: "Move with velocity.",
    bullets: ["Bias for action", "We ship quickly and reiterate", "Disagree, then commit"],
    color: "#1d4ed8",
    bg: "#dbeafe",
    borderColor: "#3b82f6",
  },
  {
    id: "impact",
    num: "3",
    name: "Impact",
    principle: "Builders, not talkers.",
    bullets: ["Build for the customer", "Think big, execute with simplicity", "Outcomes, not activity"],
    color: "#92400e",
    bg: "#fef3c7",
    borderColor: "#f59e0b",
  },
  {
    id: "craft",
    num: "4",
    name: "Craft",
    principle: "Go deep on the hard problem.",
    bullets: ["Excellence as the default", "Dive deep", "Delight the customer"],
    color: "#5b21b6",
    bg: "#ede9fe",
    borderColor: "#8b5cf6",
  },
];

const PAY_MIX = [
  { band: "L1–L4",   cash: 100, equity: 0,  label: "Cash Only — No Equity",      desc: "Entry level · all-in lump-sum salary, no equity grant" },
  { band: "L5–L6",   cash: 90,  equity: 10, label: "High Cash / Entry Equity",   desc: "First equity grant at Specialist II — ownership begins" },
  { band: "L7–L9",   cash: 75,  equity: 25, label: "Strong Cash / Growing Equity", desc: "Senior ICs and leads taking meaningful upside in ownership" },
  { band: "L10–L13", cash: 58,  equity: 42, label: "Balanced Cash / High Equity", desc: "Leadership wealth tied to company value creation" },
];

// Equity calculator: L5–L14 only (L1–L4 receive no equity, L15 is founder cap table)
const LEVELS_DROPDOWN = ["L5","L6","L7","L8","L9","L10","L11","L12","L13","L14"];

// Pre-Seed round valuation — update at each new funding round
const COMPANY_VALUATION_USD = 47_000_000; // $47M Pre-Seed
const ROUND_LABEL = "Pre-Seed";

export default function CompanyPage() {
  const [selectedLevel, setSelectedLevel] = useState("L7"); // default to first equity-eligible level above L5

  const equityPct = EQUITY_PCT[selectedLevel] ?? null;
  const grantFairValueUSD = equityPct !== null ? (equityPct / 100) * COMPANY_VALUATION_USD : null;

  return (
    <div style={{ background: "#f4f6f9", minHeight: "100vh" }}>

      {/* ── Section 1: Hero ── */}
      <section
        style={{
          background: "linear-gradient(135deg, #050d1a 0%, #0f2140 60%, #1a3a6e 100%)",
          padding: "48px 40px 36px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(232,201,122,0.08) 0%, transparent 70%)",
          }}
        />
        <div style={{ position: "relative", maxWidth: 960, margin: "0 auto" }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold-400)", marginBottom: 12 }}>
            THINK-AI · Riyadh, KSA
          </p>
          <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 42, fontStyle: "italic", color: "white", lineHeight: 1.15, marginBottom: 10, fontWeight: 600 }}>
            To reclaim the golden era of the region.
          </h1>
          <p style={{ fontSize: 18, color: "var(--gold-400)", marginBottom: 36 }}>
            AI Infrastructure that thinks.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 28 }}>
            {[
              {
                label: "Purpose",
                text: "To reclaim the golden era of the region. To build what the Muslim world has the talent to build — not to license it from elsewhere.",
              },
              {
                label: "Mission",
                text: "AI Infrastructure that thinks. AI we own, not rent — intelligence in software and hardware that stays in the region and compounds here.",
              },
              {
                label: "Vision",
                text: "To be the region's most trusted builder of applied AI, and the place the best AI talent comes to turn ideas into systems the world relies on.",
              },
            ].map((item, idx) => (
              <div
                key={item.label}
                style={{
                  padding: "0 28px",
                  borderLeft: idx > 0 ? "1px solid rgba(255,255,255,0.1)" : "none",
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold-400)", marginBottom: 8 }}>
                  {item.label}
                </div>
                <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.65 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 2: Values ── */}
      <section style={{ background: "white", padding: "52px 40px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 className="section-heading">How We Behave</h2>
          <p className="section-sub">Four values — each paired with the observable behavior it demands, so it can be hired for, rated, and rewarded.</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {VALUES.map((v) => (
              <div
                key={v.id}
                id={v.id}
                style={{
                  background: "white",
                  borderRadius: 12,
                  border: "1px solid #e5e9f0",
                  borderLeft: `4px solid ${v.borderColor}`,
                  padding: "24px 28px",
                  transition: "all 0.2s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = "translateY(-3px)";
                  el.style.boxShadow = "0 8px 28px rgba(15,33,64,0.1)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: v.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontWeight: 800,
                      color: v.color,
                      fontFamily: "Cormorant Garamond, serif",
                    }}
                  >
                    {v.num}
                  </div>
                  <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 22, fontWeight: 600, color: "#0a1628" }}>
                    {v.name}
                  </div>
                </div>
                <p style={{ fontStyle: "italic", fontSize: 13.5, color: "#475569", marginBottom: 10, lineHeight: 1.5 }}>
                  {v.principle}
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
                  {v.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: Grade Ladder ── */}
      <section style={{ background: "#f8fafc", padding: "52px 40px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 className="section-heading">The L1-L15 Grade Ladder</h2>
          <p className="section-sub">Aligned to Mercer Career Framework &amp; KSA SSCO. IC and management tracks fork at L5.</p>

          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e9f0", overflow: "hidden" }}>
            {/* Track legend */}
            <div style={{ padding: "12px 20px", background: "#f8fafc", borderBottom: "1px solid #e5e9f0", display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[
                { label: "IC Track", color: "white", border: "#d0d8eb" },
                { label: "IC/Mgmt Fork", color: "#f0f9ff", border: "#bae6fd" },
                { label: "Management", color: "#f8fafc", border: "#e2e8f0" },
                { label: "Executive", color: "#f5f3ff", border: "#ddd6fe" },
                { label: "Founder", color: "#fffbeb", border: "#fde68a" },
              ].map((t) => (
                <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: t.color, border: `1px solid ${t.border}` }} />
                  <span style={{ fontSize: 11.5, color: "#6b7a99" }}>{t.label}</span>
                </div>
              ))}
            </div>

            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Title</th>
                  <th>Track</th>
                  <th>Mercer</th>
                  <th>PC Range</th>
                  <th>SSCO</th>
                  <th>Equity %</th>
                </tr>
              </thead>
              <tbody>
                {GRADES.map((g, idx) => (
                  <tr key={g.level}>
                    <td style={{ background: TRACK_BG[g.trackType] }}>
                      <span style={{ fontWeight: 700, color: "#0a1628", fontFamily: "Cormorant Garamond, serif", fontSize: 16 }}>{g.level}</span>
                    </td>
                    <td style={{ background: TRACK_BG[g.trackType] }}>
                      <span style={{ fontWeight: 500 }}>{g.title}</span>
                      {g.trackType === "fork" && idx === 4 && (
                        <span style={{ marginLeft: 8, fontSize: 10, background: "#dbeafe", color: "#1e40af", padding: "1px 6px", borderRadius: 10, fontWeight: 600 }}>
                          FORK
                        </span>
                      )}
                    </td>
                    <td style={{ background: TRACK_BG[g.trackType], fontSize: 12.5, color: "#475569" }}>{g.track}</td>
                    <td style={{ background: TRACK_BG[g.trackType], fontSize: 12.5, color: "#475569" }}>{g.mercer}</td>
                    <td style={{ background: TRACK_BG[g.trackType], fontSize: 12.5, color: "#6b7a99" }}>{g.pc}</td>
                    <td style={{ background: TRACK_BG[g.trackType], fontSize: 12.5, color: "#6b7a99" }}>{g.ssco}</td>
                    <td style={{ background: TRACK_BG[g.trackType] }}>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: g.equity === "None" ? "#94a3b8" : g.trackType === "founder" ? "#92400e" : "#166534",
                        background: g.equity === "None" ? "#f1f5f9" : g.trackType === "founder" ? "#fef3c7" : "#dcfce7",
                        padding: "2px 8px",
                        borderRadius: 10,
                      }}>
                        {g.equity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: "10px 16px", background: "#fffbeb", borderTop: "1px solid #fde68a" }}>
              <p style={{ fontSize: 12, color: "#92400e" }}>
                IC track fork at L5: Both IC and Management paths are available from L5+. Pay bands and equity are equivalent across the fork at the same level. <strong>L1–L4 receive no equity grant</strong> — equity begins at L5 (Specialist II).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: ESOP Explorer ── */}
      <section style={{ background: "white", padding: "52px 40px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 className="section-heading">Equity Ownership — ESOP</h2>
          <p className="section-sub">10% employee option pool — the financial expression of our Ownership value. Equity grants begin at L5 (Specialist II) and scale with seniority.</p>

          {/* L1–L4 note */}
          <div style={{ marginBottom: 28, padding: "12px 18px", background: "#fffbeb", borderRadius: 10, border: "1px solid #fde68a", fontSize: 13, color: "#92400e" }}>
            <strong>Note on L1–L4:</strong> Entry-level grades (L1–L4) receive a competitive all-in cash salary. Equity grants start at L5 (Specialist II) as team members demonstrate ownership mindset and sustained impact.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>
            {/* Left: text */}
            <div>
              {[
                {
                  icon: "10%",
                  title: "Option Pool",
                  text: "10% of fully-diluted shares reserved for employees. Granted through an offshore holding company (Cayman/BVI/ADGM) that owns the Saudi operating entity.",
                },
                {
                  icon: "4yr",
                  title: "4-Year Vesting",
                  text: "4-year vesting schedule with a 1-year cliff. 25% of the grant vests at month 12 (the cliff), then the remaining 75% vests in equal annual tranches at years 2, 3, and 4.",
                },
                {
                  icon: "L5+",
                  title: "Equity from L5 Onwards",
                  text: "Equity grants are awarded from Specialist II (L5) upwards — L5 through L13. L1–L4 receive a strong all-in cash package. Ownership scales meaningfully with seniority and impact.",
                },
              ].map((item) => (
                <div key={item.title} style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 10,
                    background: "#0f2140", color: "var(--gold-400)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, letterSpacing: "0.03em",
                    flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#0a1628", marginBottom: 4 }}>{item.title}</div>
                    <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: calculator */}
            <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e5e9f0", padding: 28 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0a1628" }}>ESOP Grant Calculator</div>
                <span style={{ fontSize: 10, fontWeight: 700, background: "#dbeafe", color: "#1e3a8a", padding: "2px 8px", borderRadius: 10, letterSpacing: "0.06em" }}>
                  {ROUND_LABEL} · ${(COMPANY_VALUATION_USD / 1_000_000).toFixed(0)}M
                </span>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="form-label" htmlFor="level-select">Select Level</label>
                <select
                  id="level-select"
                  className="form-input form-select"
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                >
                  {LEVELS_DROPDOWN.map((l) => {
                    const grade = GRADES.find((g) => g.level === l);
                    return (
                      <option key={l} value={l}>{l} — {grade?.title ?? l}</option>
                    );
                  })}
                </select>
              </div>

              {equityPct !== null && grantFairValueUSD !== null ? (
                <>
                  {/* Grant size + fair value */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                    <div style={{ background: "white", borderRadius: 8, border: "1px solid #e5e9f0", padding: "12px 14px" }}>
                      <div style={{ fontSize: 10, color: "#6b7a99", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Grant Size</div>
                      <div style={{ fontSize: 26, fontWeight: 700, color: "#0f2140", fontFamily: "Arial, sans-serif" }}>
                        {equityPct}%
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7a99" }}>of fully-diluted capital</div>
                    </div>
                    <div style={{ background: "white", borderRadius: 8, border: "1px solid #e5e9f0", padding: "12px 14px" }}>
                      <div style={{ fontSize: 10, color: "#6b7a99", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Fair Value at Grant</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#1e3a8a", fontFamily: "Arial, sans-serif" }}>
                        ${grantFairValueUSD >= 1_000_000
                          ? `${(grantFairValueUSD / 1_000_000).toFixed(2)}M`
                          : grantFairValueUSD >= 1_000
                          ? `${Math.round(grantFairValueUSD / 1_000)}K`
                          : grantFairValueUSD.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7a99" }}>@ $47M pre-seed valuation</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: "#6b7a99", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>4-Year Vesting Schedule</div>
                    {[
                      { year: "Year 1", pct: 25, note: "Cliff vests at month 12", color: "#0f2140" },
                      { year: "Year 2", pct: 25, note: "Annual tranche", color: "#163058" },
                      { year: "Year 3", pct: 25, note: "Annual tranche", color: "#1e4080" },
                      { year: "Year 4", pct: 25, note: "Final tranche — fully vested", color: "#2F6FFF" },
                    ].map((row, i) => {
                      const cumulative = (i + 1) * 25;
                      const trancheValue = (grantFairValueUSD * row.pct) / 100;
                      return (
                        <div key={row.year} style={{ marginBottom: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#0a1628" }}>{row.year}</span>
                              <span style={{ fontSize: 11.5, color: "#6b7a99", marginLeft: 8 }}>{row.note}</span>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: row.color }}>
                                ${trancheValue >= 1000 ? `${Math.round(trancheValue / 1000)}K` : trancheValue.toLocaleString()}
                              </span>
                              <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 4 }}>({row.pct}%)</span>
                            </div>
                          </div>
                          <div style={{ height: 8, borderRadius: 4, background: "#e5e9f0", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 4, background: row.color, width: `${cumulative}%`, transition: "width 0.4s ease" }} />
                          </div>
                        </div>
                      );
                    })}

                    <div style={{ marginTop: 16, padding: "10px 14px", background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
                      <p style={{ fontSize: 12, color: "#1e40af", lineHeight: 1.5 }}>
                        <strong>Pre-Seed Round ($47M valuation)</strong> — Fair values above reflect the current board-approved 409A-equivalent exercise price. Values scale with future funding rounds. Strike price = fair value at grant date. Good leavers retain vested options within the exercise window; unvested options return to pool.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 13, color: "#6b7a99" }}>L14–L15 are founder-level cap table positions — contact the board directly. L1–L4 receive no equity grant; use the dropdown above to explore L5+ grants.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Pay Philosophy ── */}
      <section style={{ background: "#f8fafc", padding: "52px 40px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 className="section-heading">Compensation Philosophy</h2>
          <p className="section-sub">Competitive all-in cash salary + medical insurance + work visa. Simple, transparent, no fragmented allowances.</p>

          {/* KSA Law note */}
          <div style={{ marginBottom: 28, padding: "14px 18px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0", fontSize: 13, color: "#166534", lineHeight: 1.7 }}>
            <strong>KSA Labour Law — Benefits Clarification:</strong> Saudi Labour Law (Royal Decree M/51) does not mandate housing or transportation as separate cash allowances when the employment contract explicitly states the salary is <em>all-inclusive (شامل)</em>. THINK-AI pays a single comprehensive monthly salary that covers all living costs — no separate housing or transport line items. This structure is fully compliant provided the contract states this clearly. Medical insurance is mandatory under the Cooperative Health Insurance Act (CCHI) and is provided for employees and eligible dependents. Work visa sponsorship is provided to all expat hires as required by law.
          </div>

          {/* Three pillars */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 36 }}>
            {[
              {
                icon: "P66",
                title: "P66 Target",
                text: "We target the 66th percentile on total cash for every grade. Flex to P75 for scarce AI/ML/hardware talent with CEO and comp-committee sign-off.",
                color: "#0f2140",
                bg: "#e8f0fe",
              },
              {
                icon: "ALL",
                title: "What We Provide",
                text: "Comprehensive monthly salary (all-in, no separate allowances) · Medical insurance: self + eligible dependents (CCHI-mandated) · Work visa sponsorship for expat hires · L&D budget · ESOP equity from L5+.",
                color: "#166534",
                bg: "#dcfce7",
              },
              {
                icon: "KPI",
                title: "Pay for Impact",
                text: "Performance (Thinker/Doer/Talker ratings) directly determines merit, equity refresh, and progression. Tenure alone earns nothing.",
                color: "#92400e",
                bg: "#fef3c7",
              },
            ].map((p) => (
              <div key={p.title} style={{ background: "white", borderRadius: 12, border: "1px solid #e5e9f0", padding: "24px 20px" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: p.bg, color: p.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800, letterSpacing: "0.03em",
                  marginBottom: 14,
                }}>
                  {p.icon}
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#0a1628", marginBottom: 6 }}>{p.title}</div>
                <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{p.text}</p>
              </div>
            ))}
          </div>

          {/* Pay mix table */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e9f0", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e9f0" }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#0a1628" }}>Pay Mix by Level Band</div>
              <div style={{ fontSize: 12, color: "#6b7a99", marginTop: 2 }}>Cash vs. equity weighting evolves as seniority and ownership expectations increase</div>
            </div>
            <div style={{ padding: "0 20px" }}>
              {/* Legend */}
              <div style={{ display: "flex", gap: 20, padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: "#163058" }} />
                  <span style={{ fontSize: 11.5, color: "#6b7a99" }}>Salary (all-inclusive)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: "var(--gold-500)" }} />
                  <span style={{ fontSize: 11.5, color: "#6b7a99" }}>Equity / ESOP (L5+)</span>
                </div>
              </div>

              {PAY_MIX.map((row) => (
                <div key={row.band} style={{ padding: "14px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "baseline", flexWrap: "wrap", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#0a1628", fontFamily: "Cormorant Garamond, serif" }}>{row.band}</span>
                      <span style={{ fontSize: 12.5, color: "#475569" }}>{row.label}</span>
                      {row.equity === 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: "#f1f5f9", color: "#64748b", padding: "1px 7px", borderRadius: 10 }}>No Equity</span>
                      )}
                    </div>
                    <span style={{ fontSize: 11.5, color: "#6b7a99" }}>{row.desc}</span>
                  </div>
                  <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", gap: row.equity > 0 ? 2 : 0 }}>
                    <div style={{ width: `${row.cash}%`, background: "#163058", borderRadius: row.equity === 0 ? 5 : "5px 0 0 5px", transition: "width 0.4s" }} />
                    {row.equity > 0 && (
                      <div style={{ width: `${row.equity}%`, background: "var(--gold-500)", borderRadius: "0 5px 5px 0", transition: "width 0.4s" }} />
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: "#163058", fontWeight: 600 }}>{row.cash}% salary</span>
                    <span style={{ fontSize: 11, color: row.equity > 0 ? "#b88a2a" : "#94a3b8", fontWeight: 600 }}>
                      {row.equity > 0 ? `${row.equity}% equity` : "— no equity"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 6: Performance ── */}
      <section style={{ background: "white", padding: "52px 40px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 className="section-heading">Performance: Thinker, Doer, Talker</h2>
          <p className="section-sub">Three-tier ratings assessed on WHAT (OKRs / results — 50%) + HOW (the four values — 50%). No example = not a valid rating.</p>

          {/* Rating cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 40 }}>
            {[
              {
                name: "Thinker",
                border: "var(--gold-500)",
                bg: "#fffbeb",
                share: "~15-20% of team",
                badge: "Top Performer",
                badgeBg: "#fef3c7",
                badgeColor: "#92400e",
                desc: "Exceeds OKRs AND demonstrates next-level values and craft. Others learn from them. They are setting the pace, not following it.",
                consequences: [
                  "Largest merit share",
                  "Promotion track priority",
                  "Equity refresh grant",
                  "Active retention focus",
                ],
              },
              {
                name: "Doer",
                border: "#163058",
                bg: "#f0f4ff",
                share: "~65-75% of team",
                badge: "Performing",
                badgeBg: "#dbeafe",
                badgeColor: "#1e40af",
                desc: "Meets OKRs and lives the four values consistently. The reliable core of the team — the standard we celebrate, not a middle bucket.",
                consequences: [
                  "Cost-of-living / market increase",
                  "Normal vesting continues",
                  "Steady growth path",
                  "Strong retention baseline",
                ],
              },
              {
                name: "Talker",
                border: "#dc2626",
                bg: "#fef2f2",
                share: "<10% of team",
                badge: "Needs Improvement",
                badgeBg: "#fee2e2",
                badgeColor: "#991b1b",
                desc: "Misses OKRs or shows clear values gaps. This is a signal to act — not a label to park. The goal is recovery, not removal.",
                consequences: [
                  "No merit increase",
                  "Vesting and continuation reviewed",
                  "Documented feedback chain starts",
                  "PIP if gap persists",
                ],
              },
            ].map((r) => (
              <div
                key={r.name}
                style={{
                  borderRadius: 12,
                  border: `2px solid ${r.border}`,
                  background: r.bg,
                  padding: 20,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 22, fontWeight: 700, color: "#0a1628" }}>
                    {r.name}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, background: r.badgeBg, color: r.badgeColor, padding: "2px 8px", borderRadius: 10 }}>
                    {r.badge}
                  </span>
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "#6b7a99", marginBottom: 8 }}>{r.share}</div>
                <p style={{ fontSize: 12.5, color: "#334155", lineHeight: 1.6, marginBottom: 14 }}>{r.desc}</p>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7a99", marginBottom: 6 }}>Consequences</div>
                <ul style={{ paddingLeft: 0, margin: 0, listStyle: "none" }}>
                  {r.consequences.map((c) => (
                    <li key={c} style={{ fontSize: 12, color: "#475569", padding: "3px 0", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: r.border, display: "inline-block", flexShrink: 0 }} />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* The Cycle */}
          <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e5e9f0", padding: 28 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#0a1628", marginBottom: 20 }}>The Performance Cycle</div>
            <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto" }}>
              {[
                { month: "January", label: "Set OKRs", desc: "3-5 objectives + dev goals" },
                { month: "Monthly", label: "1:1 Check-ins", desc: "Progress + blockers" },
                { month: "June", label: "Mid-Year Review", desc: "Formal cycle + H2 OKRs" },
                { month: "Monthly", label: "1:1 Check-ins", desc: "Progress + blockers" },
                { month: "December", label: "Full Cycle", desc: "360 + merit + promotions" },
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", flex: "1 0 auto" }}>
                  <div style={{ textAlign: "center", minWidth: 100 }}>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {step.month}
                    </div>
                    <div style={{
                      background: i === 0 || i === 4 ? "#0f2140" : i === 2 ? "#d4a843" : "#e5e9f0",
                      color: i === 0 || i === 4 ? "white" : i === 2 ? "white" : "#475569",
                      borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 600, marginBottom: 4,
                    }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7a99", lineHeight: 1.4 }}>{step.desc}</div>
                  </div>
                  {i < 4 && (
                    <div style={{ flex: 1, height: 2, background: "#e5e9f0", margin: "0 4px", marginTop: -16 }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, padding: "10px 14px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
              <p style={{ fontSize: 12, color: "#92400e" }}>
                <strong>50% WHAT + 50% HOW</strong> — OKR results (what you shipped) + how you lived the four values (Ownership, Agility, Impact, Craft). A perfect OKR score with values violations is not a Thinker.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
