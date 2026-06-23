"use client";
import { useEffect, useRef, useState } from "react";
import { AGENTS, AgentMeta } from "@/lib/agent-config";

interface Message { role: "user" | "assistant"; content: string; }
interface Session { id: string; agentId: string; agentName: string; title: string | null; createdAt: string; }

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.+)$/gm, "<h3 style='font-size:14px;font-weight:600;color:#0a1628;margin:12px 0 4px'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 style='font-size:15px;font-weight:700;color:#0a1628;margin:14px 0 5px'>$2</h2>")
    .replace(/^- (.+)$/gm, "<div style='display:flex;gap:6px;margin:2px 0'><span style='color:#d4a843;flex-shrink:0'>•</span><span>$1</span></div>")
    .replace(/`([^`]+)`/g, "<code style='background:#f1f5f9;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:12px'>$1</code>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentMeta>(AGENTS[0]);
  const [conversations, setConversations] = useState<Record<string, Message[]>>({});
  const [sessionIds, setSessionIds] = useState<Record<string, string>>({});
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const currentMessages = conversations[selectedAgent.id] ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages, streaming]);

  useEffect(() => {
    if (showHistory) loadHistory();
  }, [showHistory, selectedAgent.id]);

  async function loadHistory() {
    try {
      const r = await fetch(`/api/agents?agentId=${selectedAgent.id}`);
      const data = await r.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch { setSessions([]); }
  }

  async function loadSession(sessionId: string) {
    try {
      const r = await fetch(`/api/agents?sessionId=${sessionId}`);
      const msgs: { role: string; content: string }[] = await r.json();
      const mapped: Message[] = msgs.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      setConversations((c) => ({ ...c, [selectedAgent.id]: mapped }));
      setSessionIds((s) => ({ ...s, [selectedAgent.id]: sessionId }));
      setShowHistory(false);
    } catch { /* ignore */ }
  }

  function selectAgent(agent: AgentMeta) {
    setSelectedAgent(agent);
    setInput("");
    setShowHistory(false);
  }

  function clearConversation() {
    setConversations((c) => ({ ...c, [selectedAgent.id]: [] }));
    setSessionIds((s) => { const n = { ...s }; delete n[selectedAgent.id]; return n; });
  }

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || streaming) return;
    setInput("");

    const prev = conversations[selectedAgent.id] ?? [];
    const newMessages: Message[] = [...prev, { role: "user", content: q }];
    const withPlaceholder: Message[] = [...newMessages, { role: "assistant", content: "" }];

    setConversations((c) => ({ ...c, [selectedAgent.id]: withPlaceholder }));
    setStreaming(true);

    let buffer = "";
    let fullReply = "";
    const agentId = selectedAgent.id;

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          sessionId: sessionIds[agentId] ?? null,
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
              setConversations((c) => {
                const msgs = [...(c[agentId] ?? [])];
                if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant") {
                  msgs[msgs.length - 1] = { role: "assistant", content: snapshot };
                }
                return { ...c, [agentId]: msgs };
              });
            }
            if (parsed.sessionId) {
              setSessionIds((s) => ({ ...s, [agentId]: parsed.sessionId! }));
            }
          } catch { /* non-JSON or error line */ }
        }
      }

      if (!fullReply) throw new Error("Empty response");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Something went wrong.";
      setConversations((c) => {
        const msgs = [...(c[agentId] ?? [])];
        if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant") {
          msgs[msgs.length - 1] = { role: "assistant", content: `Error: ${errMsg} Please try again.` };
        }
        return { ...c, [agentId]: msgs };
      });
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="agents-layout">
      {/* LEFT — agent selector */}
      <div className="agents-sidebar">
        <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid #e5e9f0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 3 }}>
            THINK-AI
          </div>
          <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 19, fontWeight: 600, color: "#0a1628" }}>
            AI Agents Hub
          </div>
          <div style={{ fontSize: 12, color: "#6b7a99", marginTop: 2 }}>5 specialized agents</div>
        </div>

        <div style={{ padding: "10px 8px", flex: 1, overflowY: "auto" }}>
          {AGENTS.map((agent) => {
            const isActive = agent.id === selectedAgent.id;
            const hasHistory = (conversations[agent.id] ?? []).length > 0;
            return (
              <div
                key={agent.id}
                className={`agent-item${isActive ? " active" : ""}`}
                onClick={() => selectAgent(agent)}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                  background: isActive ? "rgba(232,201,122,0.15)" : agent.bgColor,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                }}>
                  {agent.icon}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="agent-name" style={{
                    fontSize: 13.5, fontWeight: 600,
                    color: isActive ? "var(--gold-400)" : "#1a2540",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    {agent.name}
                    {hasHistory && (
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? "var(--gold-400)" : "#3b82f6", display: "inline-block", flexShrink: 0 }} />
                    )}
                  </div>
                  <div className="agent-tagline" style={{
                    fontSize: 11.5, marginTop: 1,
                    color: isActive ? "rgba(255,255,255,0.5)" : "#6b7a99",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {agent.tagline}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* History toggle */}
        <div style={{ padding: "10px 8px", borderTop: "1px solid #e5e9f0" }}>
          <button
            onClick={() => setShowHistory((h) => !h)}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e9f0",
              background: showHistory ? "#f0f4ff" : "white", cursor: "pointer",
              fontSize: 12.5, color: "#475569", display: "flex", alignItems: "center", gap: 8,
              fontFamily: "Outfit, sans-serif",
            }}
          >
            <span>🕐</span> {showHistory ? "Hide" : "Session"} History
          </button>
          <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
            Powered by Claude · THINK-AI 2026
          </div>
        </div>
      </div>

      {/* RIGHT — chat + history panel */}
      <div className="agents-chat">
        {/* Header */}
        <div style={{
          background: "white", borderBottom: "1px solid #e5e9f0",
          padding: "14px 24px", display: "flex", alignItems: "center",
          justifyContent: "space-between", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: selectedAgent.bgColor,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            }}>
              {selectedAgent.icon}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#0a1628" }}>{selectedAgent.name}</div>
              <div style={{ fontSize: 12, color: "#6b7a99" }}>{selectedAgent.tagline}</div>
            </div>
            {sessionIds[selectedAgent.id] && (
              <span style={{ fontSize: 10, background: "#f0fdf4", color: "#166534", padding: "2px 8px", borderRadius: 20, border: "1px solid #bbf7d0" }}>
                Session saved
              </span>
            )}
          </div>
          {currentMessages.length > 0 && (
            <button className="btn btn-outline btn-sm" onClick={clearConversation}>New Chat</button>
          )}
        </div>

        {/* History panel (overlay within chat area) */}
        {showHistory && (
          <div style={{
            position: "absolute", top: 73, right: 0, bottom: 0, width: 340,
            background: "white", borderLeft: "1px solid #e5e9f0",
            zIndex: 20, display: "flex", flexDirection: "column",
          }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e9f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0a1628" }}>
                {selectedAgent.name} — History
              </div>
              <button onClick={() => setShowHistory(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94a3b8" }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
              {sessions.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  No saved sessions yet.<br />Start a conversation to auto-save.
                </div>
              ) : sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => loadSession(s.id)}
                  style={{
                    padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                    border: "1px solid #e5e9f0", marginBottom: 6, background: "white",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#1a2540", marginBottom: 2 }}>
                    {s.title ?? "Untitled session"}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 36px", position: "relative" }}>
          {currentMessages.length === 0 ? (
            <div style={{ maxWidth: 640, margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{
                  width: 68, height: 68, borderRadius: 18,
                  background: selectedAgent.bgColor,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 34, margin: "0 auto 14px",
                }}>
                  {selectedAgent.icon}
                </div>
                <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 26, fontWeight: 600, color: "#0a1628", marginBottom: 8 }}>
                  {selectedAgent.name}
                </h2>
                <p style={{ fontSize: 14, color: "#6b7a99", lineHeight: 1.65, maxWidth: 480, margin: "0 auto" }}>
                  {selectedAgent.description}
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {selectedAgent.suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      background: "white", borderRadius: 9, padding: "11px 14px",
                      textAlign: "left", fontSize: 12.5, color: "#334155", cursor: "pointer",
                      lineHeight: 1.45, fontFamily: "Outfit, sans-serif",
                      border: "1px solid #e5e9f0",
                      borderLeft: `3px solid ${selectedAgent.color}`,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "white"; (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 740, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
              {currentMessages.map((m, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                  {m.role === "assistant" && (
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 5, paddingLeft: 2, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 18, height: 18, borderRadius: 5, background: selectedAgent.bgColor, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                        {selectedAgent.icon}
                      </span>
                      {selectedAgent.name}
                    </div>
                  )}
                  {m.role === "user" ? (
                    <div className="chat-bubble-user">{m.content}</div>
                  ) : (
                    <div style={{
                      background: "white", color: "#1a2540",
                      borderRadius: "4px 16px 16px 16px",
                      padding: "14px 18px", maxWidth: "85%",
                      border: "1px solid #e5e9f0",
                      borderLeft: `4px solid ${selectedAgent.color}`,
                      fontSize: 14, lineHeight: 1.7,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    }}>
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
          )}
        </div>

        {/* Input bar */}
        <div style={{ borderTop: "1px solid #e5e9f0", background: "white", padding: "14px 36px", flexShrink: 0 }}>
          <div style={{ maxWidth: 740, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              className="form-input form-textarea"
              placeholder={`Ask ${selectedAgent.name}…`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming}
              rows={1}
              style={{ flex: 1, resize: "none", minHeight: 44, maxHeight: 140, overflowY: "auto", lineHeight: 1.5, paddingTop: 11, paddingBottom: 11 }}
            />
            <button
              className="btn btn-primary"
              onClick={() => send()}
              disabled={streaming || !input.trim()}
              style={{ height: 44, paddingLeft: 22, paddingRight: 22, flexShrink: 0, background: selectedAgent.color }}
            >
              {streaming ? "…" : "Send"}
            </button>
          </div>
          <div style={{ maxWidth: 740, margin: "5px auto 0", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
            Enter to send · Shift+Enter for new line · Conversations auto-saved to database
          </div>
        </div>
      </div>
    </div>
  );
}
