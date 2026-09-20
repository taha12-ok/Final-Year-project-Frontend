"use client";
/**
 * /signup — create account (mirrors /login split-screen design).
 */
import { useState, Suspense, type FormEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Stethoscope, Mail, Lock, ArrowRight, ShieldCheck, UserRound,
} from "lucide-react";
import { apiJson, setSession, type AuthUser } from "@/lib/api";
import { EASE } from "@/components/Reveal";

function pwStrength(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  return [
    { score: 1, label: "Weak", color: "#e5484d" },
    { score: 2, label: "Fair", color: "#f5a524" },
    { score: 3, label: "Good", color: "#30a46c" },
    { score: 4, label: "Strong", color: "#30a46c" },
  ][Math.max(0, s - 1)] || { score: 0, label: "", color: "var(--muted)" };
}

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/profile";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const strength = pwStrength(password);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiJson<{ token: string; user: AuthUser }>("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName, age, gender }),
      });
      setSession(data.token, data.user);
      router.push(next.startsWith("/") ? next : "/profile");
    } catch (err: any) {
      setError(err.message || "Sign up failed — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: 440 }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
        <span className="chip chip-violet" style={{ fontSize: 12 }}>
          <ShieldCheck size={13} /> Free account
        </span>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", margin: "14px 0 6px" }}>
          Create your <span className="gradient-text">account</span>
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>
          Save every screening, build a health profile, and get a memory-aware AI assistant.
        </p>
      </motion.div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <label style={labelStyle}>Full name</label>
        <div style={inputWrapStyle}>
          <UserRound size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Ali Ahmed" style={inputStyle} autoComplete="name" />
        </div>

        <label style={labelStyle}>Email address</label>
        <div style={inputWrapStyle}>
          <Mail size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" style={inputStyle} autoComplete="email" />
        </div>

        <label style={labelStyle}>Password</label>
        <div style={inputWrapStyle}>
          <Lock size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <input type={showPw ? "text" : "password"} required minLength={6} value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters"
            style={inputStyle} autoComplete="new-password" />
          <button type="button" onClick={() => setShowPw(!showPw)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>
            {showPw ? "Hide" : "Show"}
          </button>
        </div>
        {password && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: -6 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
              <motion.div animate={{ width: `${strength.score * 25}%` }} style={{ height: "100%", background: strength.color, borderRadius: 4 }} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: strength.color }}>{strength.label}</span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Age</label>
            <div style={inputWrapStyle}>
              <input value={age} onChange={(e) => setAge(e.target.value)} placeholder="Optional" style={inputStyle} inputMode="numeric" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Gender</label>
            <div style={inputWrapStyle}>
              <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">Optional</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: "rgba(229,72,77,0.08)", border: "1px solid rgba(229,72,77,0.4)", color: "var(--alert)", padding: "11px 14px", borderRadius: 12, fontSize: 13 }}>
            {error}
          </motion.div>
        )}

        <motion.button type="submit" disabled={busy}
          whileHover={!busy ? { scale: 1.015 } : {}} whileTap={!busy ? { scale: 0.985 } : {}}
          className="btn btn-primary" style={{ marginTop: 4, padding: "14px 20px", fontSize: 15, opacity: busy ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {busy ? "Creating account…" : <>Create account <ArrowRight size={16} /></>}
        </motion.button>
      </form>

      <p style={{ marginTop: 20, fontSize: 14, color: "var(--muted)" }}>
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} style={{ color: "var(--brand)", fontWeight: 700 }}>
          Sign in
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
  borderRadius: 13, padding: "12px 14px", background: "var(--surface)", marginTop: -6,
};
const inputStyle: React.CSSProperties = {
  flex: 1, border: "none", outline: "none", background: "transparent",
  fontSize: 14.5, color: "var(--ink)", fontFamily: "inherit",
};

export default function SignupPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--bg)" }}>
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
            One account.{" "}
            <span style={{ background: "linear-gradient(90deg,#7dd3fc,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Your entire screening history.
            </span>
          </motion.h2>
          <p style={{ marginTop: 18, fontSize: 14.5, color: "rgba(255,255,255,0.7)", maxWidth: 440, lineHeight: 1.7 }}>
            Every scan you analyze, every PDF you generate, and every detail you share with the AI
            Health Assistant is saved securely to your personal profile — nothing is lost between visits.
          </p>
        </div>
        <p style={{ position: "relative", zIndex: 1, fontSize: 11.5, color: "rgba(255,255,255,0.4)" }}>
          Passwords are hashed (bcrypt). Your data is never shared.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 32px", overflowY: "auto" }}>
        <Suspense fallback={null}>
          <SignupForm />
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
