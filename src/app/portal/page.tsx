"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Announcement {
  id: string; title: string; body: string; category: string;
  pinned: boolean; author: string; createdAt: string;
}

const CATEGORY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  general:   { bg: "#f0f9ff", color: "#0369a1", label: "General" },
  policy:    { bg: "#f0fdf4", color: "#15803d", label: "Policy" },
  culture:   { bg: "#fef9c3", color: "#a16207", label: "Culture" },
  milestone: { bg: "#fdf2f8", color: "#9333ea", label: "Milestone" },
  ops:       { bg: "#fff7ed", color: "#c2410c", label: "Operations" },
};

const QUICK_LINKS = [
  { href: "/portal/directory", icon: "👥", label: "Team Directory", desc: "Find your colleagues", bg: "#eff6ff", accent: "#3b82f6" },
  { href: "/portal/jobs",      icon: "💼", label: "Open Roles",     desc: "Explore internal openings", bg: "#f0fdf4", accent: "#22c55e" },
  { href: "/portal/handbook",  icon: "📋", label: "HR Handbook",    desc: "Policies & guidelines",  bg: "#fefce8", accent: "#eab308" },
  { href: "/portal/benefits",  icon: "🎁", label: "Benefits",       desc: "Medical, laptop & relocation", bg: "#fdf4ff", accent: "#a855f7" },
  { href: "/portal/chat",      icon: "💬", label: "Ask HR (AI)",    desc: "Instant policy answers", bg: "#fff7ed", accent: "#f97316" },
];

const VALUES = [
  { name: "Ownership",  desc: "Owners, not staff — own the outcome, not the task.", color: "#0f2140" },
  { name: "Agility",    desc: "Move with velocity — bias for action.", color: "#3b82f6" },
  { name: "Impact",     desc: "Builders, not talkers — build for the customer.", color: "#f59e0b" },
  { name: "Craft",      desc: "Go deep on the hard problem — excellence as the default.", color: "#8b5cf6" },
];

export default function PortalDashboard() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  useEffect(() => {
    document.title = "THINK-AI Employee Portal";
    fetch("/api/portal/announcements").then(r => r.json()).then(setAnnouncements).catch(() => {});
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #050d1a 0%, #0f2140 60%, #1a3a6e 100%)",
        padding: "36px 40px 32px", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#93c5fd", marginBottom: 8 }}>
            Employee Portal
          </div>
          <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 30, fontStyle: "italic", fontWeight: 600, color: "white", lineHeight: 1.2, marginBottom: 6 }}>
            Welcome to THINK-AI
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            Riyadh, KSA &middot; {today}
          </p>
        </div>
      </div>

      <div style={{ padding: "28px 40px", maxWidth: 1100 }}>
        {/* Quick links */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 36 }}>
          {QUICK_LINKS.map(l => (
            <Link key={l.href} href={l.href} style={{
              display: "block", padding: "18px 20px", borderRadius: 12,
              background: l.bg, border: `1px solid ${l.accent}22`,
              textDecoration: "none", transition: "all 0.18s",
            }}
            onMouseEnter={e => { const el = e.currentTarget; el.style.boxShadow = `0 4px 16px ${l.accent}22`; el.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.boxShadow = "none"; el.style.transform = "translateY(0)"; }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{l.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#0a1628", marginBottom: 3 }}>{l.label}</div>
              <div style={{ fontSize: 12, color: "#6b7a99" }}>{l.desc}</div>
            </Link>
          ))}
        </div>

        {/* Announcements */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", marginBottom: 16 }}>Announcements</h2>
          {announcements.length === 0 ? (
            <div style={{ padding: 20, background: "#f8fafc", borderRadius: 10, color: "#94a3b8", fontSize: 13 }}>No announcements yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {announcements.map(a => {
                const cat = CATEGORY_STYLE[a.category] ?? CATEGORY_STYLE.general;
                return (
                  <div key={a.id} style={{
                    background: "white", borderRadius: 12, padding: "18px 20px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    border: a.pinned ? "1.5px solid #e8c97a" : "1px solid #f0f4f8",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      {a.pinned && <span style={{ fontSize: 12, marginTop: 2 }}>📌</span>}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0a1628", margin: 0 }}>{a.title}</h3>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: cat.bg, color: cat.color, fontWeight: 600 }}>
                            {cat.label}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: "0 0 8px" }}>{a.body}</p>
                        <div style={{ fontSize: 11.5, color: "#94a3b8" }}>
                          {a.author} &middot; {new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Values */}
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0a1628", marginBottom: 16 }}>Our Values</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {VALUES.map(v => (
              <div key={v.name} style={{
                padding: "14px 16px", borderRadius: 10, background: "white",
                borderLeft: `3px solid ${v.color}`, boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#0a1628", marginBottom: 4 }}>{v.name}</div>
                <div style={{ fontSize: 12, color: "#6b7a99", lineHeight: 1.5 }}>{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
