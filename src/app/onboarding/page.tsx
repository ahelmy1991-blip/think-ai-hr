"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ONBOARDING_PHASES } from "@/lib/onboarding-items";

interface ChecklistItem { id: string; label: string; done: boolean }
interface Checklist { id: string; phase: string; items: ChecklistItem[] }
interface Employee {
  id: string; name: string; role: string; department: string; isExpat: boolean; status: string; startDate: string;
  checklists: Checklist[];
}

export default function OnboardingPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    fetch("/api/employees").then((r) => r.json()).then((data) => {
      // Only show employees in probation/active with checklists
      setEmployees(data.filter((e: Employee) => e.status === "probation" || e.status === "active"));
    });
  }, []);

  function getProgress(checklists: Checklist[]) {
    const allItems = checklists.flatMap((c) => c.items);
    const done = allItems.filter((i) => i.done).length;
    return { done, total: allItems.length, pct: allItems.length ? Math.round((done / allItems.length) * 100) : 0 };
  }

  function daysSince(startDate: string) {
    return Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  }

  function probationPhase(days: number) {
    if (days <= 30) return { label: "Pre-boarding / Week 1", color: "#6366f1" };
    if (days <= 60) return { label: "Day 30 — Learn", color: "#0ea5e9" };
    if (days <= 90) return { label: "Day 60 — Contribute", color: "#f59e0b" };
    if (days <= 180) return { label: "Day 90 — Own", color: "#8b5cf6" };
    return { label: "Past probation window", color: "#94a3b8" };
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="display-font">Onboarding Tracker</h1>
          <p>{employees.length} active members with onboarding checklists</p>
        </div>
      </div>

      <div className="page-body">
        {employees.length === 0 && (
          <div className="card" style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
            <p>No active onboarding. <Link href="/employees" style={{ color: "#1d4ed8" }}>Add a team member</Link> to auto-generate their checklist.</p>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {employees.map((e) => {
            const days = daysSince(e.startDate);
            const prog = getProgress(e.checklists);
            const phase = probationPhase(days);
            return (
              <Link key={e.id} href={`/onboarding/${e.id}`} style={{ textDecoration: "none" }}>
                <div className="card" style={{ padding: 20, transition: "all 0.15s", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: "#0f2140" }}>{e.name}</div>
                      <div style={{ fontSize: 12.5, color: "#6b7a99", marginTop: 2 }}>{e.role} · {e.department}</div>
                    </div>
                    <span style={{ fontSize: 11, background: "#f0f9ff", color: "#0369a1", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                      Day {days}
                    </span>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11.5, color: phase.color, fontWeight: 600, marginBottom: 6 }}>
                      {phase.label}
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${prog.pct}%`, background: phase.color }} />
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                      {prog.done} / {prog.total} items complete ({prog.pct}%)
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {e.isExpat && <span className="badge badge-blue">Expat</span>}
                    {Object.keys(ONBOARDING_PHASES).map((phase) => {
                      const cl = e.checklists.find((c) => c.phase === phase);
                      if (!cl) return null;
                      const items = cl.items as ChecklistItem[];
                      const allDone = items.every((i) => i.done);
                      const anyDone = items.some((i) => i.done);
                      return (
                        <span key={phase} className={`badge ${allDone ? "badge-green" : anyDone ? "badge-amber" : "badge-gray"}`}>
                          {ONBOARDING_PHASES[phase].label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
