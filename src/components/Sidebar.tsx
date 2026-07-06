"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_NAV = [
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
  { section: "Admin", links: [
    { href: "/admin", label: "Admin Panel", icon: "🔑" },
  ]},
];

const COLLEAGUE_NAV = [
  { section: "Home", links: [
    { href: "/portal", label: "My Dashboard", icon: "🏠" },
  ]},
  { section: "Company", links: [
    { href: "/portal/directory", label: "Team Directory", icon: "👥" },
    { href: "/portal/jobs", label: "Open Roles", icon: "💼" },
  ]},
  { section: "My Account", links: [
    { href: "/portal/my-profile", label: "My Profile", icon: "👤" },
    { href: "/portal/onboarding", label: "My Onboarding", icon: "🚀" },
  ]},
  { section: "Leave & Absence", links: [
    { href: "/portal/absence", label: "Apply for Leave", icon: "🌴" },
  ]},
  { section: "Resources", links: [
    { href: "/portal/handbook", label: "HR Handbook", icon: "📋" },
    { href: "/portal/benefits", label: "Benefits", icon: "🎁" },
    { href: "/portal/chat", label: "Ask HR (AI)", icon: "💬" },
  ]},
];

function SignOutButton() {
  return (
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
      onMouseEnter={(e) => { const b = e.currentTarget; b.style.background = "rgba(255,255,255,0.09)"; b.style.color = "rgba(255,255,255,0.7)"; }}
      onMouseLeave={(e) => { const b = e.currentTarget; b.style.background = "rgba(255,255,255,0.04)"; b.style.color = "rgba(255,255,255,0.45)"; }}
    >
      <span>⎋</span> Sign Out
    </button>
  );
}

function NavGroup({ section, links, pathname }: { section: string; links: { href: string; label: string; icon: string }[]; pathname: string }) {
  return (
    <div>
      <div className="nav-section-label">{section}</div>
      {links.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} className={`nav-link ${active ? "active" : ""}`}>
            <span style={{ fontSize: 14 }}>{link.icon}</span>
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  const isPortal = pathname.startsWith("/portal");

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>THINK-AI</h1>
        <p>{isPortal ? "Employee Portal" : "People Hub"}</p>
      </div>

      {isPortal && (
        <div style={{
          margin: "0 12px 4px",
          padding: "6px 10px",
          borderRadius: 6,
          background: "rgba(59,130,246,0.12)",
          border: "1px solid rgba(59,130,246,0.2)",
          fontSize: 10.5,
          color: "rgba(147,197,253,0.9)",
          fontWeight: 600,
          letterSpacing: "0.05em",
          textAlign: "center",
          textTransform: "uppercase",
        }}>
          Employee Access
        </div>
      )}

      <nav className="sidebar-nav">
        {(isPortal ? COLLEAGUE_NAV : ADMIN_NAV).map((section) => (
          <NavGroup key={section.section} section={section.section} links={section.links} pathname={pathname} />
        ))}
      </nav>

      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <SignOutButton />
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 8, textAlign: "center" }}>
          {isPortal ? "THINK-AI Employee Portal · 2026" : "Powered by Claude · THINK-AI © 2026"}
        </div>
      </div>
    </aside>
  );
}
