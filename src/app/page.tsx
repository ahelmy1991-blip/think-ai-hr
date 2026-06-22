"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalEmployees: number;
  probationEmployees: number;
  expatEmployees: number;
  overdueCompliance: number;
  atRiskCompliance: number;
  totalJobs: number;
  activeJobs: number;
  totalCandidates: number;
  recentCandidates: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats);
  }, []);

  const st = stats;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="display-font">People Dashboard</h1>
          <p>THINK-AI · Riyadh, KSA — {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <Link href="/chat" className="btn btn-gold">Ask People AI</Link>
      </div>

      <div className="page-body">
        {/* Alerts */}
        {st && (st.overdueCompliance > 0 || st.atRiskCompliance > 0) && (
          <div style={{ background: "#fff8f0", border: "1px solid #fed7aa", borderRadius: 8, padding: "12px 16px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span style={{ fontSize: 14, color: "#92400e" }}>
              {st.overdueCompliance > 0 && <strong>{st.overdueCompliance} overdue</strong>}
              {st.overdueCompliance > 0 && st.atRiskCompliance > 0 && " and "}
              {st.atRiskCompliance > 0 && <strong>{st.atRiskCompliance} at-risk</strong>}
              {" "}compliance item{(st.overdueCompliance + st.atRiskCompliance) !== 1 ? "s" : ""} need attention.{" "}
              <Link href="/compliance" style={{ color: "#d97706", fontWeight: 600 }}>View tracker →</Link>
            </span>
          </div>
        )}

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
          <StatCard value={st?.totalEmployees ?? "—"} label="Total Team Members" color="#163058" sub={`${st?.expatEmployees ?? 0} expats · ${(st?.totalEmployees ?? 0) - (st?.expatEmployees ?? 0)} Saudi nationals`} />
          <StatCard value={st?.probationEmployees ?? "—"} label="On Probation" color="#b45309" sub="within 180-day window" />
          <StatCard value={st?.overdueCompliance ?? "—"} label="Overdue Compliance" color={st?.overdueCompliance ? "#dc2626" : "#16a34a"} sub={`${st?.atRiskCompliance ?? 0} due within 7 days`} />
          <StatCard value={st?.activeJobs ?? "—"} label="Open Roles" color="#163058" sub={`${st?.totalJobs ?? 0} total positions`} />
          <StatCard value={st?.totalCandidates ?? "—"} label="Total Candidates" color="#163058" sub={`${st?.recentCandidates ?? 0} added this month`} />
          <StatCard value="KSA" label="Primary Location" color="#b88a2a" sub="Riyadh, Saudi Arabia" />
        </div>

        {/* Quick actions */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          <div className="card">
            <div className="card-header">
              <h2>Quick Actions</h2>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <QuickAction href="/chat" icon="💬" label="Ask the HR Policy AI" desc="Get instant answers from the People Policy Handbook" />
              <QuickAction href="/employees" icon="👥" label="Add a Team Member" desc="Onboard a new hire with compliance auto-tracking" />
              <QuickAction href="/recruitment/jobs" icon="💼" label="Post a New Role" desc="Create an ATS job with smart LinkedIn search" />
              <QuickAction href="/compliance" icon="✅" label="Review Compliance Items" desc="Check WPS, GOSI, Iqama and probation deadlines" />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>HR Policy Sections</h2>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["A1", "Employment & Contracts"],
                ["B3", "Payroll & WPS"],
                ["B4", "EOSB / Gratuity"],
                ["C1", "Expatriate & Iqama"],
                ["D1", "Performance Management"],
                ["F2", "Onboarding & Offboarding"],
              ].map(([id, title]) => (
                <Link key={id} href={`/policies#${id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", textDecoration: "none" }}>
                  <span style={{ fontSize: 13.5, color: "#334155" }}>{title}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", background: "#ede9fe", padding: "2px 7px", borderRadius: 4 }}>{id}</span>
                </Link>
              ))}
              <Link href="/policies" style={{ display: "block", textAlign: "center", paddingTop: 8, fontSize: 13, color: "#6b7a99", textDecoration: "none" }}>
                View full policy handbook →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ value, label, color, sub }: { value: number | string; label: string; color: string; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function QuickAction({ href, icon, label, desc }: { href: string; icon: string; label: string; desc: string }) {
  return (
    <Link href={href} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 12px", background: "#f8fafc", borderRadius: 8, textDecoration: "none", border: "1px solid #e5e9f0", transition: "all 0.15s" }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1a2540" }}>{label}</div>
        <div style={{ fontSize: 12, color: "#6b7a99", marginTop: 1 }}>{desc}</div>
      </div>
    </Link>
  );
}
