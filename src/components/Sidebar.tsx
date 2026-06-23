"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { section: "Overview", links: [
    { href: "/", label: "Dashboard", icon: "⬛" },
    { href: "/company", label: "Company & Values", icon: "🌟" },
  ]},
  { section: "AI Agents", links: [
    { href: "/agents", label: "All Agents", icon: "🤖" },
  ]},
  { section: "People Ops", links: [
    { href: "/chat", label: "Ask People (AI)", icon: "💬" },
    { href: "/employees", label: "Team Members", icon: "👥" },
    { href: "/onboarding", label: "Onboarding", icon: "🚀" },
    { href: "/compliance", label: "Compliance Tracker", icon: "✅" },
    { href: "/policies", label: "Policy Browser", icon: "📋" },
  ]},
  { section: "Recruitment", links: [
    { href: "/recruitment", label: "ATS Pipeline", icon: "🎯" },
    { href: "/recruitment/jobs", label: "Open Roles", icon: "💼" },
    { href: "/recruitment/candidates", label: "All Candidates", icon: "🔍" },
  ]},
  { section: "Integrations", links: [
    { href: "/settings", label: "Settings", icon: "⚙️" },
  ]},
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>THINK-AI</h1>
        <p>People Hub</p>
      </div>
      <nav className="sidebar-nav">
        {NAV.map((section) => (
          <div key={section.section}>
            <div className="nav-section-label">{section.section}</div>
            {section.links.map((link) => {
              const active = link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href} className={`nav-link ${active ? "active" : ""}`}>
                  <span style={{ fontSize: 14 }}>{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <button
          onClick={async () => {
            await fetch("/api/auth", { method: "DELETE" });
            window.location.href = "/login";
          }}
          style={{
            width: "100%", padding: "8px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", cursor: "pointer",
            fontSize: 12, fontFamily: "Outfit, sans-serif", display: "flex", alignItems: "center", gap: 7,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.45)"; }}
        >
          <span>⎋</span> Sign Out
        </button>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 8, textAlign: "center" }}>
          Powered by Claude · THINK-AI © 2026
        </div>
      </div>
    </aside>
  );
}
