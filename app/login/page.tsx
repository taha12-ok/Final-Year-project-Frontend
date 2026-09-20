"use client";
/**
 * /login — professional split-screen auth page.
 * Left: brand panel (gradient, feature highlights). Right: login form.
 */
import { useState, Suspense, type FormEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Stethoscope, Mail, Lock, ArrowRight, ShieldCheck, Activity, Bone, Brain, Droplets,
} from "lucide-react";
import { apiJson, setSession, type AuthUser } from "@/lib/api";
import { EASE } from "@/components/Reveal";

const FEATURES: { icon: ReactNode; title: string; text: string }[] = [
  { icon: <Bone size={18} />, title: "Fracture X-ray analysis", text: "Calibrated confidence with Grad-CAM focus maps." },
  { icon: <Brain size={18} />, title: "Brain MRI screening", text: "Tumor screening with honest, temperature-scaled scores." },
  { icon: <Droplets size={18} />, title: "Kidney CT detection", text: "Cyst, stone and tumor indicators on CT scans." },
  { icon: <Activity size={18} />, title: "Personal health history", text: "Every analysis and PDF report saved to your profile." },
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/profile";
  const expired = params.get("expired") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiJson<{ token: string; user: AuthUser }>("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      setSession(data.token, data.user);
      router.push(next.startsWith("/") ? next : "/profile");
    } catch (err: any) {
      setError(err.message || "Login failed — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      {expired && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 18, padding: "12px 16px", borderRadius: 12, background: "rgba(124,92,252,0.1)", border: "1px solid rgba(124,92,252,0.35)", color: "#5B3FE4", fontSize: 13 }}>
          Your session expired — please sign in again to continue.
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
        <span className="chip chip-violet" style={{ fontSize: 12 }}>
          <ShieldCheck size={13} /> Member access
        </span>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", margin: "14px 0 6px" }}>
          Welcome <span className="gradient-text">back</span>
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 26 }}>
          Sign in to run screenings, chat with the AI Health Assistant, and view your history.
        </p>
      </motion.div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={labelStyle}>Email address</label>
        <div style={inputWrapStyle}>
          <Mail size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" style={inputStyle} autoComplete="email" />
        </div>

        <label style={labelStyle}>Password</label>
        <div style={inputWrapStyle}>
          <Lock size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <input type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password" style={inputStyle} autoComplete="current-password" />
          <button type="button" onClick={() => setShowPw(!showPw)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>
            {showPw ? "Hide" : "Show"}
          </button>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: "rgba(229,72,77,0.08)", border: "1px solid rgba(229,72,77,0.4)", color: "var(--alert)", padding: "11px 14px", borderRadius: 12, fontSize: 13 }}>
            {error}
          </motion.div>
        )}

        <motion.button type="submit" disabled={busy}
          whileHover={!busy ? { scale: 1.015 } : {}} whileTap={!busy ? { scale: 0.985 } : {}}
          className="btn btn-primary" style={{ marginTop: 6, padding: "14px 20px", fontSize: 15, opacity: busy ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {busy ? "Signing in…" : <>Sign in <ArrowRight size={16} /></>}
        </motion.button>
      </form>

      <p style={{ marginTop: 22, fontSize: 14, color: "var(--muted)" }}>
        New to MedAI?{" "}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} style={{ color: "var(--brand)", fontWeight: 700 }}>
          Create a free account
        </Link>
      </p>
      <p style={{ marginTop: 10, fontSize: 12.5, color: "var(--muted)" }}>
        <Link href="/" style={{ color: "var(--muted)" }}>← Back to home</Link>
      </p>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: "var(--ink)", letterSpacing: "0.01em" };
const inputWrapStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--border-strong)",
  borderRadius: 13, padding: "12px 14px", background: "var(--surface)",
  transition: "border-color 0.2s var(--ease)", marginTop: -6,
};
const inputStyle: React.CSSProperties = {
  flex: 1, border: "none", outline: "none", background: "transparent",
  fontSize: 14.5, color: "var(--ink)", fontFamily: "inherit",
};

export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--bg)" }}>
      {/* Left brand panel */}
      <div style={{
        background: "linear-gradient(150deg, #1a0b2e 0%, #14213d 55%, #0d1b2e 100%)",
        color: "#fff", padding: "64px 56px", display: "flex", flexDirection: "column", justifyContent: "space-between",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", width: 460, height: 460, borderRadius: "50%", top: "-18%", right: "-14%", background: "radial-gradient(circle, rgba(43,75,223,0.35), transparent 65%)" }} />
        <div style={{ position: "absolute", width: 380, height: 380, borderRadius: "50%", bottom: "-16%", left: "-10%", background: "radial-gradient(circle, rgba(20,184,166,0.22), transparent 65%)" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#fff" }}>
            <span style={{ width: 42, height: 42, borderRadius: 13, background: "linear-gradient(135deg, var(--brand), var(--violet))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Stethoscope size={21} />
            </span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>MedAI</span>
          </Link>
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 2.6vw, 38px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, maxWidth: 460 }}>
            AI-powered medical screening,{" "}
            <span style={{ background: "linear-gradient(90deg,#7dd3fc,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              with honest confidence.
            </span>
          </motion.h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 34, maxWidth: 520 }}>
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.15 + i * 0.09, ease: EASE }}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 16, backdropFilter: "blur(6px)" }}>
                <span style={{ color: "#7dd3fc", display: "inline-flex", marginBottom: 8 }}>{f.icon}</span>
                <p style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>{f.title}</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{f.text}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <p style={{ position: "relative", zIndex: 1, fontSize: 11.5, color: "rgba(255,255,255,0.4)" }}>
          Screening aid only — not a medical diagnosis. Always confirm with a qualified doctor.
        </p>
      </div>

      {/* Right form panel */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 32px" }}>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>

      <style jsx global>{`
        @media (max-width: 900px) {
          main { grid-template-columns: 1fr !important; }
          main > div:first-child { display: none !important; }
        }
      `}</style>
    </main>
  );
}
