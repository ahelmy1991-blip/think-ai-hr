"use client";
import { useEffect, useState } from "react";

interface Employee { name: string; email: string; role: string; level: string; department: string; startDate: string; isExpat: boolean; }
interface Profile { [key: string]: string | boolean | null; }

const STEPS = [
  { id: "welcome",    label: "Welcome",           icon: "👋" },
  { id: "personal",   label: "Personal Info",     icon: "👤" },
  { id: "identity",   label: "Identity & Visa",   icon: "🪪" },
  { id: "compliance", label: "Saudi Compliance",  icon: "🛡️" },
  { id: "emergency",  label: "Emergency Contact", icon: "🚨" },
  { id: "banking",    label: "Banking & Payroll", icon: "🏦" },
  { id: "medical",    label: "Medical Insurance", icon: "🏥" },
  { id: "review",     label: "Review & Submit",   icon: "✔" },
];

const F: React.CSSProperties = { width: "100%", padding: "10px 13px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "Arial,Helvetica,sans-serif", boxSizing: "border-box", color: "#1a2540", outline: "none" };
const L: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 5 };
const G2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };

function Field({ label, name, form, setForm, type = "text", required = false, placeholder = "" }: {
  label: string; name: string; form: Record<string, string>; setForm: (f: Record<string, string>) => void;
  type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label style={L}>{label}{required && " *"}</label>
      <input type={type} style={F} value={form[name] ?? ""} required={required}
        placeholder={placeholder}
        onChange={e => setForm({ ...form, [name]: e.target.value })} />
    </div>
  );
}

