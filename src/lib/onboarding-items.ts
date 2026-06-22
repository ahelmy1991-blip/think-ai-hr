export interface ChecklistItem {
  id: string;
  label: string;
  owner: "people" | "manager" | "it" | "employee" | "pro";
  expatOnly?: boolean;
}

export const ONBOARDING_PHASES: Record<string, { label: string; days: string; color: string; items: ChecklistItem[] }> = {
  preboarding: {
    label: "Pre-Boarding",
    days: "Before Day 1",
    color: "#6366f1",
    items: [
      { id: "pb-01", label: "Qiwa contract generated and sent for e-signature", owner: "people" },
      { id: "pb-02", label: "Team member e-signed on Qiwa account", owner: "employee" },
      { id: "pb-03", label: "ID, certificates, photo collected", owner: "people" },
      { id: "pb-04", label: "IBAN and National Address collected", owner: "people" },
      { id: "pb-05", label: "IT accounts provisioned (email, Slack, GitHub)", owner: "it" },
      { id: "pb-06", label: "Laptop prepared and ready", owner: "it" },
      { id: "pb-07", label: "Hardware-lab access card prepared", owner: "it" },
      { id: "pb-08", label: "Buddy assigned and briefed", owner: "people" },
      { id: "pb-09", label: "30/60/90 plan drafted by manager", owner: "manager" },
      { id: "pb-10", label: "Welcome pack sent (mission, values, agenda, org map)", owner: "people" },
      { id: "pb-11", label: "GOSI registration initiated", owner: "people" },
      { id: "pb-12", label: "Added to next WPS cycle", owner: "people" },
      { id: "pb-13", label: "Medical insurance enrollment started", owner: "people" },
      { id: "pb-14", label: "Visa sponsorship process started (PRO)", owner: "pro", expatOnly: true },
      { id: "pb-15", label: "Iqama chain initiated", owner: "pro", expatOnly: true },
      { id: "pb-16", label: "Relocation support arranged (flights, accommodation)", owner: "people", expatOnly: true },
    ],
  },
  week1: {
    label: "Week 1",
    days: "Day 1–7",
    color: "#0ea5e9",
    items: [
      { id: "w1-01", label: "Welcome meeting and office/lab tour completed", owner: "manager" },
      { id: "w1-02", label: "Workspace and lab setup confirmed", owner: "it" },
      { id: "w1-03", label: "Qiwa contract walkthrough done", owner: "people" },
      { id: "w1-04", label: "Probation terms explained and understood", owner: "people" },
      { id: "w1-05", label: "Code of Conduct acknowledged and signed", owner: "people" },
      { id: "w1-06", label: "Confidentiality & IP assignment signed", owner: "people" },
      { id: "w1-07", label: "Manager 1:1 on role purpose and success metrics", owner: "manager" },
      { id: "w1-08", label: "Buddy introduction and team intros completed", owner: "manager" },
      { id: "w1-09", label: "Security & data-handling basics completed", owner: "it" },
      { id: "w1-10", label: "First small shippable task assigned", owner: "manager" },
      { id: "w1-11", label: "THINK-AI values walkthrough with real examples", owner: "manager" },
      { id: "w1-12", label: "Medical exam completed and work permit issued on Qiwa", owner: "pro", expatOnly: true },
    ],
  },
  day30: {
    label: "Day 30",
    days: "30-Day Check-in",
    color: "#10b981",
    items: [
      { id: "d30-01", label: "Productive on core tools and tech stack", owner: "manager" },
      { id: "d30-02", label: "30/60/90 goals documented and agreed by both parties", owner: "manager" },
      { id: "d30-03", label: "Required compliance training completed", owner: "employee" },
      { id: "d30-04", label: "30-day check-in conducted (People + manager)", owner: "people" },
      { id: "d30-05", label: "Written 30-day review documented and filed", owner: "people" },
      { id: "d30-06", label: "Iqama issued via Absher (target ≤30 days from entry)", owner: "pro", expatOnly: true },
      { id: "d30-07", label: "GOSI registration confirmed active", owner: "people" },
    ],
  },
  day60: {
    label: "Day 60",
    days: "Mid-Probation Review",
    color: "#f59e0b",
    items: [
      { id: "d60-01", label: "Owns at least one active deliverable independently", owner: "manager" },
      { id: "d60-02", label: "Mid-probation review documented (legally required)", owner: "people" },
      { id: "d60-03", label: "Performance vs. goals check-in conducted", owner: "manager" },
      { id: "d60-04", label: "Any concerns raised and addressed in writing", owner: "manager" },
      { id: "d60-05", label: "Access rights confirmed (code, systems, lab)", owner: "it" },
    ],
  },
  day90: {
    label: "Day 90",
    days: "Probation Completion",
    color: "#8b5cf6",
    items: [
      { id: "d90-01", label: "Team member is at role expectations", owner: "manager" },
      { id: "d90-02", label: "Probation decision made and documented (confirm/extend/exit)", owner: "people" },
      { id: "d90-03", label: "Probation decision communicated to team member", owner: "manager" },
      { id: "d90-04", label: "Onboarding formally closed in People system", owner: "people" },
      { id: "d90-05", label: "Team integration confirmed by manager", owner: "manager" },
      { id: "d90-06", label: "First performance goal checkpoint scheduled (cycle)", owner: "manager" },
    ],
  },
};

export function buildChecklist(phase: string, isExpat: boolean): ChecklistItem[] {
  const phaseData = ONBOARDING_PHASES[phase];
  if (!phaseData) return [];
  return phaseData.items.filter((item) => !item.expatOnly || isExpat);
}
