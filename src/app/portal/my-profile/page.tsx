"use client";
import { useEffect, useState } from "react";

interface Profile {
  name: string; email: string; role: string; level: string; department: string;
  status: string; startDate: string; isExpat: boolean;
  full_name_arabic: string | null; date_of_birth: string | null; gender: string | null;
  marital_status: string | null; nationality: string | null; mobile: string | null;
  city_region: string | null; personal_email: string | null; home_address: string | null;
  national_id: string | null; iqama_number: string | null; iqama_expiry: string | null;
  passport_number: string | null; passport_expiry: string | null; border_number: string | null;
  emergency_name: string | null; emergency_phone: string | null; emergency_relationship: string | null;
  bank_name: string | null; iban: string | null; account_holder_name: string | null;
  gosi_registered: boolean; saned_registered: boolean; absher_linked: boolean;
  qiwa_registered: boolean; mudad_linked: boolean; gosi_number: string | null;
  insurer_certificate_no: string | null; medical_effective_date: string | null;
  life_insurance: boolean | null;
  onboarding_completed: boolean;
  id_submitted: boolean; contract_signed: boolean; bank_details_submitted: boolean;
  medical_form_submitted: boolean; gosi_form_submitted: boolean; iqama_copy_submitted: boolean;
}

const SECT_TITLE: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 12 };
const ROW = (v: unknown) => v ? String(v) : "—";
const BOOL = (v: unknown) => v ? <span style={{ color: "#16a34a", fontWeight: 700 }}>✓ Yes</span> : <span style={{ color: "#dc2626" }}>✗ No</span>;
const INP: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "Outfit,sans-serif", boxSizing: "border-box", color: "#1a2540" };
const LBL: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#6b7a99", textTransform: "uppercase" as const, letterSpacing: "0.08em", display: "block", marginBottom: 4 };

function InfoRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ fontSize: 13, color: "#1a2540", fontWeight: 600 }}>{typeof value === "boolean" ? BOOL(value) : ROW(value)}</span>
    </div>
  );
}

