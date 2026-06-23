"use client";
import { useEffect, useRef, useState } from "react";

interface Message { role: "user" | "assistant"; content: string }

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.+)$/gm, "<h3 style='font-size:14px;font-weight:600;color:#0a1628;margin:12px 0 4px'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 style='font-size:15px;font-weight:700;color:#0a1628;margin:14px 0 5px'>$1</h2>")
    .replace(/^- (.+)$/gm, "<div style='display:flex;gap:6px;margin:2px 0'><span style='color:#d4a843;flex-shrink:0'>•</span><span>$1</span></div>")
    .replace(/`([^`]+)`/g, "<code style='background:#f1f5f9;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:12px'>$1</code>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const SUGGESTIONS = [
    "What are the four THINK-AI values and what do they mean?",
    "What is the equity grant for an L7 employee?",
    "What is the difference between a Thinker, Doer, and Talker rating?",
    "How is EOSB calculated for a 4-year expat who resigns?",
    "What level is a Senior Specialist and what is their Mercer alignment?",
    "What are the steps in the PIP chain before a performance separation?",
    "What is the pay philosophy and target percentile?",
    "How does the ESOP vesting schedule work?",
  ];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || streaming) return;
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content: q }];
    const withPlaceholder: Message[] = [...newMessages, { role: "assistant", content: "" }];
    setMessages(withPlaceholder);
    setStreaming(true);

    let buffer = "";
    let fullReply = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          sessionId,
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const parsed: { text?: string; done?: boolean; sessionId?: string; error?: string } = JSON.parse(raw);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              fullReply += parsed.text;
              const snapshot = fullReply;
              setMessages((prev) => {
                const next = [...prev];
                if (next.length > 0 && next[next.length - 1].role === "assistant") {
                  next[next.length - 1] = { role: "assistant", content: snapshot };
                }
                return next;
              });
            }
            if (parsed.sessionId && !sessionId) setSessionId(parsed.sessionId);
          } catch { /* non-JSON line, skip */ }
        }
      }

      if (!fullReply) throw new Error("Empty response");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0 && next[next.length - 1].role === "assistant") {
          next[next.length - 1] = { role: "assistant", content: `Sorry — ${errMsg} Please try again.` };
        }
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="display-font">Ask People AI</h1>
          <p>Claude-powered People Q&A — values, grading, ESOP, performance, and Saudi compliance</p>
        </div>
        {(messages.length > 0 || sessionId) && (
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
                Ask anything about THINK-AI People & Policy
              </h2>
              <p style={{ fontSize: 14, color: "#6b7a99", marginBottom: 28 }}>
                I know the full People Framework — values, grading (L1-L15), ESOP, Thinker/Doer/Talker ratings, EOSB, Iqama, WPS, and everything in between.
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
                    {sessionId && <span style={{ marginLeft: 8, color: "#86efac", fontSize: 10 }}>● saved</span>}
                  </div>
                )}
                {m.role === "user" ? (
                  <div className="chat-bubble-user">{m.content}</div>
                ) : (
                  <div className="chat-bubble-ai">
                    {m.content === "" ? (
                      <span style={{ color: "#94a3b8" }}>
                        <span style={{ animation: "pulse 1.2s infinite", display: "inline-block" }}>●</span>
                        {" "}<span style={{ animation: "pulse 1.2s 0.2s infinite", display: "inline-block" }}>●</span>
                        {" "}<span style={{ animation: "pulse 1.2s 0.4s infinite", display: "inline-block" }}>●</span>
                      </span>
                    ) : (
                      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                    )}
                  </div>
                )}
              </div>
            ))}
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
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              disabled={streaming}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={() => send()} disabled={streaming || !input.trim()}>
              {streaming ? "…" : "Send"}
            </button>
          </div>
          <div style={{ maxWidth: 720, margin: "6px auto 0", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
            Answers based on the THINK-AI People Policy Handbook v1.0 · Not legal advice · Contact people@think-ai.com for guidance
          </div>
        </div>
      </div>
    </>
  );
}
