"use client";
import { useEffect, useRef, useState } from "react";

interface Message { role: "user" | "assistant"; content: string; }

const SUGGESTIONS = [
  "I want to apply for annual leave 🌴",
  "How many sick days am I entitled to?",
  "How do I apply for Hajj leave?",
  "How do I claim the laptop allowance?",
  "Who qualifies for relocation support?",
  "What are THINK-AI's core values?",
  "What medical insurance am I entitled to?",
  "How does maternity leave work?",
];

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%", background: "#eff6ff",
          border: "2px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, flexShrink: 0, marginRight: 8, alignSelf: "flex-end",
        }}>💬</div>
      )}
      <div style={{
        maxWidth: "72%", padding: "12px 16px", borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        background: isUser ? "#0a1628" : "white",
        color: isUser ? "white" : "#1a2540",
        fontSize: 13.5, lineHeight: 1.65,
        boxShadow: isUser ? "none" : "0 2px 8px rgba(0,0,0,0.08)",
        border: isUser ? "none" : "1px solid #e8eef5",
        whiteSpace: "pre-wrap",
      }}>
        {msg.content}
      </div>
    </div>
  );
}

export default function PortalChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { document.title = "Ask HR — THINK-AI Portal"; }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const r = await fetch("/api/portal/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await r.json();
      let reply = data.reply || data.error || "Sorry, please try again.";
      if (data.submittedId) {
        reply += `\n\n✅ **Your leave request has been submitted!** Reference ID: **${data.submittedId}**. HR will review within 2 business days. You can track it at [My Requests](/portal/absence).`;
      }
      setMessages(m => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Network error — please try again." }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #050d1a 0%, #0f2140 50%)", padding: "22px 32px 20px", flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#93c5fd", marginBottom: 4 }}>Employee Portal</div>
        <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 24, fontWeight: 600, color: "white", margin: 0 }}>Ask HR</h1>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>AI assistant for HR policies, benefits & company questions</p>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", background: "#f8fafc" }}>
        {messages.length === 0 && (
          <div>
            <div style={{ textAlign: "center", padding: "32px 0 24px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1a2540", marginBottom: 6 }}>Hello! I'm your HR assistant.</div>
              <div style={{ fontSize: 13, color: "#6b7a99" }}>Ask me about policies, benefits, leave, onboarding, and THINK-AI's culture.</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, marginTop: 8 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  padding: "12px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0",
                  background: "white", color: "#374151", fontSize: 12.5, cursor: "pointer",
                  textAlign: "left", fontFamily: "Outfit, sans-serif", lineHeight: 1.4,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = "#93c5fd"; b.style.background = "#eff6ff"; }}
                onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = "#e2e8f0"; b.style.background = "white"; }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#eff6ff", border: "2px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginRight: 8 }}>💬</div>
            <div style={{ padding: "12px 18px", background: "white", borderRadius: "16px 16px 16px 4px", border: "1px solid #e8eef5", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: "50%", background: "#93c5fd",
                    animation: `bounce 1.2s ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ background: "white", borderTop: "1px solid #e2e8f0", padding: "16px 32px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 10, maxWidth: 800, margin: "0 auto" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask about policies, benefits, leave, culture…"
            rows={1}
            style={{
              flex: 1, padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0",
              fontSize: 13.5, color: "#1a2540", outline: "none", fontFamily: "Outfit, sans-serif",
              resize: "none", lineHeight: 1.5,
            }}
            onFocus={e  => { e.currentTarget.style.borderColor = "#3b82f6"; }}
            onBlur={e   => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading} style={{
            padding: "12px 20px", borderRadius: 10, border: "none",
            background: input.trim() && !loading ? "#0a1628" : "#94a3b8",
            color: "white", fontSize: 13, fontWeight: 600, cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            fontFamily: "Outfit, sans-serif", flexShrink: 0, transition: "background 0.15s",
          }}>
            Send
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "#94a3b8" }}>
          This assistant can answer HR policy questions — it does not have access to personal employee data.
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