export default function MyProfilePage() {
  const [email, setEmail]     = useState("");
  const [lookup, setLookup]   = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => { document.title = "My Profile — THINK-AI Portal"; }, []);

  async function lookupProfile(e?: string) {
    const target = e ?? lookup;
    if (!target) return;
    setLoading(true); setError(""); setProfile(null);
    const r = await fetch(`/api/portal/my-profile?email=${encodeURIComponent(target)}`);
    if (r.ok) {
      const d = await r.json();
      setProfile(d);
      setEditForm({ personal_email: d.personal_email ?? "", mobile: d.mobile ?? "", city_region: d.city_region ?? "", home_address: d.home_address ?? "", emergency_name: d.emergency_name ?? "", emergency_phone: d.emergency_phone ?? "", emergency_relationship: d.emergency_relationship ?? "", bank_name: d.bank_name ?? "", iban: d.iban ?? "", account_holder_name: d.account_holder_name ?? "" });
    } else { setError("Profile not found. Make sure you're using your work email."); }
    setLoading(false);
  }

  async function saveEdit() {
    setSaving(true);
    await fetch(`/api/portal/my-profile?email=${encodeURIComponent(profile!.email)}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm),
    });
    setSaveMsg("Saved ✓"); setEditing(false); setSaving(false); lookupProfile(profile!.email);
    setTimeout(() => setSaveMsg(""), 3000);
  }

  const isExpat = profile?.isExpat;

  const CHECKLIST = [
    { label: "ID / Iqama submitted", key: "id_submitted" },
    { label: "Employment contract signed", key: "contract_signed" },
    { label: "Bank details submitted", key: "bank_details_submitted" },
    { label: "Medical form submitted", key: "medical_form_submitted" },
    { label: "GOSI form submitted", key: "gosi_form_submitted" },
    ...(isExpat ? [{ label: "Iqama copy submitted", key: "iqama_copy_submitted" }] : []),
  ] as { label: string; key: keyof Profile }[];

  return (
    <div>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#050d1a 0%,#0f2140 50%)", padding: "28px 40px 0" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#93c5fd", marginBottom: 6 }}>Employee Portal</div>
        <h1 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 28, fontWeight: 600, color: "white", margin: 0 }}>My Profile</h1>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)", marginTop: 4, marginBottom: 20 }}>View your employment details, compliance status, and documents</p>
      </div>

      <div style={{ padding: "28px 40px", maxWidth: 900 }}>
        {/* Email lookup */}
        {!profile && (
          <div style={{ background: "white", borderRadius: 14, padding: 28, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", maxWidth: 480 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0a1628", marginBottom: 6 }}>Enter your work email</div>
            <div style={{ fontSize: 13, color: "#6b7a99", marginBottom: 20 }}>Use the email address you signed up with at THINK-AI.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <input type="email" style={{ ...INP, flex: 1 }} placeholder="name@think-ai.com" value={lookup}
                onChange={e => setLookup(e.target.value)}
                onKeyDown={e => e.key === "Enter" && lookupProfile()} />
              <button onClick={() => lookupProfile()} disabled={loading}
                style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#0a1628", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>
                {loading ? "…" : "View"}
              </button>
            </div>
            {error && <div style={{ marginTop: 12, fontSize: 13, color: "#dc2626" }}>{error}</div>}
          </div>
        )}

        {profile && (
          <>
            {saveMsg && <div style={{ marginBottom: 16, padding: "10px 16px", background: "#f0fdf4", borderRadius: 8, fontSize: 13, color: "#16a34a", fontWeight: 600 }}>{saveMsg}</div>}

            {/* Profile header card */}
            <div style={{ background: "white", borderRadius: 14, padding: "22px 28px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "white", fontWeight: 700 }}>
                  {profile.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#0a1628" }}>{profile.name}</div>
                  <div style={{ fontSize: 13, color: "#6b7a99" }}>{profile.role} · {profile.level} · {profile.department}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, background: profile.status === "active" ? "#f0fdf4" : "#fef3c7", color: profile.status === "active" ? "#16a34a" : "#b45309", fontWeight: 700 }}>{profile.status}</span>
                    {profile.isExpat && <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, background: "#e0e7ff", color: "#3730a3", fontWeight: 700 }}>Expat</span>}
                    {profile.onboarding_completed && <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, background: "#f0fdf4", color: "#16a34a", fontWeight: 700 }}>✓ Onboarding Complete</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setProfile(null); setLookup(""); }} style={{ padding: "8px 16px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: "white", fontSize: 12, color: "#475569", cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>Switch account</button>
                <button onClick={() => setEditing(!editing)} style={{ padding: "8px 16px", borderRadius: 7, border: "none", background: "#0a1628", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>
                  {editing ? "Cancel Edit" : "Edit Contact Info"}
                </button>
              </div>
            </div>

            {/* Onboarding checklist */}
            <div style={{ background: "white", borderRadius: 14, padding: "22px 28px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)", marginBottom: 16 }}>
              <div style={SECT_TITLE}>Onboarding Checklist</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 10 }}>
                {CHECKLIST.map(c => {
                  const done = Boolean(profile[c.key]);
                  return (
                    <div key={c.key} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", borderRadius: 8, background: done ? "#f0fdf4" : "#f8fafc" }}>
                      <span style={{ fontSize: 14 }}>{done ? "✅" : "⬜"}</span>
                      <span style={{ fontSize: 12.5, color: done ? "#16a34a" : "#6b7a99", fontWeight: done ? 600 : 400 }}>{c.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Edit form */}
            {editing && (
              <div style={{ background: "white", borderRadius: 14, padding: "22px 28px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)", marginBottom: 16, border: "2px solid #7c3aed" }}>
                <div style={SECT_TITLE}>Edit Contact & Banking Info</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  {[
                    ["Personal Email", "personal_email", "email"],
                    ["Mobile", "mobile", "tel"],
                    ["City / Region", "city_region", "text"],
                    ["Emergency Contact Name", "emergency_name", "text"],
                    ["Emergency Contact Phone", "emergency_phone", "tel"],
                    ["Emergency Relationship", "emergency_relationship", "text"],
                    ["Bank Name", "bank_name", "text"],
                    ["Account Holder Name", "account_holder_name", "text"],
                    ["IBAN", "iban", "text"],
                  ].map(([label, key, type]) => (
                    <div key={key}>
                      <label style={LBL}>{label}</label>
                      <input type={type} style={INP} value={editForm[key] ?? ""}
                        onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} />
                    </div>
                  ))}
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={LBL}>Home Address</label>
                    <textarea style={{ ...INP, minHeight: 70, resize: "vertical" }} value={editForm.home_address ?? ""}
                      onChange={e => setEditForm(f => ({ ...f, home_address: e.target.value }))} />
                  </div>
                </div>
                <button onClick={saveEdit} disabled={saving}
                  style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: saving ? "#94a3b8" : "#7c3aed", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit,sans-serif" }}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            )}

            {/* Info sections */}
            {[
              { title: "Personal Information", fields: [
                ["Full Name (Arabic)", profile.full_name_arabic], ["Date of Birth", profile.date_of_birth],
                ["Gender", profile.gender], ["Marital Status", profile.marital_status],
                ["Nationality", profile.nationality], ["Mobile", profile.mobile],
                ["Personal Email", profile.personal_email], ["City / Region", profile.city_region],
              ]},
              { title: "Identity Documents", fields: [
                ...(isExpat
                  ? [["Iqama No.", profile.iqama_number], ["Iqama Expiry", profile.iqama_expiry], ["Passport No.", profile.passport_number], ["Passport Expiry", profile.passport_expiry], ["Border No.", profile.border_number]]
                  : [["National ID", profile.national_id]]
                ),
              ]},
              { title: "Saudi Compliance", fields: [
                ["GOSI Registered", profile.gosi_registered], ["GOSI No.", profile.gosi_number],
                ["SANED", profile.saned_registered], ["Absher Linked", profile.absher_linked],
                ["Qiwa Registered", profile.qiwa_registered], ["Mudad Linked", profile.mudad_linked],
              ]},
              { title: "Banking & Payroll", fields: [
                ["Bank", profile.bank_name], ["Account Holder", profile.account_holder_name],
                ["IBAN", profile.iban ? `${profile.iban.slice(0, 6)}••••••${profile.iban.slice(-4)}` : null],
              ]},
              { title: "Medical Insurance", fields: [
                ["Insurer Certificate", profile.insurer_certificate_no], ["Effective Date", profile.medical_effective_date],
                ["Life Insurance", profile.life_insurance],
              ]},
            ].map(s => (
              <div key={s.title} style={{ background: "white", borderRadius: 14, padding: "22px 28px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)", marginBottom: 14 }}>
                <div style={SECT_TITLE}>{s.title}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16 }}>
                  {s.fields.map(([label, val]) => <InfoRow key={label as string} label={label as string} value={val} />)}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
