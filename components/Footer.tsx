"use client";
import Link from "next/link";
import { Brand } from "@/components/Navbar";

export default function Footer({ onContact }: { onContact?: () => void }) {
  return (
    <footer style={{ position: "relative", overflow: "hidden", background: "var(--bg-alt)" }}>
      <div className="mesh-divider" />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "64px 24px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 40 }}>
          <div>
            <Brand />
            <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 14, maxWidth: 280, lineHeight: 1.7 }}>
              AI-powered medical image screening with explainable Grad-CAM visualizations.
              A screening aid — not a replacement for clinical judgment.
            </p>
          </div>
          <div>
            <p className="eyebrow" style={{ marginBottom: 16 }}>Analyze</p>
            {[
              { label: "Fracture Detection", href: "/analyze/fracture" },
              { label: "Brain Tumor", href: "/analyze/brain" },
              { label: "Kidney Disease", href: "/analyze/kidney" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="footer-link">{l.label}</Link>
            ))}
          </div>
          <div>
            <p className="eyebrow" style={{ marginBottom: 16 }}>Platform</p>
            <Link href="/ai-doctor" className="footer-link">AI Health Assistant</Link>
            <a href="#how-it-works" className="footer-link">How it works</a>
            <a href="#team" className="footer-link">Team</a>
            <button onClick={onContact} className="footer-link" style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              Contact
            </button>
          </div>
          <div>
            <p className="eyebrow" style={{ marginBottom: 16 }}>Academic</p>
            <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.8 }}>
              Final Year Project<br />
              Sindh Madressatul Islam University (SMIU)<br />
              Department of Computer Science
            </p>
          </div>
        </div>
        <div className="mesh-divider" style={{ margin: "40px 0 24px" }} />
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, fontSize: 12.5, color: "var(--muted)" }}>
          <span>© 2026 MedAI Platform — SMIU Final Year Project.</span>
          <span>Screening information only · Not a medical diagnosis</span>
        </div>
      </div>
    </footer>
  );
}
