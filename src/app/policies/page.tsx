"use client";
import { useState } from "react";
import { POLICY_SECTIONS, POLICY_TEXT } from "@/lib/policy";

export default function PoliciesPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [notionLoading, setNotionLoading] = useState(false);
  const [notionUrl, setNotionUrl] = useState("");

  const filtered = POLICY_SECTIONS.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase())
  );

  function extractSection(sectionId: string): string {
    const lines = POLICY_TEXT.split("\n");
    // "Part 1" → look for "PART 1:", others → look for "SECTION A1:" etc.
    let searchTerm: string;
    if (sectionId.startsWith("Part ")) {
      searchTerm = `PART ${sectionId.replace("Part ", "")}:`;
    } else if (sectionId === "G") {
      searchTerm = `SECTION G:`;
    } else {
      searchTerm = `SECTION ${sectionId}:`;
    }
    const startIdx = lines.findIndex((l) => l.toUpperCase().includes(searchTerm.toUpperCase()));
    if (startIdx === -1) return `Section ${sectionId} — content not found in policy text.`;
    // Find next ━━━ divider line
    const endIdx = lines.findIndex((l, i) => i > startIdx + 2 && l.startsWith("━"));
    const sectionLines = endIdx === -1 ? lines.slice(startIdx) : lines.slice(startIdx, endIdx);
    return sectionLines.join("\n").trim();
  }

  async function exportToNotion() {
    setNotionLoading(true);
    try {
      const r = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "policy_index" }),
      });
      const data = await r.json();
      if (data.url) setNotionUrl(data.url);
      else alert("Export failed: " + (data.error || "Unknown error"));
    } catch {
      alert("Export failed");
    }
    setNotionLoading(false);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="display-font">Policy Browser</h1>
          <p>THINK-AI People Policy Handbook v1.0 — effective 1 July 2026</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {notionUrl && (
            <a href={notionUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
              Open in Notion
            </a>
          )}
          <button className="btn btn-outline btn-sm" onClick={exportToNotion} disabled={notionLoading}>
            {notionLoading ? "Exporting..." : "Export to Notion"}
          </button>
        </div>
      </div>

      <div className="page-body" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 }}>
        {/* Section list */}
        <div>
          <div style={{ marginBottom: 12 }}>
            <input className="form-input" placeholder="Search sections..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="card" style={{ overflow: "hidden" }}>
            {filtered.map((s) => (
              <button key={s.id}
                onClick={() => { setActiveId(s.id); document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: "smooth" }); }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", border: "none", background: activeId === s.id ? "#eff6ff" : "transparent", cursor: "pointer", textAlign: "left", borderBottom: "1px solid #f1f5f9", transition: "background 0.1s" }}>
                <span style={{ fontSize: 16 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: activeId === s.id ? "#1d4ed8" : "#334155" }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Section {s.id}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="card">
          <div className="card-body" style={{ padding: "28px 32px" }}>
            {POLICY_SECTIONS.map((s) => (
              <div key={s.id} id={`section-${s.id}`} style={{ marginBottom: 40, paddingBottom: 40, borderBottom: "1px solid #e5e9f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 24 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Section {s.id}</div>
                    <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 22, color: "#0f2140", fontWeight: 600 }}>{s.title}</h2>
                  </div>
                </div>
                <pre style={{ fontFamily: "Outfit, sans-serif", fontSize: 13.5, lineHeight: 1.7, color: "#334155", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {extractSection(s.id)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
