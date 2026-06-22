"use client";
import { useEffect, useRef, useState } from "react";
import { AGENTS, AgentMeta } from "@/lib/agent-config";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.*?)`/g, "<code style='background:#f1f5f9;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:12px'>$1</code>")
    .replace(/\n/g, "<br/>");
}

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentMeta>(AGENTS[0]);
  const [conversations, setConversations] = useState<Record<string, Message[]>>({});
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentMessages = conversations[selectedAgent.id] ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages, loading]);

  function selectAgent(agent: AgentMeta) {
    setSelectedAgent(agent);
    setInput("");
  }

  function clearConversation() {
    setConversations((prev) => ({ ...prev, [selectedAgent.id]: [] }));
  }

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");

    const prev = conversations[selectedAgent.id] ?? [];
    const newMessages: Message[] = [...prev, { role: "user", content: q }];
    setConversations((c) => ({ ...c, [selectedAgent.id]: newMessages }));
    setLoading(true);

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply: string = data.reply ?? "Something went wrong. Please try again.";
      setConversations((c) => ({
        ...c,
        [selectedAgent.id]: [...newMessages, { role: "assistant", content: reply }],
      }));
    } catch {
      setConversations((c) => ({
        ...c,
        [selectedAgent.id]: [
          ...newMessages,
          { role: "assistant", content: "Something went wrong. Please try again." },
        ],
      }));
    }
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="agents-layout">
      {/* Left panel — agent selector */}
      <div className="agents-sidebar">
        <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid #e5e9f0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7a99", marginBottom: 4 }}>
            AI Agents
          </div>
          <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 18, fontWeight: 600, color: "#0a1628" }}>
            Multi-Agent Hub
          </div>
        </div>

        <div style={{ padding: "10px 8px", flex: 1 }}>
          {AGENTS.map((agent) => {
            const isActive = agent.id === selectedAgent.id;
            const hasMessages = (conversations[agent.id] ?? []).length > 0;
            return (
              <div
                key={agent.id}
                className={`agent-item${isActive ? " active" : ""}`}
                onClick={() => selectAgent(agent)}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: isActive ? "rgba(232,201,122,0.15)" : agent.bgColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  {agent.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    className="agent-name"
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: isActive ? "var(--gold-400)" : "#1a2540",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {agent.name}
                    {hasMessages && (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: isActive ? "var(--gold-400)" : "#3b82f6",
                          display: "inline-block",
                        }}
                      />
                    )}
                  </div>
                  <div
                    className="agent-tagline"
                    style={{
                      fontSize: 11.5,
                      color: isActive ? "rgba(255,255,255,0.5)" : "#6b7a99",
                      marginTop: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {agent.tagline}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #e5e9f0" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>
            Powered by Claude · THINK-AI People Hub
          </div>
        </div>
      </div>

      {/* Right panel — chat window */}
      <div className="agents-chat">
        {/* Chat header */}
        <div
          style={{
            background: "white",
            borderBottom: "1px solid #e5e9f0",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: selectedAgent.bgColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              {selectedAgent.icon}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#0a1628" }}>{selectedAgent.name}</div>
              <div style={{ fontSize: 12, color: "#6b7a99" }}>{selectedAgent.tagline}</div>
            </div>
          </div>
          {currentMessages.length > 0 && (
            <button
              className="btn btn-outline btn-sm"
              onClick={clearConversation}
              style={{ fontSize: 12 }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          {currentMessages.length === 0 ? (
            <div style={{ maxWidth: 640, margin: "0 auto" }}>
              {/* Agent description */}
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: selectedAgent.bgColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    margin: "0 auto 14px",
                  }}
                >
                  {selectedAgent.icon}
                </div>
                <h2
                  style={{
                    fontFamily: "Cormorant Garamond, serif",
                    fontSize: 24,
                    fontWeight: 600,
                    color: "#0a1628",
                    marginBottom: 8,
                  }}
                >
                  {selectedAgent.name}
                </h2>
                <p style={{ fontSize: 14, color: "#6b7a99", lineHeight: 1.6, maxWidth: 480, margin: "0 auto" }}>
                  {selectedAgent.description}
                </p>
              </div>

              {/* Suggestion grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                {selectedAgent.suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      background: "white",
                      border: `1px solid #e5e9f0`,
                      borderLeft: `3px solid ${selectedAgent.color}`,
                      borderRadius: 8,
                      padding: "10px 14px",
                      textAlign: "left",
                      fontSize: 12.5,
                      color: "#334155",
                      cursor: "pointer",
                      lineHeight: 1.45,
                      transition: "all 0.15s",
                      fontFamily: "Outfit, sans-serif",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "white";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
              {currentMessages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: m.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  {m.role === "assistant" && (
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, paddingLeft: 4 }}>
                      {selectedAgent.name}
                    </div>
                  )}
                  {m.role === "user" ? (
                    <div className="chat-bubble-user">{m.content}</div>
                  ) : (
                    <div
                      style={{
                        background: "white",
                        color: "#1a2540",
                        borderRadius: "16px 16px 16px 4px",
                        borderLeft: `4px solid ${selectedAgent.color}`,
                        padding: "12px 16px",
                        maxWidth: "82%",
                        border: `1px solid #e5e9f0`,
                        borderLeftColor: selectedAgent.color,
                        borderLeftWidth: 4,
                        fontSize: 14,
                        lineHeight: 1.65,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                      }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                    />
                  )}
                </div>
              ))}

              {loading && (
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <div
                    style={{
                      background: "white",
                      border: `1px solid #e5e9f0`,
                      borderLeftWidth: 4,
                      borderLeftColor: selectedAgent.color,
                      borderRadius: "16px 16px 16px 4px",
                      padding: "12px 16px",
                      color: "#94a3b8",
                      fontSize: 14,
                    }}
                  >
                    <span>&#9679;&nbsp;</span>
                    <span>&#9679;&nbsp;</span>
                    <span>&#9679;</span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div
          style={{
            borderTop: "1px solid #e5e9f0",
            background: "white",
            padding: "14px 32px",
            flexShrink: 0,
          }}
        >
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              ref={textareaRef}
              className="form-input form-textarea"
              placeholder={`Ask ${selectedAgent.name} anything…`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={1}
              style={{
                flex: 1,
                resize: "none",
                minHeight: 42,
                maxHeight: 120,
                overflowY: "auto",
                lineHeight: 1.5,
                paddingTop: 10,
                paddingBottom: 10,
              }}
            />
            <button
              className="btn btn-primary"
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{ height: 42, paddingLeft: 20, paddingRight: 20, flexShrink: 0 }}
            >
              Send
            </button>
          </div>
          <div style={{ maxWidth: 720, margin: "6px auto 0", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
            Enter to send · Shift+Enter for newline · Based on THINK-AI People Framework v1.0
          </div>
        </div>
      </div>
    </div>
  );
}
