"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => { document.title = "THINK-AI People Hub — Login"; }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        const next = params.get("next") || "/";
        router.push(next);
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

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0a1628 0%, #0f2140 60%, #1a3060 100%)",
      fontFamily: "Outfit, sans-serif",
    }}>
      <div style={{
        background: "white", borderRadius: 16, padding: "48px 44px",
        width: "100%", maxWidth: 420,
        boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "#0a1628", borderRadius: 12,
            padding: "12px 20px", marginBottom: 20,
          }}>
            <span style={{ color: "#e8c97a", fontFamily: "Cormorant Garamond, serif", fontSize: 20, fontWeight: 700, letterSpacing: "0.05em" }}>
              THINK-AI
            </span>
          </div>
          <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 26, fontWeight: 600, color: "#0a1628", marginBottom: 6 }}>
            People Hub
          </h1>
          <p style={{ fontSize: 13.5, color: "#6b7a99" }}>Sign in to access the HR system</p>
        </div>

        <form onSubmit={submit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#334155", marginBottom: 6, letterSpacing: "0.03em", textTransform: "uppercase" }}>
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "12px 14px", border: `1.5px solid ${error ? "#ef4444" : "#e5e9f0"}`,
                borderRadius: 8, fontSize: 14, color: "#0a1628", outline: "none",
                fontFamily: "Outfit, sans-serif",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#d4a843"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = error ? "#ef4444" : "#e5e9f0"; }}
            />
            {error && (
              <div style={{ fontSize: 12.5, color: "#ef4444", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                <span>⚠</span> {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            style={{
              width: "100%", padding: "13px", borderRadius: 8, border: "none",
              background: loading || !password.trim() ? "#94a3b8" : "#0a1628",
              color: "white", fontSize: 14.5, fontWeight: 600, cursor: loading || !password.trim() ? "not-allowed" : "pointer",
              fontFamily: "Outfit, sans-serif", letterSpacing: "0.03em",
              transition: "background 0.15s",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: "14px 16px", background: "#f8fafc", borderRadius: 8, fontSize: 12, color: "#6b7a99", textAlign: "center" }}>
          Internal tool · THINK-AI People Team · 2026
          <br />Contact <span style={{ color: "#d4a843" }}>people@think-ai.com</span> for access
        </div>
      </div>
    </div>
  );
}
