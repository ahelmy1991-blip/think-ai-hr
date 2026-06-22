"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AGENTS } from "@/lib/agent-config";

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

const VALUES_STRIP = [
  {
    id: "ownership",
    name: "Ownership",
    behavior: "Act without being told; take accountability end-to-end.",
    borderColor: "#0f2140",
    href: "/company#ownership",
  },
  {
    id: "agility",
    name: "Agility",
    behavior: "Make the call with incomplete information; ship in cycles.",
    borderColor: "#3b82f6",
    href: "/company#agility",
  },
  {
    id: "impact",
    name: "Impact",
    behavior: "Prioritize the highest-leverage work; outcomes, not activity.",
    borderColor: "#f59e0b",
    href: "/company#impact",
  },
  {
    id: "craft",
    name: "Craft",
    behavior: "Go deeper than the brief requires; raise the quality bar.",
    borderColor: "#8b5cf6",
    href: "/company#craft",
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats);
  }, []);

  const st = stats;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      {/* ── Hero Banner ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #050d1a 0%, #0f2140 60%, #1a3a6e 100%)",
          padding: "36px 40px 32px",
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
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold-400)", marginBottom: 8 }}>
            People Hub
          </div>
          <h1
            style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: 32,
              fontStyle: "italic",
              fontWeight: 600,
              color: "white",
              lineHeight: 1.2,
              marginBottom: 6,
            }}
          >
            AI sovereignty for the region, by the region.
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            THINK-AI &middot; Riyadh, KSA &middot; {today}
          </p>

          {st && (st.overdueCompliance > 0 || st.atRiskCompliance > 0) && (
            <div
              style={{
                marginTop: 18,
                background: "rgba(220,38,38,0.12)",
                border: "1px solid rgba(220,38,38,0.3)",
                borderRadius: 8,
                padding: "10px 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 14 }}>&#9888;</span>
              <span style={{ fontSize: 13, color: "#fca5a5" }}>
                {st.overdueCompliance > 0 && (
                  <strong>{st.overdueCompliance} overdue</strong>
                )}
                {st.overdueCompliance > 0 && st.atRiskCompliance > 0 && " and "}
                {st.atRiskCompliance > 0 && (
                  <strong>{st.atRiskCompliance} at-risk</strong>
                )}
                {" "}compliance item{(st.overdueCompliance + st.atRiskCompliance) !== 1 ? "s" : ""} need attention.{" "}
                <Link href="/compliance" style={{ color: "#fbbf24", fontWeight: 600 }}>
                  View tracker &rarr;
                </Link>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Values Strip ── */}
      <div
        style={{
          background: "white",
          borderBottom: "1px solid #e5e9f0",
          padding: "14px 40px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        {VALUES_STRIP.map((v) => (
          <Link
            key={v.id}
            href={v.href}
            style={{
              display: "block",
              padding: "12px 16px",
              borderRadius: 8,
              borderLeft: `3px solid ${v.borderColor}`,
              background: "#f8fafc",
              textDecoration: "none",
              transition: "all 0.15s",
              border: "1px solid #e5e9f0",
              borderLeftWidth: 3,
              borderLeftColor: v.borderColor,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: "#0a1628", marginBottom: 3 }}>{v.name}</div>
            <div style={{ fontSize: 11.5, color: "#6b7a99", lineHeight: 1.4 }}>{v.behavior}</div>
          </Link>
        ))}
      </div>

      {/* ── Page Body ── */}
      <div className="page-body">
        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
          <StatCard
            value={st?.totalEmployees ?? "—"}
            label="Total Team Members"
            color="#163058"
            sub={`${st?.expatEmployees ?? 0} expats · ${(st?.totalEmployees ?? 0) - (st?.expatEmployees ?? 0)} Saudi nationals`}
          />
          <StatCard
            value={st?.probationEmployees ?? "—"}
            label="On Probation"
            color="#b45309"
            sub="within 180-day window"
          />
          <StatCard
            value={st?.overdueCompliance ?? "—"}
            label="Overdue Compliance"
            color={st?.overdueCompliance ? "#dc2626" : "#16a34a"}
            sub={`${st?.atRiskCompliance ?? 0} due within 7 days`}
          />
          <StatCard
            value={st?.activeJobs ?? "—"}
            label="Open Roles"
            color="#163058"
            sub={`${st?.totalJobs ?? 0} total positions`}
          />
          <StatCard
            value={st?.totalCandidates ?? "—"}
            label="Total Candidates"
            color="#163058"
            sub={`${st?.recentCandidates ?? 0} added this month`}
          />
          <StatCard
            value="KSA"
            label="Primary Location"
            color="#b88a2a"
            sub="Riyadh, Saudi Arabia"
          />
        </div>

        {/* Lower two-column section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* AI Agents column */}
          <div className="card">
            <div className="card-header">
              <h2>Your AI Agents</h2>
              <Link href="/agents" style={{ fontSize: 12, color: "#6b7a99", textDecoration: "none" }}>
                View all &rarr;
              </Link>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {AGENTS.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents?agent=${agent.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    background: "#f8fafc",
                    borderRadius: 8,
                    textDecoration: "none",
                    border: "1px solid #e5e9f0",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = "white";
                    el.style.borderColor = "#c7d2e8";
                    el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = "#f8fafc";
                    el.style.borderColor = "#e5e9f0";
                    el.style.boxShadow = "none";
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: agent.bgColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {agent.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a2540" }}>{agent.name}</div>
                    <div style={{ fontSize: 11.5, color: "#6b7a99", marginTop: 1 }}>{agent.tagline}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Actions column */}
          <div className="card">
            <div className="card-header">
              <h2>Quick Actions</h2>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <QuickAction
                href="/chat"
                icon="&#128172;"
                label="Ask the HR Policy AI"
                desc="Get instant answers from the People Policy Handbook"
              />
              <QuickAction
                href="/employees"
                icon="&#128101;"
                label="Add a Team Member"
                desc="Onboard a new hire with compliance auto-tracking"
              />
              <QuickAction
                href="/recruitment/jobs"
                icon="&#128188;"
                label="Post a New Role"
                desc="Create an ATS job with smart LinkedIn search"
              />
              <QuickAction
                href="/compliance"
                icon="&#9989;"
                label="Review Compliance Items"
                desc="Check WPS, GOSI, Iqama and probation deadlines"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({
  value,
  label,
  color,
  sub,
}: {
  value: number | string;
  label: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && (
        <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  desc,
}: {
  href: string;
  icon: string;
  label: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "10px 12px",
        background: "#f8fafc",
        borderRadius: 8,
        textDecoration: "none",
        border: "1px solid #e5e9f0",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.background = "white";
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.background = "#f8fafc";
        el.style.boxShadow = "none";
      }}
    >
      <span style={{ fontSize: 20 }} dangerouslySetInnerHTML={{ __html: icon }} />
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1a2540" }}>{label}</div>
        <div style={{ fontSize: 12, color: "#6b7a99", marginTop: 1 }}>{desc}</div>
      </div>
    </Link>
  );
}
