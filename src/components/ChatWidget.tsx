"use client";
import { useState, useRef, useEffect, useCallback } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const QUICK_QUESTIONS = [
  "What are the grading levels?",
  "How does ESOP vesting work?",
  "Annual leave entitlement?",
  "How is EOSB calculated?",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput("");

    const history = [...msgs, { role: "user" as const, content }];
    setMsgs([...history, { role: "assistant", content: "", streaming: true }]);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          sessionId: sessionId || undefined,
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              full += data.text;
              setMsgs((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: full, streaming: true };
                return next;
              });
            }
            if (data.sessionId) setSessionId(data.sessionId);
            if (data.done || data.error) {
              setMsgs((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  role: "assistant",
                  content: data.error ? "Sorry, something went wrong. Try again." : full,
                  streaming: false,
                };
                return next;
              });
            }
          } catch {
            // malformed chunk — skip
          }
        }
      }
    } catch {
      setMsgs((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: "Sorry, something went wrong. Try again.", streaming: false };
        return next;
      });
    } finally {
      setBusy(false);
    }
  }, [input, msgs, busy, sessionId]);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Ask People AI"
        aria-label="Open HR Assistant"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9998,
          width: 54, height: 54, borderRadius: "50%",
          background: open ? "#e8c97a" : "#0a1628",
          border: `2px solid ${open ? "#0a1628" : "#e8c97a"}`,
          cursor: "pointer", boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s ease",
          color: open ? "#0a1628" : "#e8c97a",
          fontSize: 22,
        }}
      >
        {open ? "✕" : "✦"}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: "fixed", bottom: 88, right: 24, zIndex: 9997,
            width: 368, height: 530,
            borderRadius: 16, overflow: "hidden",
            background: "white",
            boxShadow: "0 12px 48px rgba(0,0,0,0.22)",
            border: "1px solid #dce3ee",
            display: "flex", flexDirection: "column",
            fontFamily: "'Outfit', sans-serif",
            animation: "widgetSlideUp 0.22s ease",
          }}
        >
          {/* Header */}
          <div style={{
            background: "#0a1628", padding: "14px 18px",
            display: "flex", alignItems: "center", gap: 11, flexShrink: 0,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(232,201,122,0.15)",
              border: "1.5px solid rgba(232,201,122,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#e8c97a", fontSize: 15, flexShrink: 0,
            }}>
              ✦
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", color: "white", fontSize: 17, fontWeight: 600, lineHeight: 1.2 }}>
                Ask People AI
              </div>
              <div style={{ fontSize: 11, color: "rgba(232,201,122,0.7)", marginTop: 1 }}>
                {busy ? "Thinking..." : "THINK-AI HR · Powered by Claude"}
              </div>
            </div>
            {msgs.length > 0 && (
              <button
                onClick={() => { setMsgs([]); setSessionId(""); }}
                title="Clear chat"
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 11, padding: "4px 8px" }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "16px",
            display: "flex", flexDirection: "column", gap: 10,
            background: "#f6f8fb",
          }}>
            {msgs.length === 0 && (
              <div style={{ textAlign: "center", padding: "8px 4px 16px" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: "#0a1628", margin: "0 auto 12px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#e8c97a", fontSize: 22,
                }}>✦</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0a1628", marginBottom: 4 }}>
                  Hi! I'm your People AI
                </div>
                <div style={{ fontSize: 12, color: "#6b7a99", marginBottom: 16, lineHeight: 1.5 }}>
                  Ask me about HR policies, levels, leave,<br />compensation, ESOP, and more.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      style={{
                        padding: "8px 12px", borderRadius: 8,
                        border: "1px solid #dce3ee", background: "white",
                        color: "#334155", fontSize: 12, cursor: "pointer",
                        textAlign: "left", transition: "all 0.15s",
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                {m.role === "assistant" && (
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: "#0a1628", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#e8c97a", fontSize: 11, marginRight: 7, marginTop: 2,
                  }}>✦</div>
                )}
                <div style={{
                  maxWidth: "76%", padding: "9px 13px",
                  borderRadius: m.role === "user"
                    ? "14px 14px 3px 14px"
                    : "3px 14px 14px 14px",
                  background: m.role === "user" ? "#0a1628" : "white",
                  color: m.role === "user" ? "white" : "#1a2540",
                  fontSize: 13, lineHeight: 1.65,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  border: m.role === "assistant" ? "1px solid #dce3ee" : "none",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {m.content || (m.streaming ? (
                    <span style={{ display: "flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
                      {[0, 1, 2].map((j) => (
                        <span key={j} style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: "#94a3b8",
                          animation: `pulse 1s ${j * 0.2}s infinite`,
                          display: "inline-block",
                        }} />
                      ))}
                    </span>
                  ) : "")}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input row */}
          <div style={{
            padding: "11px 13px", borderTop: "1px solid #dce3ee",
            display: "flex", gap: 8, background: "white", flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="Ask about policies, levels, leave..."
              disabled={busy}
              style={{
                flex: 1, padding: "9px 12px", borderRadius: 8,
                border: "1px solid #dce3ee", fontSize: 13,
                fontFamily: "'Outfit', sans-serif", outline: "none",
                background: "white", color: "#1a2540",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#0a1628")}
              onBlur={(e) => (e.target.style.borderColor = "#dce3ee")}
            />
            <button
              onClick={() => send()}
              disabled={busy || !input.trim()}
              style={{
                width: 38, height: 38, borderRadius: 8, border: "none",
                background: busy || !input.trim() ? "#e5e9f0" : "#0a1628",
                color: busy || !input.trim() ? "#94a3b8" : "#e8c97a",
                cursor: busy || !input.trim() ? "not-allowed" : "pointer",
                fontSize: 17, fontWeight: 700, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
            >
              →
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes widgetSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50%       { opacity: 1;   transform: scale(1.1);  }
        }
      `}</style>
    </>
  );
}
