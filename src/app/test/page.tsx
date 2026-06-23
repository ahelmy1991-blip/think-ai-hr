"use client";
import { useState } from "react";

interface TestResult {
  id: string;
  category: string;
  name: string;
  status: 'pass' | 'fail';
  message: string;
  duration: number;
}
interface TestResponse {
  results: TestResult[];
  summary: { passed: number; failed: number; total: number };
}

const CATEGORY_ORDER = ['Config', 'Database', 'Tables', 'People Ops', 'Recruitment', 'AI', 'Auth'];

export default function TestPage() {
  const [data, setData] = useState<TestResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function runTests() {
    setRunning(true);
    setData(null);
    setError("");
    try {
      const r = await fetch('/api/test');
      if (!r.ok) throw new Error(`API returned ${r.status}`);
      const json = await r.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  const grouped = data
    ? CATEGORY_ORDER.reduce<Record<string, TestResult[]>>((acc, cat) => {
        const items = data.results.filter(r => r.category === cat);
        if (items.length) acc[cat] = items;
        return acc;
      }, {})
    : {};

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#0a1628', color: 'white', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: '#e8c97a', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>THINK-AI</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 600 }}>System Health Check</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>Tests every feature, button, and database operation</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="/" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecoration: 'none' }}>← Back to Hub</a>
          <button
            onClick={runTests}
            disabled={running}
            style={{
              padding: '10px 28px', borderRadius: 8, border: 'none', cursor: running ? 'not-allowed' : 'pointer',
              background: running ? '#334155' : '#e8c97a', color: running ? '#94a3b8' : '#0a1628',
              fontWeight: 700, fontSize: 14, fontFamily: 'Outfit, sans-serif', transition: 'all 0.15s',
            }}
          >
            {running ? '⏳ Running tests...' : '▶ Run All Tests'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Summary bar */}
        {data && (
          <div style={{
            background: 'white', borderRadius: 12, padding: '18px 24px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: `2px solid ${data.summary.failed === 0 ? '#86efac' : '#fca5a5'}`,
          }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: data.summary.failed === 0 ? '#16a34a' : '#dc2626' }}>
              {data.summary.passed}/{data.summary.total}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0a1628' }}>
                {data.summary.failed === 0 ? '✅ All tests passing — system is healthy' : `❌ ${data.summary.failed} test${data.summary.failed > 1 ? 's' : ''} failing`}
              </div>
              <div style={{ fontSize: 13, color: '#6b7a99', marginTop: 2 }}>
                {data.summary.passed} passed · {data.summary.failed} failed · {data.summary.total} total
              </div>
            </div>
            <button
              onClick={runTests}
              disabled={running}
              style={{ marginLeft: 'auto', padding: '7px 18px', borderRadius: 6, border: '1px solid #e5e9f0', background: 'white', cursor: 'pointer', fontSize: 13, color: '#475569' }}
            >
              🔄 Re-run
            </button>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: 16, marginBottom: 20, color: '#dc2626', fontSize: 14 }}>
            ❌ Failed to run tests: {error}
          </div>
        )}

        {/* Empty state */}
        {!data && !running && !error && (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: 'white', borderRadius: 12 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔬</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#0a1628', marginBottom: 8 }}>Ready to test the system</div>
            <div style={{ fontSize: 14, color: '#6b7a99', marginBottom: 24 }}>
              Runs {'>'}20 checks across config, database, people ops, recruitment, AI, and auth.
            </div>
            <button
              onClick={runTests}
              style={{ padding: '12px 36px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#0a1628', color: 'white', fontWeight: 700, fontSize: 15, fontFamily: 'Outfit, sans-serif' }}
            >
              ▶ Run All Tests
            </button>
          </div>
        )}

        {/* Loading */}
        {running && (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: 'white', borderRadius: 12 }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⚙️</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#0a1628', marginBottom: 6 }}>Running all tests...</div>
            <div style={{ fontSize: 13, color: '#6b7a99' }}>Testing database, AI, auth, and all features. Takes ~15s.</div>
          </div>
        )}

        {/* Results */}
        {data && Object.entries(grouped).map(([category, tests]) => {
          const catPassed = tests.filter(t => t.status === 'pass').length;
          const catFailed = tests.filter(t => t.status === 'fail').length;
          return (
            <div key={category} style={{ background: 'white', borderRadius: 12, marginBottom: 16, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
              {/* Category header */}
              <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e5e9f0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0a1628' }}>{category}</div>
                <div style={{ fontSize: 12, color: catFailed > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                  {catPassed}/{tests.length} passing
                </div>
              </div>
              {/* Test rows */}
              {tests.map((t, i) => (
                <div key={t.id} style={{
                  padding: '11px 20px', display: 'flex', alignItems: 'flex-start', gap: 12,
                  borderBottom: i < tests.length - 1 ? '1px solid #f1f5f9' : 'none',
                  background: t.status === 'fail' ? '#fff8f8' : 'white',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                    background: t.status === 'pass' ? '#dcfce7' : '#fee2e2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12,
                  }}>
                    {t.status === 'pass' ? '✓' : '✗'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: t.status === 'fail' ? '#dc2626' : '#1a2540' }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 12.5, color: t.status === 'fail' ? '#b91c1c' : '#475569', marginTop: 2, wordBreak: 'break-word' }}>
                      {t.message}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0, marginTop: 2 }}>{t.duration}ms</div>
                </div>
              ))}
            </div>
          );
        })}

        {/* Fix guide for failing tests */}
        {data && data.summary.failed > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12, padding: '18px 22px', marginTop: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 10 }}>⚠ How to fix failing tests</div>
            <ul style={{ fontSize: 13, color: '#78350f', lineHeight: 2, margin: 0, paddingLeft: 20 }}>
              {data.results.filter(r => r.status === 'fail').map(r => (
                <li key={r.id}>
                  <strong>{r.name}</strong>: {
                    r.id.startsWith('cfg_') ? 'Go to Vercel → Settings → Env Vars and re-add the missing variable, then redeploy.' :
                    r.id.startsWith('db_') ? 'Check DATABASE_URL in Vercel. Re-run the Neon connection string. Redeploy after.' :
                    r.id.startsWith('tbl_') ? 'Table is missing. Run: npx dotenv-cli -e .env.local -- node scripts/create-new-tables.mjs' :
                    r.id === 'emp_count' || r.id === 'jobs_count' || r.id === 'cand_count' ? 'Seed data missing. Run: npx dotenv-cli -e .env.local -- node scripts/seed-full.mjs' :
                    r.id.startsWith('ai_') ? 'Check ANTHROPIC_API_KEY in Vercel. Ensure it starts with sk-ant-. Redeploy after.' :
                    r.id === 'auth_logic' ? 'Set ADMIN_PASSWORD in Vercel env vars, then redeploy.' :
                    r.message
                  }
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 24 }}>
          THINK-AI People Hub · System Health Check · {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
