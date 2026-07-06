"use client";
import { useEffect, useState } from "react";

interface Person {
  id: string; name: string; title: string; department: string;
  team: string | null; location: string;
  avatar_url: string | null; linkedin_url: string | null;
  bio: string | null; email: string | null; start_year: number | null;
  // enriched from hr_employees
  level?: string; grade?: string | null; band?: string | null;
  people_group?: string | null; team_lead?: string | null;
  is_expat?: boolean; status?: string;
}

const DEPT_COLORS: Record<string, string> = {
  Engineering: "#3b82f6", Product: "#8b5cf6", Data: "#06b6d4",
  Design: "#ec4899", People: "#22c55e", Finance: "#f59e0b",
  Legal: "#6366f1", Marketing: "#f97316", Operations: "#14b8a6",
  Leadership: "#c8a84b", Sales: "#ef4444", Research: "#10b981",
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function AvatarCircle({ person, size = 56 }: { person: Person; size?: number }) {
  const bg = DEPT_COLORS[person.department] ?? "#6b7a99";
  if (person.avatar_url) {
    return <img src={person.avatar_url} alt={person.name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `${bg}22`, border: `2px solid ${bg}55`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 700, color: bg, flexShrink: 0,
    }}>
      {initials(person.name)}
    </div>
  );
}

const FILTER_OPTIONS = ["All", "Leadership", "People", "Engineering", "Product", "Data", "Design", "Finance", "Operations", "Sales", "Marketing"];

