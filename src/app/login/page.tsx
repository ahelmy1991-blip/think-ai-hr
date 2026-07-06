"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const INPUT: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "12px 14px", borderRadius: 8, fontSize: 14,
  color: "#0a1628", outline: "none", fontFamily: "Outfit, sans-serif",
  transition: "border-color 0.15s",
};

function LoginForm() {
  const [mode, setMode]         = useState<"admin" | "colleague">("admin");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const router  = useRouter();
  const params  = useSearchParams();

  useEffect(() => { document.title = "THINK-AI People Hub – Sign In"; }, []);
  useEffect(() => { setPassword(""); setError(""); }, [mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        const data = await r.json();
        const next = params.get("next");
        if (data.role === "colleague") {
          router.push(next && next.startsWith("/portal") ? next : "/portal");
        } else {
          router.push(next && !next.startsWith("/portal") ? next : "/");
        }
      } else {
        const d = await r.json();
        setError(d.error || "Incorrect password");
        setPassword("");
      }
    } catch {
      setError("Network error — please try again");
    }
    setLoading(false);
  }

  const isColleague = mode === "colleague";

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0a1628 0%, #0f2140 60%, #1a3060 100%)",
      fontFamily: "Outfit, sans-serif", padding: 16,
    }}>
      <div style={{
        background: "white", borderRadius: 20, padding: "44px 40px",
        width: "100%", maxWidth: 440,
        boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "#0a1628", borderRadius: 12, padding: "11px 20px", marginBottom: 18,
          }}>
            <span style={{ color: "#e8c97a", fontFamily: "Cormorant Garamond, serif", fontSize: 20, fontWeight: 700, letterSpacing: "0.05em" }}>
              THINK-AI
            </span>
          </div>
          <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 26, fontWeight: 600, color: "#0a1628", marginBottom: 4 }}>
            People Hub
          </h1>
          <p style={{ fontSize: 13, color: "#6b7a99" }}>Sign in to continue</p>
        </div>

        {/* Role toggle */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
          background: "#f1f5f9", borderRadius: 10, padding: 4, marginBottom: 28,
        }}>
          {(["admin", "colleague"] as const).map(r => (
            <button key={r} onClick={() => setMode(r)} style={{
              padding: "9px 12px", borderRadius: 7, border: "none", cursor: "pointer",
              fontFamily: "Outfit, sans-serif", fontSize: 13, fontWeight: 600,
              background: mode === r ? (r === "admin" ? "#0a1628" : "#1e3a5f") : "transparent",
              color: mode === r ? "white" : "#6b7a99",
              transition: "all 0.18s",
            }}>
              {r === "admin" ? "HR / Admin" : "Employee Access"}
            </button>
          ))}
        </div>

        {/* Context banner */}
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 20, fontSize: 12.5,
          background: isColleague ? "#f0f7ff" : "#fafbfc",
          border: `1px solid ${isColleague ? "#bfdbfe" : "#e5e9f0"}`,
          color: isColleague ? "#1e40af" : "#6b7a99",
        }}>
          {isColleague
            ? "Access your profile, team directory, open roles, handbook & benefits."
            : "Full HR system access: employees, compliance, recruitment & admin tools."}
        </div>

        <form onSubmit={submit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: "block", fontSize: 12, fontWeight: 700, color: "#334155",
              marginBottom: 6, letterSpacing: "0.07em", textTransform: "uppercase",
            }}>
              {isColleague ? "Employee Access Code" : "Admin Password"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isColleague ? "Enter employee code" : "Enter admin password"}
              autoFocus
              style={{
                ...INPUT,
                border: `1.5px solid ${error ? "#ef4444" : "#e2e8f0"}`,
              }}
              onFocus={(e)  => { e.currentTarget.style.borderColor = isColleague ? "#3b82f6" : "#c8a84b"; }}
              onBlur={(e)   => { e.currentTarget.style.borderColor = error ? "#ef4444" : "#e2e8f0"; }}
            />
            {error && (
              <div style={{ fontSize: 12, color: "#ef4444", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                &#33; {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            style={{
              width: "100%", padding: "13px", borderRadius: 9, border: "none",
              background: loading || !password.trim()
                ? "#94a3b8"
                : isColleague ? "#1e3a5f" : "#0a1628",
              color: "white", fontSize: 14, fontWeight: 600,
              cursor: loading || !password.trim() ? "not-allowed" : "pointer",
              fontFamily: "Outfit, sans-serif", letterSpacing: "0.03em",
              transition: "background 0.15s",
            }}
          >
            {loading ? "Signing in…" : isColleague ? "Access Employee Portal" : "Sign In to Admin"}
          </button>
        </form>

        <div style={{ marginTop: 22, fontSize: 11.5, color: "#94a3b8", textAlign: "center", lineHeight: 1.7 }}>
          Internal tool · THINK-AI People Team · 2026
          <br />Contact <span style={{ color: "#c8a84b" }}>people@think-ai.com</span> for access
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a1628" }}>
        <div style={{ color: "#e8c97a", fontFamily: "Cormorant Garamond, serif", fontSize: 20 }}>THINK-AI</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
