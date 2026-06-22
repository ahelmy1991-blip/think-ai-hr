"use client";
import { useState } from "react";

const GRADES = [
  { level: "L1",  title: "Associate I",            track: "IC",        mercer: "P1",        pc: "43-45", ssco: "Skilled",     equity: "~0.01%", trackType: "ic"      },
  { level: "L2",  title: "Associate II",           track: "IC",        mercer: "P2",        pc: "46-48", ssco: "Skilled/High",equity: "~0.02%", trackType: "ic"      },
  { level: "L3",  title: "Senior Associate",       track: "IC",        mercer: "P3",        pc: "49-51", ssco: "High-Skill",  equity: "~0.04%", trackType: "ic"      },
  { level: "L4",  title: "Specialist I",           track: "IC",        mercer: "P4",        pc: "52-54", ssco: "High-Skill",  equity: "~0.06%", trackType: "ic"      },
  { level: "L5",  title: "Specialist II",          track: "IC/Mgmt",   mercer: "P4-P5 / M1",pc: "53-55",ssco: "High-Skill",  equity: "~0.10%", trackType: "fork"    },
  { level: "L6",  title: "Senior Specialist",      track: "IC/Mgmt",   mercer: "P5 / M2",   pc: "55-57",ssco: "High-Skill",  equity: "~0.15%", trackType: "fork"    },
  { level: "L7",  title: "Lead I",                 track: "Mgmt/IC",   mercer: "P5-P6 / M3",pc: "58-59",ssco: "High-Skill",  equity: "~0.20%", trackType: "mgmt"    },
  { level: "L8",  title: "Lead II",                track: "Mgmt",      mercer: "M3-M4",     pc: "60-62", ssco: "High-Skill",  equity: "~0.30%", trackType: "mgmt"    },
  { level: "L9",  title: "Principal",              track: "IC/Mgmt",   mercer: "P6 / M4",   pc: "62-64",ssco: "High-Skill",  equity: "~0.40%", trackType: "mgmt"    },
  { level: "L10", title: "Senior Principal",       track: "Sr Mgmt",   mercer: "M5",        pc: "64-66", ssco: "High-Skill",  equity: "~0.60%", trackType: "exec"    },
  { level: "L11", title: "Executive I (VP)",       track: "Executive",  mercer: "E1",        pc: "66-68", ssco: "High-Skill",  equity: "~0.80%", trackType: "exec"    },
  { level: "L12", title: "Executive II (C-Suite)", track: "Executive",  mercer: "E2",        pc: "68-70", ssco: "High-Skill",  equity: "~1.00%", trackType: "exec"    },
  { level: "L13", title: "C-Suite / CEO",          track: "Executive",  mercer: "E3",        pc: "71-73", ssco: "—",           equity: "~1.50%", trackType: "exec"    },
  { level: "L14", title: "Co-Founder",             track: "Founder",    mercer: "Founder",   pc: "—",     ssco: "—",           equity: "2-4%",   trackType: "founder" },
  { level: "L15", title: "Founder",                track: "Founder",    mercer: "Founder",   pc: "—",     ssco: "—",           equity: "Cap table",trackType: "founder"},
];

const EQUITY_PCT: Record<string, number> = {
  L1: 0.01, L2: 0.02, L3: 0.04, L4: 0.06, L5: 0.10, L6: 0.15,
  L7: 0.20, L8: 0.30, L9: 0.40, L10: 0.60, L11: 0.80, L12: 1.00, L13: 1.50,
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
    principle: "Treat it like your baby — owners, not employees.",
    behavior: "Act without being told; take accountability for outcomes end-to-end, not just your slice. Backed by equity for all.",
    color: "#0f2140",
    bg: "#e8f0fe",
    borderColor: "var(--navy-800)",
  },
  {
    id: "agility",
    num: "2",
    name: "Agility",
    principle: "Move with velocity — lean and decisive.",
    behavior: "Make the call with incomplete information; ship in cycles; decide at the lowest informed level.",
    color: "#1d4ed8",
    bg: "#dbeafe",
    borderColor: "#3b82f6",
  },
  {
    id: "impact",
    num: "3",
    name: "Impact",
    principle: "Builders, not talkers — we ship.",
    behavior: "Prioritize the highest-leverage work; key results are outcomes, not activity. Show the thing you shipped.",
    color: "#92400e",
    bg: "#fef3c7",
    borderColor: "#f59e0b",
  },
  {
    id: "craft",
    num: "4",
    name: "Craft",
    principle: "Solve the constraint others accept — go deep on the hard problem.",
    behavior: "Go deeper than the brief requires; raise the quality bar; hold the line on rigor, safety, and trust.",
    color: "#5b21b6",
    bg: "#ede9fe",
    borderColor: "#8b5cf6",
  },
];

const PAY_MIX = [
  { band: "L1–L3",   cash: 85, equity: 15, label: "High Cash / Low Equity",     desc: "New talent establishing track record" },
  { band: "L4–L6",   cash: 72, equity: 28, label: "Med-High Cash / Med Equity",  desc: "Growing specialists" },
  { band: "L7–L9",   cash: 58, equity: 42, label: "Medium Cash / High Equity",   desc: "Senior ICs and leads taking upside in ownership" },
  { band: "L10–L13", cash: 42, equity: 58, label: "Lower Base / Highest Equity", desc: "Leadership tied to company value creation" },
];

