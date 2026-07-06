"use client";
import { useEffect, useState } from "react";

interface Article { id: string; title: string; content: string; category: string; createdAt: string; }

const CAT_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  policy:      { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  compliance:  { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  culture:     { bg: "#faf5ff", color: "#7c3aed", border: "#e9d5ff" },
  compensation:{ bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
  general:     { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
  role:        { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  onboarding:  { bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0" },
  benefits:    { bg: "#fdf4ff", color: "#86198f", border: "#f0abfc" },
};
function catStyle(cat: string) {
  return CAT_COLORS[cat.toLowerCase()] ?? CAT_COLORS.general;
}
function boldify(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
}
function renderContent(text: string) {
  return text.split("\n").map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} style={{ height: 8 }} />;
    if (trimmed.startsWith("# ")) return <h3 key={i} style={{ fontSize: 15, fontWeight: 700, color: "#0a1628", margin: "16px 0 6px" }}>{trimmed.slice(2)}</h3>;
    if (trimmed.startsWith("## ")) return <h4 key={i} style={{ fontSize: 13.5, fontWeight: 700, color: "#1e3a5f", margin: "12px 0 4px" }}>{trimmed.slice(3)}</h4>;
    const isBullet = /^[-•*]\s/.test(trimmed);
    const isNumber = /^\d+\.\s/.test(trimmed);
    if (isBullet || isNumber) {
      const content = isBullet ? trimmed.slice(2) : trimmed.replace(/^\d+\.\s/, "");
      return (
        <div key={i} style={{ display: "flex", gap: 8, margin: "3px 0", paddingLeft: 4 }}>
          <span style={{ color: "#64748b", flexShrink: 0, marginTop: 1 }}>{isBullet ? "•" : (trimmed.match(/^\d+/)?.[0] + ".")}</span>
          <span style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: boldify(content) }} />
        </div>
      );
    }
    return <p key={i} style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.8, margin: "2px 0" }} dangerouslySetInnerHTML={{ __html: boldify(trimmed) }} />;
  });
}
function PolicyCard({ a, open, setOpen }: { a: Article; open: string | null; setOpen: (id: string | null) => void }) {
  const cs = catStyle(a.category);
  const isOpen = open === a.id;
  return (
    <div style={{ background: "white", borderRadius: 12, border: `1px solid ${isOpen ? cs.border : "#f0f4f8"}`, boxShadow: isOpen ? "0 4px 16px rgba(0,0,0,0.07)" : "0 2px 6px rgba(0,0,0,0.04)", overflow: "hidden", transition: "border-color 0.15s" }}>
      <button onClick={() => setOpen(isOpen ? null : a.id)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 20px", background: "none", border: "none", cursor: "pointer", gap: 12, fontFamily: "Outfit, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <span style={{ fontSize: 10.5, padding: "2px 9px", borderRadius: 20, background: cs.bg, color: cs.color, border: `1px solid ${cs.border}`, fontWeight: 700, flexShrink: 0, textTransform: "capitalize" }}>{a.category}</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#0a1628", textAlign: "left" }}>{a.title}</span>
        </div>
        <span style={{ color: "#94a3b8", fontSize: 11, flexShrink: 0 }}>{isOpen ? "▲ Close" : "▼ Read"}</span>
      </button>
      {isOpen && (
        <div style={{ padding: "0 20px 22px", borderTop: `1px solid ${cs.border}` }}>
          <div style={{ paddingTop: 16 }}>{renderContent(a.content)}</div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>Last updated: {new Date(a.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
            <button onClick={() => window.print()} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Outfit, sans-serif" }}>🖨 Print</button>
          </div>
        </div>
      )}
    </div>
  );
}
export default function HandbookPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [cat, setCat]           = useState("All");
  const [open, setOpen]         = useState<string | null>(null);
  useEffect(() => {
    document.title = "HR Handbook — THINK-AI Portal";
    fetch("/api/portal/handbook").then(r => r.json()).then(setArticles).finally(() => setLoading(false));
  }, []);
  const cats     = ["All", ...Array.from(new Set(articles.map(a => a.category))).sort()];
  const filtered = articles.filter(a => {
    const q = search.toLowerCase();
    return (!q || a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)) && (cat === "All" || a.category === cat);
  });
  const grouped = filtered.reduce<Record<string, Article[]>>((acc, a) => {
    const g = a.category || "general"; if (!acc[g]) acc[g] = []; acc[g].push(a); return acc;
  }, {});
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg, #050d1a 0%, #0f2140 50%)", padding: "28px 40px 24px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#93c5fd", marginBottom: 6 }}>Employee Portal</div>
        <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 28, fontWeight: 600, color: "white", margin: 0 }}>HR Handbook</h1>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{loading ? "Loading…" : `${articles.length} polic${articles.length !== 1 ? "ies" : "y"} & guidelines`}</p>
      </div>
      <div style={{ padding: "24px 40px" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search policies…" style={{ flex: "1 1 260px", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", fontFamily: "Outfit, sans-serif", color: "#0a1628" }} onFocus={e => { e.currentTarget.style.borderColor = "#3b82f6"; }} onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {cats.map(c => { const cs = c === "All" ? { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" } : catStyle(c); const active = cat === c; return (<button key={c} onClick={() => setCat(c)} style={{ padding: "7px 14px", borderRadius: 20, border: "1.5px solid", borderColor: active ? cs.border : "#e2e8f0", background: active ? cs.bg : "white", color: active ? cs.color : "#6b7a99", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Outfit, sans-serif", textTransform: "capitalize" }}>{c}</button>); })}
          </div>
        </div>
        {loading ? (<div style={{ color: "#94a3b8", padding: 40, textAlign: "center" }}>Loading handbook…</div>)
        : filtered.length === 0 ? (<div style={{ padding: 48, textAlign: "center", background: "#f8fafc", borderRadius: 14, color: "#94a3b8" }}>{articles.length === 0 ? "No policies published yet. Policies added via the Knowledge Base in admin will appear here." : "No results found."}</div>)
        : cat !== "All" ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{filtered.map(a => <PolicyCard key={a.id} a={a} open={open} setOpen={setOpen} />)}</div>)
        : (<div style={{ display: "flex", flexDirection: "column", gap: 32 }}>{Object.entries(grouped).map(([grp, items]) => { const cs = catStyle(grp); return (<div key={grp}><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 20, background: cs.bg, color: cs.color, border: `1.5px solid ${cs.border}`, textTransform: "capitalize" }}>{grp}</span><span style={{ fontSize: 12, color: "#94a3b8" }}>{items.length} article{items.length !== 1 ? "s" : ""}</span><div style={{ flex: 1, height: 1, background: "#f0f4f8" }} /></div><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{items.map(a => <PolicyCard key={a.id} a={a} open={open} setOpen={setOpen} />)}</div></div>); })}</div>)}
      </div>
    </div>
  );
}
