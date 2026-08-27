"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Activity } from "lucide-react";

interface NavbarProps {
  variant?: "home" | "app";
  right?: React.ReactNode;
  onContact?: () => void;
}

/** Brand mark — gradient tile with a pulse glyph. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
      <span
        className="pulse-ring"
        style={{
          width: 36, height: 36, borderRadius: 11, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, var(--brand), var(--violet))",
          color: "#fff", boxShadow: "0 6px 16px rgba(43,75,223,0.35)",
        }}
      >
        <Activity size={18} strokeWidth={2.4} />
      </span>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--ink)", letterSpacing: "-0.02em" }}>
        MedAI <span style={{ color: "var(--muted)", fontWeight: 500 }}>{compact ? "" : "Platform"}</span>
      </span>
    </Link>
  );
}

const HOME_LINKS = [
  { label: "Models", href: "#models" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Team", href: "#team" },
  { label: "FAQ", href: "#faq" },
];

/**
 * Single site-wide navigation shell: frosted pill, scroll-aware depth.
 * Home variant shows anchor links + CTA; app pages get a back link + slot.
 */
export default function Navbar({ variant = "home", right, onContact }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: "fixed", top: 14, left: 0, right: 0, zIndex: 100, padding: "0 16px" }}
    >
      <nav
        className={`nav-shell ${scrolled ? "nav-scrolled" : ""}`}
        style={{
          maxWidth: 1180, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 18px", gap: 16,
        }}
      >
        {variant === "home" ? (
          <>
            <Brand />
            <div style={{ gap: 28, alignItems: "center" }} className="hidden md:flex">
              {HOME_LINKS.map((l) => (
                <a key={l.href} href={l.href} className="nav-link">{l.label}</a>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={onContact}
                className="nav-link hidden md:block"
                style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}
              >
                Contact
              </button>
              <Link href="/analyze/fracture" className="btn btn-primary" style={{ padding: "10px 20px", fontSize: 14 }}>
                Start Analysis
              </Link>
            </div>
          </>
        ) : (
          <>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--body)", fontSize: 14, fontWeight: 600, transition: "color 0.2s" }}>
              <ArrowLeft size={17} /> Back to home
            </Link>
            <div className="hidden md:block"><Brand compact /></div>
            {right}
          </>
        )}
      </nav>
    </motion.header>
  );
}