function Select({ label, name, form, setForm, options, required = false }: {
  label: string; name: string; form: Record<string, string>; setForm: (f: Record<string, string>) => void;
  options: string[]; required?: boolean;
}) {
  return (
    <div>
      <label style={L}>{label}{required && " *"}</label>
      <select style={F} value={form[name] ?? ""} onChange={e => setForm({ ...form, [name]: e.target.value })}>
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, name, form, setForm, hint }: {
  label: string; name: string; form: Record<string, string>; setForm: (f: Record<string, string>) => void; hint?: string;
}) {
  return (
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${form[name] === "true" ? "#2F6FFF" : "#e2e8f0"}`, background: form[name] === "true" ? "#eff6ff" : "white" }}>
      <input type="checkbox" checked={form[name] === "true"} onChange={e => setForm({ ...form, [name]: String(e.target.checked) })} style={{ marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</div>
        {hint && <div style={{ fontSize: 11.5, color: "#6b7a99", marginTop: 2 }}>{hint}</div>}
      </div>
    </label>
  );
}

export default function OnboardingPage({ params }: { params: { token: string } }) {
  const [step, setStep]           = useState(0);
  const [employee, setEmployee]   = useState<Employee | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);

  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/onboarding/form/${params.token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setEmployee(d.employee);
        const pre: Record<string, string> = {};
        for (const [k, v] of Object.entries(d.profile ?? {})) {
          if (v !== null && v !== undefined) pre[k] = String(v);
        }
        pre.full_name_english = d.employee.name;
        pre.is_saudi = d.employee.isExpat ? "false" : "true";
        setForm(pre);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load onboarding form."); setLoading(false); });
  }, [params.token]);

  async function submit() {
    setSubmitting(true);
    const payload: Record<string, unknown> = { ...form };
    for (const k of Object.keys(form)) {
      if (form[k] === "true") payload[k] = true;
      else if (form[k] === "false") payload[k] = false;
    }
    const r = await fetch(`/api/onboarding/form/${params.token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (r.ok) { setDone(true); }
    else { alert("Submission failed — please try again or contact people@think-ai.com"); }
    setSubmitting(false);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial,Helvetica,sans-serif", color: "white" }}>
      Loading your onboarding form…
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial,Helvetica,sans-serif" }}>
      <div style={{ textAlign: "center", color: "white" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{error}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>Contact people@think-ai.com for a new link.</div>
      </div>
    </div>
  );

  if (done) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0A0A0F,#14141C)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial,Helvetica,sans-serif", padding: 24 }}>
      <div style={{ background: "white", borderRadius: 24, padding: "48px 40px", maxWidth: 480, textAlign: "center", boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <div style={{ fontFamily: "Arial,Helvetica,sans-serif", fontSize: 28, fontWeight: 700, color: "#0A0A0F", marginBottom: 12 }}>
          You&apos;re all set, {employee?.name?.split(" ")[0]}!
        </div>
        <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.7, marginBottom: 20 }}>
          Your onboarding details have been submitted to the People team. We&apos;ll review your information and be in touch about next steps before your start date.
        </div>
        <div style={{ padding: "14px 20px", background: "#f0fdf4", borderRadius: 12, fontSize: 13, color: "#16a34a", fontWeight: 600 }}>
          ✔ All information received — check your email for confirmation
        </div>
        <div style={{ marginTop: 20, fontSize: 12, color: "#94a3b8" }}>Questions? Email people@think-ai.com</div>
      </div>
    </div>
  );

  const isSaudi = form.is_saudi === "true";
  const isExpat = !isSaudi;

  return (
    <div style={{ minHeight: "100vh", background: "#F7F5F0", fontFamily: "Arial,Helvetica,sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0A0A0F,#14141C)", padding: "24px 32px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ fontFamily: "Arial,Helvetica,sans-serif", fontSize: 22, fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>
            think<span style={{ color: "#2F6FFF" }}>ai</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>Employee Onboarding — Confidential</div>
          {employee && (
            <div style={{ marginTop: 14, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span style={{ background: "rgba(255,255,255,0.1)", padding: "5px 12px", borderRadius: 20, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>👤 {employee.name}</span>
              <span style={{ background: "rgba(255,255,255,0.1)", padding: "5px 12px", borderRadius: 20, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>💼 {employee.role} · {employee.level}</span>
              <span style={{ background: "rgba(255,255,255,0.1)", padding: "5px 12px", borderRadius: 20, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>🏢 {employee.department}</span>
            </div>
          )}
        </div>
      </div>

      {/* Step progress */}
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "0 32px", overflowX: "auto" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", gap: 0 }}>
          {STEPS.map((s, i) => (
            <button key={s.id} onClick={() => i < step ? setStep(i) : undefined}
              style={{ padding: "12px 16px", border: "none", background: "none", cursor: i <= step ? "pointer" : "default",
                fontSize: 12, fontWeight: 700, fontFamily: "Arial,Helvetica,sans-serif", flexShrink: 0,
                color: step === i ? "#2F6FFF" : i < step ? "#16a34a" : "#94a3b8",
                borderBottom: step === i ? "2px solid #2F6FFF" : i < step ? "2px solid #16a34a" : "2px solid transparent",
              }}>
              {i < step ? "✔ " : ""}{s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div style={{ maxWidth: 760, margin: "32px auto", padding: "0 24px" }}>
        <div style={{ background: "white", borderRadius: 16, padding: "32px 36px", boxShadow: "0 4px 20px rgba(0,0,0,0.07)" }}>

          {/* STEP 0: Welcome */}
          {step === 0 && (
            <div>
              <div style={{ fontFamily: "Arial,Helvetica,sans-serif", fontSize: 26, fontWeight: 700, color: "#0A0A0F", marginBottom: 8 }}>
                Welcome to THINK-AI, {employee?.name?.split(" ")[0]}! 👋
              </div>
              <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.8, marginBottom: 20 }}>
                This onboarding form collects the information we need to get you fully set up before your start date — employment files, GOSI registration, medical insurance, payroll, and compliance.
              </p>
              <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
                <div style={{ fontWeight: 700, color: "#16a34a", marginBottom: 10, fontSize: 13 }}>What you&apos;ll need:</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, color: "#374151" }}>
                  {[
                    isSaudi ? "National ID (Hawiya)" : "Iqama / Passport",
                    isSaudi ? "GOSI registration details" : "Visa / Border No.",
                    "Bank account IBAN", "Emergency contact details",
                    "Personal mobile number", "Date of birth",
                  ].map(i => <div key={i}>✔ {i}</div>)}
                </div>
              </div>
              <div style={{ background: "#eff6ff", borderRadius: 12, padding: "16px 20px", marginBottom: 24, fontSize: 13, color: "#1e40af" }}>
                <strong>Privacy:</strong> All information is stored securely and used only for employment, compliance, and payroll purposes. Admin-only fields (grade, compensation) are handled separately by HR.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <input type="checkbox" id="saudi-check" checked={isSaudi}
                  onChange={e => setForm(f => ({ ...f, is_saudi: String(e.target.checked) }))} />
                <label htmlFor="saudi-check" style={{ fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                  I am a Saudi National (حصلت على الجنسية السعودية)
                </label>
              </div>
            </div>
          )}

          {/* STEP 1: Personal Info */}
          {step === 1 && (
            <div>
              <div style={{ fontFamily: "Arial,Helvetica,sans-serif", fontSize: 22, fontWeight: 700, color: "#0A0A0F", marginBottom: 20 }}>Personal Information</div>
              <div style={{ ...G2, marginBottom: 16 }}>
                <Field label="Full Name (English)" name="full_name_english" form={form} setForm={setForm} required placeholder="As on ID / passport" />
                <Field label="Full Name (Arabic)" name="full_name_arabic" form={form} setForm={setForm} placeholder="كما هو في الهوية" />
                <Field label="Date of Birth" name="date_of_birth" form={form} setForm={setForm} type="date" required />
                <Select label="Gender" name="gender" form={form} setForm={setForm} options={["Male","Female"]} required />
                <Select label="Marital Status" name="marital_status" form={form} setForm={setForm} options={["Single","Married","Divorced","Widowed"]} required />
                <Field label="Nationality" name="nationality" form={form} setForm={setForm} required placeholder="e.g. Saudi, Egyptian, British" />
                <Field label="Religion" name="religion" form={form} setForm={setForm} placeholder="e.g. Muslim, Christian" />
                <Field label="Personal Email" name="personal_email" form={form} setForm={setForm} type="email" placeholder="Your personal email" />
                <Field label="Mobile (with country code)" name="mobile" form={form} setForm={setForm} required placeholder="+966 5X XXX XXXX" />
                <Select label="City / Region" name="city_region" form={form} setForm={setForm} options={["Riyadh","Jeddah","Dammam / Al Khobar","Mecca","Medina","NEOM","Other"]} required />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={L}>Home Address</label>
                <textarea style={{ ...F, minHeight: 70, resize: "vertical" }} value={form.home_address ?? ""}
                  onChange={e => setForm(f => ({ ...f, home_address: e.target.value }))} placeholder="Full home address" />
              </div>
            </div>
          )}

          {/* STEP 2: Identity & Visa */}
          {step === 2 && (
            <div>
              <div style={{ fontFamily: "Arial,Helvetica,sans-serif", fontSize: 22, fontWeight: 700, color: "#0A0A0F", marginBottom: 20 }}>
                Identity &amp; {isSaudi ? "National ID" : "Visa Documents"}
              </div>
              {isSaudi ? (
                <div style={{ ...G2, marginBottom: 16 }}>
                  <Field label="National ID Number (Hawiya)" name="national_id" form={form} setForm={setForm} required placeholder="10-digit ID number" />
                  <Field label="GOSI Number (if known)" name="gosi_number" form={form} setForm={setForm} placeholder="GOSI member number" />
                </div>
              ) : (
                <>
                  <div style={{ ...G2, marginBottom: 16 }}>
                    <Field label="Iqama Number" name="iqama_number" form={form} setForm={setForm} placeholder="If already issued" />
                    <Field label="Iqama Expiry Date" name="iqama_expiry" form={form} setForm={setForm} type="date" />
                    <Field label="Border Number" name="border_number" form={form} setForm={setForm} placeholder="If no Iqama yet" />
                    <Select label="Visa Type" name="visa_type" form={form} setForm={setForm} options={["Work Visa","Transfer","Dependent","Other"]} />
                    <Field label="Passport Number" name="passport_number" form={form} setForm={setForm} required placeholder="As in passport" />
                    <Field label="Passport Expiry" name="passport_expiry" form={form} setForm={setForm} type="date" required />
                    <Field label="Sponsor / Unified Number" name="sponsor_unified_no" form={form} setForm={setForm} placeholder="Employer unified number" />
                  </div>
                </>
              )}
              <div style={{ padding: "14px 16px", background: "#fff7ed", borderRadius: 10, fontSize: 12.5, color: "#c2410c" }}>
                ⚠️ Please submit a clear copy of your {isSaudi ? "National ID (both sides)" : "Iqama/Passport"} to people@think-ai.com within your first week.
              </div>
            </div>
          )}

          {/* STEP 3: Saudi Compliance */}
          {step === 3 && (
            <div>
              <div style={{ fontFamily: "Arial,Helvetica,sans-serif", fontSize: 22, fontWeight: 700, color: "#0A0A0F", marginBottom: 8 }}>Saudi Compliance Registrations</div>
              <p style={{ fontSize: 13, color: "#6b7a99", marginBottom: 20 }}>These government registrations are required by Saudi Labor Law. HR will assist with any that are not yet registered.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                <Toggle label="GOSI — General Organization for Social Insurance" name="gosi_registered" form={form} setForm={setForm} hint="Required for all employees. HR will register you if not yet done." />
                <Toggle label="SANED — Unemployment Insurance (التأمين ضد التعطل)" name="saned_registered" form={form} setForm={setForm} hint="Mandatory for all KSA-based employees since 2022." />
                <Toggle label="Absher — Digital Identity Platform" name="absher_linked" form={form} setForm={setForm} hint="Required for visa/Iqama management. Download the Absher app." />
                <Toggle label="Qiwa — Labor Market Platform" name="qiwa_registered" form={form} setForm={setForm} hint="Required for Saudization compliance and work permits." />
                <Toggle label="Mudad — Wage Protection System" name="mudad_linked" form={form} setForm={setForm} hint="Required for payroll compliance. HR links your bank account." />
                {isExpat && <Toggle label="TAMM — Abu Dhabi Govt Services (if applicable)" name="tamm_registered" form={form} setForm={setForm} />}
              </div>

              {isSaudi && (
                <div style={{ ...G2, marginBottom: 16 }}>
                  <Field label="GOSI Number (if known)" name="gosi_number" form={form} setForm={setForm} placeholder="Your GOSI member number" />
                  <Field label="MOL File Number (if known)" name="mol_file_number" form={form} setForm={setForm} placeholder="Ministry of HR file number" />
                </div>
              )}
              {isExpat && (
                <div style={{ ...G2 }}>
                  <Field label="MOL File Number (if known)" name="mol_file_number" form={form} setForm={setForm} placeholder="Ministry of HR file number" />
                </div>
              )}

              <div style={{ marginTop: 16, padding: "14px 16px", background: "#f0f7ff", borderRadius: 10, fontSize: 12.5, color: "#1e40af" }}>
                📋 HR will initiate any registrations you haven&apos;t completed yet. If you&apos;re unsure about any of these, mark them as unchecked and our People team will guide you.
              </div>
            </div>
          )}

          {/* STEP 4: Emergency Contact */}
          {step === 4 && (
            <div>
              <div style={{ fontFamily: "Arial,Helvetica,sans-serif", fontSize: 22, fontWeight: 700, color: "#0A0A0F", marginBottom: 20 }}>Emergency Contact</div>
              <div style={{ ...G2, marginBottom: 16 }}>
                <Field label="Contact Full Name" name="emergency_name" form={form} setForm={setForm} required placeholder="e.g. Sara Al-Hassan" />
                <Select label="Relationship" name="emergency_relationship" form={form} setForm={setForm} options={["Spouse","Parent","Sibling","Child","Friend","Other"]} required />
                <Field label="Phone Number (with country code)" name="emergency_phone" form={form} setForm={setForm} required placeholder="+966 5X XXX XXXX" />
              </div>
              <div style={{ padding: "14px 16px", background: "#f8fafc", borderRadius: 10, fontSize: 12.5, color: "#4b5563" }}>
                This information is only used in medical emergencies and is never shared externally.
              </div>
            </div>
          )}

          {/* STEP 5: Banking */}
          {step === 5 && (
            <div>
              <div style={{ fontFamily: "Arial,Helvetica,sans-serif", fontSize: 22, fontWeight: 700, color: "#0A0A0F", marginBottom: 8 }}>Banking &amp; Payroll</div>
              <p style={{ fontSize: 13, color: "#6b7a99", marginBottom: 20 }}>
                Required for salary payment via Mudad (Wage Protection System). All payments are made in SAR on the 25th of each month.
              </p>
              <div style={{ ...G2, marginBottom: 16 }}>
                <Field label="Bank Name" name="bank_name" form={form} setForm={setForm} required placeholder="e.g. Al Rajhi Bank, SNB, Riyad Bank" />
                <Field label="Account Holder Name" name="account_holder_name" form={form} setForm={setForm} required placeholder="Exactly as on bank account" />
                <div style={{ gridColumn: "span 2" }}>
                  <Field label="IBAN (24-character Saudi IBAN)" name="iban" form={form} setForm={setForm} required placeholder="SA00 0000 0000 0000 0000 0000" />
                </div>
              </div>
              <div style={{ padding: "14px 16px", background: "#fff7ed", borderRadius: 10, fontSize: 12.5, color: "#c2410c" }}>
                ⚠️ Your IBAN must be registered in Saudi Arabia. International bank accounts cannot receive KSA Mudad payroll transfers.
              </div>
            </div>
          )}

          {/* STEP 6: Medical Insurance */}
          {step === 6 && (
            <div>
              <div style={{ fontFamily: "Arial,Helvetica,sans-serif", fontSize: 22, fontWeight: 700, color: "#0A0A0F", marginBottom: 8 }}>Medical Insurance</div>
              <p style={{ fontSize: 13, color: "#6b7a99", marginBottom: 20 }}>
                THINK-AI provides group medical insurance for all employees. Dependents (spouse + children) can be added at your cost. Complete this section to enroll.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                <Select label="Preferred Billing Frequency" name="billing_frequency" form={form} setForm={setForm} options={["Annual","Quarterly","Monthly"]} />
                <Toggle label="Life Insurance — Add life insurance cover" name="life_insurance" form={form} setForm={setForm} hint="Optional add-on. HR will provide premium details." />
                <Toggle label="Pre-existing Medical Conditions" name="has_pre_existing" form={form} setForm={setForm} hint="Required disclosure for the insurer. Conditions covered as per policy terms." />
              </div>
              <div style={{ padding: "14px 16px", background: "#f0fdf4", borderRadius: 10, fontSize: 12.5, color: "#16a34a", marginBottom: 16 }}>
                ✔ Your employee medical card will be ready within 5–10 business days of your start date.
              </div>
              <div style={{ padding: "14px 16px", background: "#f8fafc", borderRadius: 10, fontSize: 12.5, color: "#4b5563" }}>
                To add dependents (spouse/children) to your policy, you&apos;ll receive a separate dependent addition form from HR. Please have your dependents&apos; IDs ready.
              </div>
            </div>
          )}

          {/* STEP 7: Review */}
          {step === 7 && (
            <div>
              <div style={{ fontFamily: "Arial,Helvetica,sans-serif", fontSize: 22, fontWeight: 700, color: "#0A0A0F", marginBottom: 8 }}>Review &amp; Submit</div>
              <p style={{ fontSize: 13, color: "#6b7a99", marginBottom: 20 }}>Please review your information before submitting. You won&apos;t be able to edit after submission — contact HR to make corrections.</p>

              {[
                { title: "Personal", fields: [["Name (English)", "full_name_english"], ["Name (Arabic)", "full_name_arabic"], ["Date of Birth", "date_of_birth"], ["Gender", "gender"], ["Marital Status", "marital_status"], ["Nationality", "nationality"], ["Mobile", "mobile"], ["City", "city_region"]] as [string, string][] },
                { title: isSaudi ? "Identity" : "Identity & Visa", fields: (isSaudi
                  ? [["National ID", "national_id"]]
                  : [["Iqama No.", "iqama_number"], ["Iqama Expiry", "iqama_expiry"], ["Passport No.", "passport_number"], ["Passport Expiry", "passport_expiry"], ["Border No.", "border_number"], ["Sponsor No.", "sponsor_unified_no"]]) as [string, string][]
                },
                { title: "Emergency Contact", fields: [["Name", "emergency_name"], ["Relationship", "emergency_relationship"], ["Phone", "emergency_phone"]] as [string, string][] },
                { title: "Banking", fields: [["Bank", "bank_name"], ["Account Holder", "account_holder_name"], ["IBAN", "iban"]] as [string, string][] },
                { title: "Compliance", fields: [["GOSI", "gosi_registered"], ["SANED", "saned_registered"], ["Absher", "absher_linked"], ["Qiwa", "qiwa_registered"], ["Mudad", "mudad_linked"]] as [string, string][] },
              ].map(s => (
                <div key={s.title} style={{ marginBottom: 16, padding: "16px 20px", background: "#f8fafc", borderRadius: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#2F6FFF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{s.title}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {s.fields.map(([label, key]) => (
                      <div key={key}>
                        <span style={{ fontSize: 11, color: "#6b7a99" }}>{label}: </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: form[key] === "true" ? "#16a34a" : form[key] === "false" ? "#dc2626" : "#1a2540" }}>
                          {form[key] === "true" ? "✔ Registered" : form[key] === "false" ? "✗ Not yet" : form[key] || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, paddingTop: 20, borderTop: "1px solid #f0f4f8" }}>
            <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
              style={{ padding: "11px 24px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "white", fontSize: 13, fontWeight: 600, cursor: step === 0 ? "not-allowed" : "pointer", color: "#475569", fontFamily: "Arial,Helvetica,sans-serif" }}>
              ← Back
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>Step {step + 1} of {STEPS.length}</span>
              {step < STEPS.length - 1 ? (
                <button onClick={() => setStep(s => s + 1)}
                  style={{ padding: "11px 28px", borderRadius: 9, border: "none", background: "#2F6FFF", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Arial,Helvetica,sans-serif" }}>
                  Next →
                </button>
              ) : (
                <button onClick={submit} disabled={submitting}
                  style={{ padding: "11px 28px", borderRadius: 9, border: "none", background: submitting ? "#94a3b8" : "#16a34a", color: "white", fontSize: 13, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", fontFamily: "Arial,Helvetica,sans-serif" }}>
                  {submitting ? "Submitting…" : "✔ Submit Onboarding"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
