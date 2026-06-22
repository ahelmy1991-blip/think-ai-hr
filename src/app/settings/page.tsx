"use client";
import { useState } from "react";

export default function SettingsPage() {
  const [notionToken, setNotionToken] = useState("");
  const [notionPageId, setNotionPageId] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="display-font">Settings</h1>
          <p>Integrations — Notion, LinkedIn, API keys</p>
        </div>
      </div>

      <div className="page-body" style={{ maxWidth: 640 }}>
        {/* Notion */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h2>Notion Integration</h2>
            <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">Get API Key</a>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ padding: "10px 14px", background: "#f8fafc", border: "1px solid #e5e9f0", borderRadius: 8, fontSize: 13, color: "#475569" }}>
              <strong>Setup:</strong> Create a Notion integration at notion.so/my-integrations → copy the token below.
              Then open your target Notion page → Share → Invite your integration. Copy the page URL; the ID is the 32-char hex after the last slash/hyphen.
              <br /><br />
              Add these to your <code style={{ background: "#e5e9f0", padding: "1px 4px", borderRadius: 3 }}>.env.local</code>:
              <pre style={{ background: "#0f2140", color: "#e8c97a", padding: "10px 12px", borderRadius: 6, marginTop: 8, fontSize: 12 }}>
{`NOTION_TOKEN=secret_xxxxx
NOTION_PARENT_PAGE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`}
              </pre>
            </div>
            <div>
              <label className="form-label">Notion API Token</label>
              <input className="form-input" type="password" value={notionToken} onChange={(e) => setNotionToken(e.target.value)} placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
            </div>
            <div>
              <label className="form-label">Parent Page ID</label>
              <input className="form-input" value={notionPageId} onChange={(e) => setNotionPageId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              Note: API keys are stored in .env.local on your server. These inputs are for reference — update .env.local manually.
            </div>
          </div>
        </div>

        {/* LinkedIn */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>LinkedIn Integration</h2></div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: 13, color: "#166534" }}>
              <strong>How profile import works:</strong>
              <ol style={{ paddingLeft: 16, marginTop: 6, lineHeight: 1.8 }}>
                <li>Find a candidate on LinkedIn</li>
                <li>Open their profile page</li>
                <li>Select all text (Ctrl+A) → Copy (Ctrl+C)</li>
                <li>Go to Candidates → Import LinkedIn Profile</li>
                <li>Paste the text — Claude extracts name, role, skills, location, AI experience automatically</li>
              </ol>
            </div>
            <div style={{ fontSize: 13, color: "#475569" }}>
              <strong>LinkedIn Search:</strong> On the Jobs page, each open role has a "LinkedIn Search" button that opens a pre-filtered LinkedIn people search with the right keywords, specialty, and AI filters.
            </div>
          </div>
        </div>

        {/* Claude */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>Claude AI (Anthropic)</h2></div>
          <div className="card-body">
            <div style={{ padding: "10px 14px", background: "#fdf4ff", border: "1px solid #e9d5ff", borderRadius: 8, fontSize: 13, color: "#6b21a8" }}>
              Claude powers: HR Q&A chat · LinkedIn profile parsing · AI match scoring · Cultural background inference
              <br /><br />
              Set your key in <code style={{ background: "#e9d5ff", padding: "1px 4px", borderRadius: 3 }}>.env.local</code>:
              <pre style={{ background: "#0f2140", color: "#e8c97a", padding: "10px 12px", borderRadius: 6, marginTop: 8, fontSize: 12 }}>
{`ANTHROPIC_API_KEY=sk-ant-xxxxx`}
              </pre>
              Using: <strong>claude-opus-4-8</strong> (HR chat, match scoring, profile import)
            </div>
          </div>
        </div>

        {/* Database */}
        <div className="card">
          <div className="card-header"><h2>Database</h2></div>
          <div className="card-body">
            <div style={{ fontSize: 13, color: "#475569" }}>
              Connected to Neon PostgreSQL — shared with Petinder using <code style={{ background: "#e5e9f0", padding: "1px 4px", borderRadius: 3 }}>hr_</code> table prefix.
              <br /><br />
              To push schema changes: run <code style={{ background: "#e5e9f0", padding: "1px 4px", borderRadius: 3 }}>npx prisma db push</code> in the <code style={{ background: "#e5e9f0", padding: "1px 4px", borderRadius: 3 }}>think-ai-hr/</code> directory.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
