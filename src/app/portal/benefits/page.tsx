"use client";
import { useEffect } from "react";

interface BenefitCard { icon: string; title: string; details: { label: string; value: string }[]; note?: string; color: string; }

const BENEFITS: BenefitCard[] = [
  {
    icon: "🏥",
    title: "Medical Insurance",
    color: "#22c55e",
    details: [
      { label: "Coverage", value: "Comprehensive medical for all permanent employees" },
      { label: "Eligibility", value: "From day one of employment" },
      { label: "Provider", value: "Administered by People Team — contact people@think-ai.com for your card" },
    ],
    note: "Questions about coverage or claims? Reach out to the People Team.",
  },
  {
    icon: "💻",
    title: "Laptop — Bring Your Own Device",
    color: "#3b82f6",
    details: [
      { label: "Policy", value: "BYOL (Bring Your Own Laptop)" },
      { label: "Allowance", value: "One-time allowance of up to USD 900 (SAR 3,375) toward your device" },
      { label: "How to claim", value: "Submit receipt to people@think-ai.com after purchase" },
      { label: "Device spec", value: "Any modern laptop that meets your role requirements" },
    ],
    note: "Allowance is a one-time payment, not recurring. Receipt required for reimbursement.",
  },
  {
    icon: "✈️",
    title: "Relocation Support",
    color: "#8b5cf6",
    details: [
      { label: "Eligible", value: "All colleagues relocating from their home country to KSA" },
      { label: "Grant",  value: "One month basic salary upon joining" },
      { label: "Dependents", value: "+10% per dependent (e.g. 2 dependents = 20% additional)" },
      { label: "Qualifying", value: "Must be moving from home country — not applicable to those already in KSA" },
    ],
    note: "Coordinate with People Team before your move to confirm eligibility.",
  },
  {
    icon: "🌟",
    title: "Equity (ESOP)",
    color: "#f59e0b",
    details: [
      { label: "Who is eligible", value: "Associates (L5+) and above on non-tech track; Engineers (L7+) on tech track" },
      { label: "Vesting", value: "4-year vest with 1-year cliff — 25% after year one, monthly thereafter" },
      { label: "Pool", value: "Employee ESOP pool of up to 10–11% of the company" },
      { label: "Questions", value: "Individual grant details are discussed during offer — contact your hiring manager" },
    ],
    note: "Equity grant specifics are handled at the offer stage and are confidential per individual.",
  },
  {
    icon: "📅",
    title: "Leave Policy",
    color: "#06b6d4",
    details: [
      { label: "Annual Leave", value: "Per Saudi Labor Law — 21 days/year (increasing to 30 days after 5 years)" },
      { label: "Public Holidays", value: "KSA official holidays observed" },
      { label: "Sick Leave", value: "As per Saudi Labor Law provisions" },
      { label: "Requesting leave", value: "Via your manager — see HR Handbook for full policy" },
    ],
  },
  {
    icon: "🤝",
    title: "People & Culture",
    color: "#ec4899",
    details: [
      { label: "Values", value: "Ownership · Agility · Impact · Craft" },
      { label: "Performance cycle", value: "Annual review against OKRs (50% WHAT) and values (50% HOW)" },
      { label: "Culture", value: "Flat structure, high autonomy, outcome-driven" },
      { label: "Support", value: "Open-door policy — People Team available at people@think-ai.com" },
    ],
  },
];

export default function BenefitsPage() {
  useEffect(() => { document.title = "Benefits — THINK-AI Portal"; }, []);

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg, #050d1a 0%, #0f2140 50%)", padding: "28px 40px 24px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#93c5fd", marginBottom: 6 }}>Employee Portal</div>
        <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 28, fontWeight: 600, color: "white", margin: 0 }}>Benefits & Perks</h1>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>What we offer every THINK-AI colleague</p>
      </div>

      <div style={{ padding: "28px 40px" }}>
        <div style={{ maxWidth: 860 }}>
          <div style={{ marginBottom: 20, padding: "14px 18px", background: "#f0f7ff", borderRadius: 10, fontSize: 13, color: "#1e40af", border: "1px solid #bfdbfe" }}>
            For questions about any benefit or to request support, contact the People Team at <strong>people@think-ai.com</strong>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 18 }}>
            {BENEFITS.map(b => (
              <div key={b.title} style={{
                background: "white", borderRadius: 14, padding: "22px 22px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: "1px solid #f0f4f8",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, fontSize: 22,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: `${b.color}15`,
                  }}>
                    {b.icon}
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0a1628", margin: 0 }}>{b.title}</h3>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {b.details.map(d => (
                    <div key={d.label} style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 8, fontSize: 12.5 }}>
                      <span style={{ color: "#94a3b8", fontWeight: 600 }}>{d.label}</span>
                      <span style={{ color: "#374151", lineHeight: 1.5 }}>{d.value}</span>
                    </div>
                  ))}
                </div>

                {b.note && (
                  <div style={{ marginTop: 14, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, fontSize: 11.5, color: "#64748b", lineHeight: 1.5 }}>
                    ℹ {b.note}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 28, padding: "18px 20px", background: "#0a1628", borderRadius: 12, color: "white" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: "#e8c97a" }}>Questions about your benefits?</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
              Contact the People Team at <span style={{ color: "#93c5fd" }}>people@think-ai.com</span> — we typically respond within one business day.<br />
              For urgent matters, reach your manager or HR directly.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