export default function DirectoryPage() {
  const [people, setPeople]   = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [groupFilter, setGroupFilter] = useState("All");

  useEffect(() => {
    document.title = "Team Directory — THINK-AI Portal";
    fetch("/api/portal/directory")
      .then(r => r.json())
      .then(setPeople)
      .finally(() => setLoading(false));
  }, []);

  // Build dept list from actual data
  const depts = ["All", ...Array.from(new Set(people.map(p => p.department))).sort()];
  const groups = ["All", ...Array.from(new Set(people.map(p => p.people_group).filter(Boolean) as string[])).sort()];

  const filtered = people.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q) ||
      (p.team_lead ?? "").toLowerCase().includes(q);
    const matchDept  = deptFilter  === "All" || p.department === deptFilter;
    const matchGroup = groupFilter === "All" || p.people_group === groupFilter;
    return matchSearch && matchDept && matchGroup;
  });

  const activeCount = people.filter(p => p.status !== "terminated").length;

  return (
    <div>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #050d1a 0%, #0f2140 50%)", padding: "28px 40px 24px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#93c5fd", marginBottom: 6 }}>Employee Portal</div>
        <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 28, fontWeight: 600, color: "white", margin: 0 }}>Team Directory</h1>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
          {loading ? "Loading…" : `${activeCount} colleague${activeCount !== 1 ? "s" : ""} · Riyadh, KSA`}
        </p>
      </div>

      <div style={{ padding: "24px 40px" }}>
        {/* Search + filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, title or department…"
            style={{
              flex: "1 1 240px", padding: "10px 14px", borderRadius: 8,
              border: "1.5px solid #e2e8f0", fontSize: 13, color: "#0a1628",
              outline: "none", fontFamily: "Outfit, sans-serif",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = "#3b82f6"; }}
            onBlur={e  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
          />
        </div>

        {/* Dept filter chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {depts.map(d => (
            <button key={d} onClick={() => setDeptFilter(d)} style={{
              padding: "6px 14px", borderRadius: 20, border: "1.5px solid",
              borderColor: deptFilter === d ? "#3b82f6" : "#e2e8f0",
              background: deptFilter === d ? "#eff6ff" : "white",
              color: deptFilter === d ? "#1d4ed8" : "#6b7a99",
              fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "Outfit, sans-serif",
            }}>
              {d}
            </button>
          ))}
        </div>

        {/* People group filter (secondary) */}
        {groups.length > 1 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {groups.map(g => (
              <button key={g} onClick={() => setGroupFilter(g)} style={{
                padding: "4px 12px", borderRadius: 20, border: "1.5px solid",
                borderColor: groupFilter === g ? "#7c3aed" : "#e2e8f0",
                background: groupFilter === g ? "#f5f3ff" : "white",
                color: groupFilter === g ? "#7c3aed" : "#94a3b8",
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Outfit, sans-serif",
              }}>
                {g}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ color: "#94a3b8", padding: 40, textAlign: "center", fontSize: 14 }}>Loading directory…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "#94a3b8", padding: 40, textAlign: "center", fontSize: 14 }}>No results found.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
            {filtered.map(p => {
              const deptColor = DEPT_COLORS[p.department] ?? "#6b7a99";
              return (
                <div key={p.id} style={{
                  background: "white", borderRadius: 14, padding: "20px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.07)", border: "1px solid #f0f4f8",
                  transition: "all 0.18s",
                }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.boxShadow = "0 6px 24px rgba(0,0,0,0.1)"; el.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.boxShadow = "0 2px 10px rgba(0,0,0,0.07)"; el.style.transform = "translateY(0)"; }}>

                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}>
                    <AvatarCircle person={p} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#0a1628", marginBottom: 2 }}>{p.name}</div>
                      <div style={{ fontSize: 12.5, color: "#475569", marginBottom: 6, lineHeight: 1.3 }}>{p.title}</div>
                      {/* Level + grade badge */}
                      {p.level && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10, background: "#0a162812", color: "#0a1628", marginRight: 4 }}>
                          {p.level}{p.grade ? ` · ${p.grade}` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tag chips */}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                    <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: `${deptColor}18`, color: deptColor, fontWeight: 600 }}>
                      {p.department}
                    </span>
                    {p.team && (
                      <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: "#f1f5f9", color: "#64748b", fontWeight: 500 }}>
                        {p.team}
                      </span>
                    )}
                    {p.people_group && p.people_group !== "FTE" && (
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "#fef9c3", color: "#92400e", fontWeight: 600 }}>
                        {p.people_group}
                      </span>
                    )}
                    {p.is_expat && (
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "#e0f2fe", color: "#0369a1", fontWeight: 600 }}>
                        Expat
                      </span>
                    )}
                    {p.status === "probation" && (
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "#fef3c7", color: "#b45309", fontWeight: 600 }}>
                        Probation
                      </span>
                    )}
                  </div>

                  {/* Bio if available */}
                  {p.bio && <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, margin: "0 0 10px" }}>{p.bio}</p>}

                  {/* Location + start year */}
                  <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 11.5, color: "#94a3b8", flexWrap: "wrap", marginBottom: 6 }}>
                    <span>📍 {p.location}</span>
                    {p.start_year && <span>🗓 Since {p.start_year}</span>}
                  </div>

                  {/* Team lead */}
                  {p.team_lead && (
                    <div style={{ fontSize: 11, color: "#6b7a99", marginBottom: 4 }}>
                      <span style={{ color: "#94a3b8" }}>Reports to: </span>{p.team_lead}
                    </div>
                  )}

                  {/* Actions */}
                  {(p.email || p.linkedin_url) && (
                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                      {p.email && (
                        <a href={`mailto:${p.email}`} style={{
                          flex: 1, textAlign: "center", padding: "7px 10px", borderRadius: 7,
                          background: "#f8fafc", border: "1px solid #e2e8f0",
                          color: "#475569", fontSize: 12, fontWeight: 600, textDecoration: "none",
                        }}>
                          ✉ Email
                        </a>
                      )}
                      {p.linkedin_url && (
                        <a href={p.linkedin_url} target="_blank" rel="noreferrer" style={{
                          flex: 1, textAlign: "center", padding: "7px 10px", borderRadius: 7,
                          background: "#eff6ff", border: "1px solid #bfdbfe",
                          color: "#1d4ed8", fontSize: 12, fontWeight: 600, textDecoration: "none",
                        }}>
                          in LinkedIn
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
