"use client";
import { useEffect, useState } from "react";
import { ONBOARDING_PHASES } from "@/lib/onboarding-items";

interface ChecklistItem { id: string; label: string; owner: string; done: boolean; expatOnly?: boolean }
interface Checklist { id: string; phase: string; items: ChecklistItem[] }
interface Employee {
  id: string; name: string; email: string; role: string; department: string; isExpat: boolean;
  status: string; startDate: string; iqamaExpiry: string | null; checklists: Checklist[];
}

const OWNER_LABELS: Record<string, string> = { people: "People Team", manager: "Manager", it: "IT", employee: "Team Member", pro: "PRO" };
const OWNER_COLORS: Record<string, string> = { people: "#ede9fe", manager: "#dbeafe", it: "#dcfce7", employee: "#fef3c7", pro: "#fee2e2" };
const OWNER_TEXT: Record<string, string> = { people: "#7c3aed", manager: "#1d4ed8", it: "#166534", employee: "#92400e", pro: "#991b1b" };

export default function OnboardingDetailPage({ params }: { params: { id: string } }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [notionLoading, setNotionLoading] = useState(false);
  const [notionUrl, setNotionUrl] = useState("");
  const [activePhase, setActivePhase] = useState("preboarding");

  useEffect(() => {
    fetch(`/api/employees/${params.id}`).then((r) => r.json()).then(setEmployee);
  }, [params.id]);

  async function toggleItem(checklistId: string, itemId: string) {
    if (!employee) return;
    setSaving(true);
    const checklist = employee.checklists.find((c) => c.id === checklistId)!;
    const newItems = checklist.items.map((item: ChecklistItem) =>
      item.id === itemId ? { ...item, done: !item.done, doneAt: !item.done ? new Date().toISOString() : null } : item
    );
    const r = await fetch(`/api/onboarding/${checklistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: newItems }),
    });
    if (r.ok) {
      setEmployee({
        ...employee,
        checklists: employee.checklists.map((c) => c.id === checklistId ? { ...c, items: newItems } : c),
      });
    }
    setSaving(false);
  }

  async function exportToNotion() {
    setNotionLoading(true);
    const r = await fetch("/api/notion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "onboarding_checklist", id: params.id }),
    });
    const data = await r.json();
    if (data.url) setNotionUrl(data.url);
    else alert(data.error || "Export failed");
    setNotionLoading(false);
  }

  if (!employee) return <div style={{ padding: 40, color: "#94a3b8" }}>Loading...</div>;

  const allItems = employee.checklists.flatMap((c) => c.items as ChecklistItem[]);
  const done = allItems.filter((i) => i.done).length;
  const pct = allItems.length ? Math.round((done / allItems.length) * 100) : 0;
  const daysSince = Math.floor((Date.now() - new Date(employee.startDate).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="display-font">{employee.name}</h1>
          <p>{employee.role} · {employee.department} · {employee.isExpat ? "Expatriate" : "Saudi National"} · Day {daysSince}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {notionUrl && <a href={notionUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">Open in Notion</a>}
          <button className="btn btn-outline btn-sm" onClick={exportToNotion} disabled={notionLoading}>
            {notionLoading ? "Exporting..." : "Export to Notion"}
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Progress banner */}
        <div className="card" style={{ padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0f2140" }}>Overall Progress</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f2140" }}>{done}/{allItems.length} items · {pct}%</span>
              </div>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
            {employee.isExpat && employee.iqamaExpiry && (() => {
              const days = Math.ceil((new Date(employee.iqamaExpiry!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div style={{ padding: "8px 14px", background: days <= 30 ? "#fff8f0" : "#f0fdf4", border: `1px solid ${days <= 30 ? "#fed7aa" : "#bbf7d0"}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7a99", textTransform: "uppercase" }}>Iqama Expiry</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: days <= 30 ? "#d97706" : "#16a34a" }}>
                    {days > 0 ? `${days} days` : "EXPIRED"}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Phase tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {Object.keys(ONBOARDING_PHASES).map((phase) => {
            const ph = ONBOARDING_PHASES[phase];
            const cl = employee.checklists.find((c) => c.phase === phase);
            const items = (cl?.items as ChecklistItem[]) ?? [];
            const phaseDone = items.filter((i) => i.done).length;
            const phaseTotal = items.length;
            return (
              <button key={phase}
                onClick={() => setActivePhase(phase)}
                style={{
                  padding: "8px 14px", border: `2px solid ${activePhase === phase ? ph.color : "#e5e9f0"}`,
                  borderRadius: 8, background: activePhase === phase ? ph.color + "18" : "white",
                  cursor: "pointer", fontSize: 13, fontWeight: 500, color: activePhase === phase ? ph.color : "#475569",
                  transition: "all 0.15s",
                }}>
                {ph.label}
                <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>{phaseDone}/{phaseTotal}</span>
              </button>
            );
          })}
        </div>

        {/* Active phase checklist */}
        {Object.keys(ONBOARDING_PHASES).filter((p) => p === activePhase).map((phase) => {
          const ph = ONBOARDING_PHASES[phase];
          const cl = employee.checklists.find((c) => c.phase === phase);
          const items = (cl?.items as ChecklistItem[]) ?? [];
          return (
            <div key={phase} className="card">
              <div className="card-header" style={{ background: ph.color + "12" }}>
                <div>
                  <h2 style={{ color: ph.color }}>{ph.label}</h2>
                  <div style={{ fontSize: 12, color: "#6b7a99", marginTop: 2 }}>{ph.days}</div>
                </div>
                <span style={{ fontSize: 13, color: ph.color, fontWeight: 600 }}>
                  {items.filter((i) => i.done).length}/{items.length} complete
                </span>
              </div>
              <div className="card-body">
                {items.length === 0 && <p style={{ color: "#94a3b8" }}>No items for this phase.</p>}
                {items.map((item) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <input type="checkbox" checked={item.done} onChange={() => cl && toggleItem(cl.id, item.id)}
                      style={{ marginTop: 2, width: 16, height: 16, accentColor: ph.color, cursor: "pointer" }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13.5, color: item.done ? "#94a3b8" : "#1a2540", textDecoration: item.done ? "line-through" : "none" }}>
                        {item.label}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                      background: OWNER_COLORS[item.owner] ?? "#f1f5f9",
                      color: OWNER_TEXT[item.owner] ?? "#475569",
                    }}>
                      {OWNER_LABELS[item.owner] ?? item.owner}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
