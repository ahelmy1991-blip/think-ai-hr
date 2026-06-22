"use client";
import { useEffect, useRef, useState } from "react";

interface Message { role: "user" | "assistant"; content: string }

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.*?)`/g, "<code style='background:#f1f5f9;padding:1px 4px;border-radius:3px;font-family:monospace;font-size:12px'>$1</code>")
    .replace(/\n/g, "<br/>");
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const SUGGESTIONS = [
    "How is EOSB calculated for a 4-year expat who resigns?",
    "What are the Ramadan working hour rules?",
    "How long is the Iqama renewal process?",
    "What is the WPS compliance deadline?",
    "When does annual leave increase to 30 days?",
    "What is the sick leave pay structure?",
  ];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function send(text?: string) {
    const q = text ?? input.trim();
    if (!q) return;
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content: q }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          sessionId,
        }),
      });
      const data = await r.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      if (data.sessionId && !sessionId) setSessionId(data.sessionId);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Something went wrong. Please try again." }]);
    }
    setLoading(false);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="display-font">Ask People</h1>
          <p>Claude-powered HR Q&A — answers from the THINK-AI People Policy Handbook</p>
        </div>
        {messages.length > 0 && (
          <button className="btn btn-outline btn-sm" onClick={() => { setMessages([]); setSessionId(null); }}>
            New Chat
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 73px)" }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 40px" }}>
          {messages.length === 0 && (
            <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
              <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 24, color: "#0f2140", marginBottom: 6 }}>
                Ask anything about THINK-AI HR policy
              </h2>
              <p style={{ fontSize: 14, color: "#6b7a99", marginBottom: 28 }}>
                I have the full People Policy Handbook — ask about leave, payroll, GOSI, EOSB, Iqama, performance, or anything else.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="btn btn-outline" style={{ textAlign: "left", fontSize: 12.5, lineHeight: 1.4, height: "auto", padding: "10px 14px" }}
                    onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                {m.role === "assistant" && (
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, paddingLeft: 4 }}>
                    People AI · THINK-AI Policy
                  </div>
                )}
                <div className={m.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <div className="chat-bubble-ai" style={{ color: "#94a3b8" }}>
                  <span>●&nbsp;</span><span style={{ animation: "pulse 1s infinite", display: "inline-block" }}>●</span><span>&nbsp;●</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {/* Input */}
        <div style={{ borderTop: "1px solid #e5e9f0", background: "white", padding: "16px 40px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", gap: 10 }}>
            <input
              className="form-input"
              placeholder="Ask about leave policy, EOSB, Iqama, WPS, performance, onboarding..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={() => send()} disabled={loading || !input.trim()}>
              Send
            </button>
          </div>
          <div style={{ maxWidth: 720, margin: "6px auto 0", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
            Answers based on the THINK-AI People Policy Handbook v1.0 · Not legal advice · Contact people@think-ai.com for case-specific guidance
          </div>
        </div>
      </div>
    </>
  );
}
