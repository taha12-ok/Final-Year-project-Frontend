"use client";
/**
 * /admin — platform admin dashboard (hardcoded creds admin/admin123, env-overridable).
 * Overview: KPI cards + daily activity chart + model distribution.
 * Users: table with full drill-down (chats, analyses, memory) per user.
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ShieldCheck, Users, FileText, MessageSquare, BrainCircuit, Activity,
  Lock, X, RefreshCw, ChevronRight, Mail, Calendar, Trash2, AlertTriangle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { BACKEND_URL } from "@/lib/api";
import { EASE } from "@/components/Reveal";

const ADMIN_TOKEN_KEY = "medai_admin_token";

interface Overview {
  totals: { users: number; analyses: number; chats: number; messages: number; memories: number };
  by_model: Record<string, number>;
  by_result: Record<string, number>;
  avg_confidence: number;
  inconclusive: number;
  daily: [string, number][];
}
interface UserRow {
  id: number; email: string; full_name: string; age: string; gender: string;
  created_at: string; analysis_count: number; chat_count: number; memory_count: number;
}

function adminFetch(path: string, opts: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  const headers = new Headers(opts.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${BACKEND_URL}${path}`, { ...opts, headers });
}

/** Minimal SVG line/bar chart (no extra deps). */
function MiniChart({ data }: { data: [string, number][] }) {
  if (!data.length) return <p style={{ fontSize: 12.5, color: "var(--muted)" }}>No activity yet.</p>;
  const max = Math.max(...data.map((d) => d[1]), 1);
  const W = 560, H = 120, PAD = 8;
  const bw = (W - PAD * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 120 }}>
      {data.map(([day, n], i) => {
        const h = (n / max) * (H - 24);
        return (
          <g key={day}>
            <rect x={PAD + i * bw + 2} y={H - 16 - h} width={bw - 4} height={h} rx={3}
              fill="url(#barGrad)" opacity={0.9} />
            {data.length <= 14 && (
              <text x={PAD + i * bw + bw / 2} y={H - 4} textAnchor="middle" fontSize={7.5} fill="var(--muted)">
                {day.slice(5)}
              </text>
            )}
            {n > 0 && (
              <text x={PAD + i * bw + bw / 2} y={H - 20 - h} textAnchor="middle" fontSize={8} fill="var(--brand-deep)" fontWeight={700}>
                {n}
              </text>
            )}
          </g>
        );
      })}
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b4bdf" />
          <stop offset="100%" stopColor="#7c5cfc" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const o = await adminFetch("/admin/overview");
      if (o.status === 401) { setAuthed(false); return; }
      setOverview(await o.json());
      const u = await adminFetch("/admin/users");
      if (u.ok) setUsers((await u.json()).users);
      setAuthed(true);
    } catch {
      setAuthed(true); // show panel even if backend hiccup
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(ADMIN_TOKEN_KEY)) {
      loadAll();
    } else {
      setAuthed(false);
    }
  }, [loadAll]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr("");
    try {
      const r = await fetch(`${BACKEND_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : "Invalid admin credentials.");
      localStorage.setItem(ADMIN_TOKEN_KEY, d.token);
      loadAll();
    } catch (err: any) {
      setLoginErr(err.message || "Login failed.");
    }
  };

  const openUser = async (id: number) => {
    try {
      const r = await adminFetch(`/admin/users/${id}`);
      if (r.ok) setDetail(await r.json());
    } catch { /* ignore */ }
  };

  // ── Login screen ──
  if (authed === false || authed === null) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 20 }}>
        <div className="mesh-bg" />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
          className="panel" style={{ width: "min(400px, 100%)", padding: 30 }}>
          <span style={{
            width: 48, height: 48, borderRadius: 15, background: "linear-gradient(135deg, var(--brand), var(--violet))",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginBottom: 16,
          }}>
            <ShieldCheck size={23} />
          </span>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>
            Admin <span className="gradient-text">access</span>
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 22 }}>
            Platform administration — users, screenings, and assistant analytics.
          </p>

          <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="Username"
              style={{ border: "1px solid var(--border-strong)", borderRadius: 12, padding: "12px 14px", fontSize: 14, background: "var(--surface)", color: "var(--ink)", outline: "none" }} />
            <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" placeholder="Password"
              style={{ border: "1px solid var(--border-strong)", borderRadius: 12, padding: "12px 14px", fontSize: 14, background: "var(--surface)", color: "var(--ink)", outline: "none" }} />
            {loginErr && (
              <div style={{ background: "rgba(229,72,77,0.08)", border: "1px solid rgba(229,72,77,0.4)", color: "var(--alert)", padding: "10px 13px", borderRadius: 11, fontSize: 13 }}>
                {loginErr}
              </div>
            )}
            <button type="submit" className="btn btn-primary" style={{ padding: "13px 0", fontSize: 14.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Lock size={15} /> Sign in as admin
            </button>
          </form>
          <p style={{ marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
            <Link href="/" style={{ color: "var(--muted)" }}>← Back to site</Link>
          </p>
        </motion.div>
      </main>
    );
  }

  // ── Dashboard ──
  const T = overview?.totals;
  const kpis = [
    { label: "Users", value: T?.users ?? "—", icon: <Users size={17} />, color: "#2b4bdf" },
    { label: "Screenings", value: T?.analyses ?? "—", icon: <FileText size={17} />, color: "#7c5cfc" },
    { label: "Chat sessions", value: T?.chats ?? "—", icon: <MessageSquare size={17} />, color: "#14b8a6" },
    { label: "Memories", value: T?.memories ?? "—", icon: <BrainCircuit size={17} />, color: "#f5a524" },
    { label: "Avg confidence", value: overview ? `${overview.avg_confidence}%` : "—", icon: <Activity size={17} />, color: "#e5484d" },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", position: "relative", overflow: "clip" }}>
      <div className="mesh-bg" />
      <Navbar variant="app" right={
        <button onClick={() => { localStorage.removeItem(ADMIN_TOKEN_KEY); setAuthed(false); }}
          className="btn btn-secondary" style={{ padding: "9px 14px", fontSize: 13 }}>
          Sign out
        </button>
      } />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "116px 20px 60px", position: "relative", zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="chip chip-violet" style={{ fontSize: 12 }}>
              <ShieldCheck size={13} /> Admin panel
            </span>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", marginTop: 10 }}>
              Platform <span className="gradient-text">overview</span>
            </h1>
          </div>
          <button onClick={loadAll} className="btn btn-secondary" style={{ padding: "10px 16px", fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 7 }}>
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
        </motion.div>

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginTop: 24 }}>
          {kpis.map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: EASE }} className="panel" style={{ padding: 18 }}>
              <span style={{ color: k.color, display: "inline-flex", marginBottom: 8 }}>{k.icon}</span>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700 }}>{k.value}</p>
              <p style={{ fontSize: 12.5, color: "var(--muted)" }}>{k.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14, marginTop: 16 }}>
          <div className="panel" style={{ padding: 20 }}>
            <p style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 12 }}>DAILY SCREENINGS (LAST 14 DAYS)</p>
            <MiniChart data={overview?.daily || []} />
          </div>
          <div className="panel" style={{ padding: 20 }}>
            <p style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 12 }}>MODEL DISTRIBUTION</p>
            {overview ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(overview.by_model).map(([m, n]) => {
                  const total = Object.values(overview.by_model).reduce((a, b) => a + b, 0) || 1;
                  const pct = Math.round((n / total) * 100);
                  const colors: Record<string, string> = { fracture: "#2b4bdf", brain: "#7c5cfc", kidney: "#14b8a6" };
                  return (
                    <div key={m}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                        <span style={{ textTransform: "capitalize" }}>{m}</span><span>{n} ({pct}%)</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 8, background: "var(--border)", overflow: "hidden" }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: EASE }}
                          style={{ height: "100%", background: colors[m] || "var(--brand)", borderRadius: 8 }} />
                      </div>
                    </div>
                  );
                })}
                {overview.inconclusive > 0 && (
                  <p style={{ fontSize: 12, color: "#b45309", display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <AlertTriangle size={12} /> {overview.inconclusive} inconclusive screenings flagged
                  </p>
                )}
              </div>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>Loading…</p>
            )}
          </div>
        </div>

        {/* Users table */}
        <div className="panel" style={{ padding: 20, marginTop: 16 }}>
          <p style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 14 }}>USERS ({users.length})</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                  {["User", "Email", "Joined", "Screenings", "Chats", ""].map((h) => (
                    <th key={h} style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", padding: "8px 10px", letterSpacing: "0.08em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} onClick={() => openUser(u.id)} style={{ cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                    className="admin-row">
                    <td style={{ padding: "11px 10px", fontSize: 13.5, fontWeight: 700 }}>{u.full_name || "—"}</td>
                    <td style={{ padding: "11px 10px", fontSize: 13, color: "var(--muted)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Mail size={12} /> {u.email}</span>
                    </td>
                    <td style={{ padding: "11px 10px", fontSize: 12.5, color: "var(--muted)" }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "11px 10px", fontSize: 13.5, fontWeight: 700 }}>{u.analysis_count}</td>
                    <td style={{ padding: "11px 10px", fontSize: 13.5, fontWeight: 700 }}>{u.chat_count}</td>
                    <td style={{ padding: "11px 10px" }}>
                      <ChevronRight size={15} style={{ color: "var(--muted)" }} />
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No users yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User drill-down modal */}
      <AnimatePresence>
        {detail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDetail(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(10,10,30,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 18, backdropFilter: "blur(4px)" }}>
            <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="panel" style={{ width: "min(860px, 100%)", maxHeight: "88vh", overflowY: "auto", padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19 }}>
                    {detail.user.full_name || detail.user.email}
                  </p>
                  <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    {detail.user.email} · joined {new Date(detail.user.created_at).toLocaleDateString()}
                    {detail.user.age ? ` · ${detail.user.age} yrs` : ""}{detail.user.gender ? ` · ${detail.user.gender}` : ""}
                  </p>
                </div>
                <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
                  <X size={19} />
                </button>
              </div>

              {/* Memory */}
              {detail.memory.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 8 }}>ASSISTANT MEMORY</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {detail.memory.map((m: any, i: number) => (
                      <span key={i} style={{ fontSize: 12, padding: "6px 11px", borderRadius: 999, background: "var(--brand-soft)", color: "var(--brand-deep)", fontWeight: 600 }}>
                        {m.key.replace(/_/g, " ")}: {m.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Analyses */}
              <p style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 8 }}>SCREENINGS ({detail.analyses.length})</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 18 }}>
                {detail.analyses.map((a: any) => (
                  <div key={a.id} style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                    {a.thumbnail_b64 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`data:image/jpeg;base64,${a.thumbnail_b64}`} alt="" style={{ width: "100%", height: 90, objectFit: "cover" }} />
                    ) : <div style={{ height: 90, background: "var(--bg-alt)" }} />}
                    <div style={{ padding: 10 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 800, textTransform: "capitalize" }}>{a.model_type}: {a.result}</p>
                      <p style={{ fontSize: 11.5, color: "var(--muted)" }}>{a.confidence}% · {new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {detail.analyses.length === 0 && <p style={{ fontSize: 13, color: "var(--muted)" }}>No screenings.</p>}
              </div>

              {/* Chats */}
              <p style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 8 }}>CHAT SESSIONS ({detail.chats.length})</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {detail.chats.map((s: any) => (
                  <details key={s.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12 }}>
                    <summary style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
                      <MessageSquare size={13} style={{ color: "var(--brand)" }} /> {s.title}
                      <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>
                        ({s.messages.length} msgs · {new Date(s.updated_at).toLocaleDateString()})
                      </span>
                    </summary>
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
                      {s.messages.map((m: any, i: number) => (
                        <div key={i} style={{
                          fontSize: 12.8, padding: "8px 12px", borderRadius: 10, maxWidth: "85%",
                          alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                          background: m.role === "user" ? "var(--brand-soft)" : "var(--bg-alt)",
                          whiteSpace: "pre-wrap", overflowWrap: "anywhere",
                        }}>
                          <strong style={{ fontSize: 10.5, textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: 2 }}>{m.role}</strong>
                          {m.content.slice(0, 500)}
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
                {detail.chats.length === 0 && <p style={{ fontSize: 13, color: "var(--muted)" }}>No chats.</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .admin-row:hover { background: var(--bg-alt); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 860px) {
          div[style*="1.6fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
