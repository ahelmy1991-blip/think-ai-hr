"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { section: "Overview", links: [
    { href: "/", label: "Dashboard", icon: "⬛" },
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
      <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
          Powered by Claude · THINK-AI © 2026
        </div>
      </div>
    </aside>
  );
}
