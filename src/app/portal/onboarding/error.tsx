"use client";
export default function OnboardingError({ error, reset }: { error: Error; reset: () => void }) {
  console.error("[Onboarding Error]", error);
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h2 style={{ color: "#dc2626", marginBottom: 12 }}>Something went wrong loading your onboarding</h2>
      <p style={{ color: "#6b7a99", marginBottom: 20, fontSize: 14 }}>{error.message}</p>
      <button
        onClick={reset}
        style={{
          padding: "10px 24px", background: "#0a1628", color: "white",
          border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14,
        }}
      >
        Try again
      </button>
    </div>
  );
}