const LEVELS_DROPDOWN = ["L1","L2","L3","L4","L5","L6","L7","L8","L9","L10","L11","L12","L13"];

export default function CompanyPage() {
  const [selectedLevel, setSelectedLevel] = useState("L7");

  const equityPct = EQUITY_PCT[selectedLevel] ?? null;

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
            AI sovereignty for the region, by the region.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 28 }}>
            {[
              {
                label: "Purpose",
                text: "To reclaim the golden era of the region. To build what the Arab world has the talent to build — not to license it from elsewhere.",
              },
              {
                label: "Mission",
                text: "AI sovereignty for the region, by the region. AI we own, not rent — intelligence in software and hardware that stays in the region and compounds here.",
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
                <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
                  {v.behavior}
                </p>
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
                        color: g.trackType === "founder" ? "#92400e" : "#166534",
                        background: g.trackType === "founder" ? "#fef3c7" : "#dcfce7",
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
                IC track fork at L5: Both IC and Management paths are available from L5+. Pay bands and equity are equivalent across the fork at the same level.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: ESOP Explorer ── */}
      <section style={{ background: "white", padding: "52px 40px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 className="section-heading">Equity Ownership — ESOP</h2>
          <p className="section-sub">10% employee option pool — the financial expression of our Ownership value. Making ownership real for everyone.</p>

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
                  icon: "ALL",
                  title: "Equity for All",
                  text: "Every full-time team member receives options from Day 1 — from L1 Associates to L13 C-Suite. Ownership is not a senior privilege; it is a founding principle.",
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
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0a1628", marginBottom: 16 }}>ESOP Grant Calculator</div>

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

              {equityPct !== null ? (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: "#6b7a99", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Grant Size</div>
                    <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 36, fontWeight: 700, color: "#0f2140" }}>
                      {equityPct}% FD
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7a99" }}>of fully-diluted share capital</div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: "#6b7a99", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>4-Year Vesting Schedule</div>
                    {[
                      { year: "Year 1", pct: 25, note: "Cliff vests at month 12", color: "#0f2140" },
                      { year: "Year 2", pct: 25, note: "Annual tranche", color: "#163058" },
                      { year: "Year 3", pct: 25, note: "Annual tranche", color: "#1e4080" },
                      { year: "Year 4", pct: 25, note: "Final tranche — fully vested", color: "#d4a843" },
                    ].map((row, i) => {
                      const cumulative = (i + 1) * 25;
                      return (
                        <div key={row.year} style={{ marginBottom: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#0a1628" }}>{row.year}</span>
                              <span style={{ fontSize: 11.5, color: "#6b7a99", marginLeft: 8 }}>{row.note}</span>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: row.color }}>
                              {((equityPct * row.pct) / 100).toFixed(4)}% ({row.pct}%)
                            </span>
                          </div>
                          <div style={{ height: 8, borderRadius: 4, background: "#e5e9f0", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 4, background: row.color, width: `${cumulative}%`, transition: "width 0.4s ease" }} />
                          </div>
                        </div>
                      );
                    })}

                    <div style={{ marginTop: 16, padding: "10px 14px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
                      <p style={{ fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
                        Strike price = fair value at grant date. Good leavers retain vested options within the exercise window. Unvested options return to pool.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 13, color: "#6b7a99" }}>L14-L15 are founder-level cap table positions. Contact the board directly.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Pay Philosophy ── */}
      <section style={{ background: "#f8fafc", padding: "52px 40px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 className="section-heading">Compensation Philosophy</h2>
          <p className="section-sub">Total reward thinking — win on cash, allowances, benefits, equity, and mission.</p>

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
                icon: "360",
                title: "Total Reward",
                text: "Cash + allowances (housing, transport) + medical + L&D budget + ESOP equity. We compete on the full package, not base salary alone.",
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
                  <span style={{ fontSize: 11.5, color: "#6b7a99" }}>Cash (base + allowances)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: "var(--gold-500)" }} />
                  <span style={{ fontSize: 11.5, color: "#6b7a99" }}>Equity (ESOP)</span>
                </div>
              </div>

              {PAY_MIX.map((row) => (
                <div key={row.band} style={{ padding: "14px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "baseline" }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#0a1628", fontFamily: "Cormorant Garamond, serif" }}>{row.band}</span>
                      <span style={{ fontSize: 12.5, color: "#475569", marginLeft: 12 }}>{row.label}</span>
                    </div>
                    <span style={{ fontSize: 11.5, color: "#6b7a99" }}>{row.desc}</span>
                  </div>
                  <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", gap: 2 }}>
                    <div style={{ width: `${row.cash}%`, background: "#163058", borderRadius: "5px 0 0 5px", transition: "width 0.4s" }} />
                    <div style={{ width: `${row.equity}%`, background: "var(--gold-500)", borderRadius: "0 5px 5px 0", transition: "width 0.4s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: "#163058", fontWeight: 600 }}>{row.cash}% cash</span>
                    <span style={{ fontSize: 11, color: "#b88a2a", fontWeight: 600 }}>{row.equity}% equity</span>
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
