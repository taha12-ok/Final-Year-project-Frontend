"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Activity, Shield, Zap, FileText, Brain, Stethoscope, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import ParticlesBackground from "@/components/ParticlesBackground";
import AIVisualization from "@/components/AIVisualization";
import FloatingGlassCard from "@/components/FloatingGlassCard";
import AnimatedCounter from "@/components/AnimatedCounter";
import GradientOrb from "@/components/GradientOrb";
import ScrollReveal from "@/components/ScrollReveal";

// ── Data ──
const TEAM = [
  { name: "Taha Shabbir",    id: "CSC-23S-062", role: "AI & Model Training",   desc: "Designed system architecture and trained all 3 AI models.", img: "/taha.png"   },
  { name: "Muhammad Haider", id: "CSC-23S-061", role: "Data Preprocessing ", desc: "Handled dataset preprocessing and augmentation, built the frontend interface, and managed project documentation.", img: "/haider.png" },
  { name: "Ali Baba",        id: "CSC-23S-093", role: "Model Evaluation & Deployment", desc: "Evaluated model performance across test sets and managed deployment infrastructure and QA.", img: "/ali.png"    },
];

const MODELS = [
  { label: "Fracture Detection", href: "/analyze/fracture", desc: "Bone X-ray fracture analysis",  icon: "🦴", acc: "86%", color: "#C9A84C" },
  { label: "Brain Tumor",        href: "/analyze/brain",    desc: "MRI tumor classification",       icon: "🧠", acc: "83%", color: "#BA68C8" },
  { label: "Kidney Disease",     href: "/analyze/kidney",   desc: "CT scan analysis",               icon: "🫘", acc: "85%", color: "#FFB74D" },
];

const FEATURES = [
  { icon: <Brain size={24}/>,       title: "3 Specialized Models",    desc: "Each ResNet50 model fine-tuned for a specific medical imaging modality with transfer learning." },
  { icon: <Activity size={24}/>,    title: "Grad-CAM Heatmaps",       desc: "Visual AI explanations showing exactly where the model detected abnormalities in the scan." },
  { icon: <Zap size={24}/>,         title: "Real-time Analysis",       desc: "Sub-3-second GPU-accelerated inference for fast screening support." },
  { icon: <FileText size={24}/>,    title: "PDF Report Generator",     desc: "Professional patient reports with Grad-CAM visualization generated automatically." },
  { icon: <Shield size={24}/>,      title: "Privacy First",            desc: "Stateless processing — no patient data stored. All analysis done locally." },
  { icon: <Stethoscope size={24}/>, title: "AI Health Assistant",      desc: "Describe symptoms and get AI-assisted guidance with specialist recommendations." },
];

const STEPS = [
  { num: "01", icon: "📤", title: "Upload Medical Scan",   desc: "Upload X-ray, MRI, or CT Scan" },
  { num: "02", icon: "🧑‍⚕️", title: "Enter Patient Info",   desc: "Fill in basic patient details for the screening report" },
  { num: "03", icon: "🤖", title: "Get AI Analysis",       desc: "Receive results with confidence score, Grad-CAM heatmap & PDF report" },
];

const PIPELINE = [
  { icon: "📤", label: "Upload Image" },
  { icon: "⚙️", label: "Preprocessing" },
  { icon: "🧠", label: "AI Model" },
  { icon: "🔥", label: "Grad-CAM" },
  { icon: "📊", label: "Results" },
  { icon: "📄", label: "PDF Report" },
];

const FAQS = [
  { q: "What is MedAI Platform?",         a: "MedAI is an AI-assisted medical image screening system developed as a Final Year Project at Sindh Madressatul Islam University. It provides AI-assisted screening support across 3 imaging modalities and does not replace professional diagnosis." },
  { q: "How accurate are the models?",    a: "Our models achieve between 83% to 86% accuracy on held-out test data, depending on the imaging modality. These are screening-support tools — results should always be confirmed by a qualified radiologist or physician." },
  { q: "What technology stack is used?",  a: "Python FastAPI backend, PyTorch with ResNet50 for AI, Grad-CAM for visualization, Next.js 14 frontend, and ReportLab for PDF generation." },
  { q: "Is this suitable for clinical use?", a: "MedAI is an academic research project for educational purposes. All results must be reviewed and validated by qualified medical professionals." },
  { q: "What is the AI Health Assistant feature?",  a: "The AI Health Assistant reviews your symptoms and medical history to suggest possible conditions worth discussing with a doctor, recommend relevant tests, and point you to the right screening model. It does not provide a diagnosis." },
];

export default function LandingPage() {
  const [contactOpen, setContactOpen] = useState(false);
  const [form, setForm]             = useState({ name: "", email: "", message: "" });
  const [sending, setSending]       = useState(false);
  const [sent, setSent]             = useState(false);
  const [activeFaq, setActiveFaq]   = useState<number | null>(null);
  const [mousePos, setMousePos]     = useState({ x: 0, y: 0 });
  const [scrolled, setScrolled]     = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, -150]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const m = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", m);
    return () => window.removeEventListener("mousemove", m);
  }, []);

  const handleContact = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        setTimeout(() => { setContactOpen(false); setSent(false); setForm({ name: "", email: "", message: "" }); }, 2500);
      }
    } catch {}
    setSending(false);
  };

  const textColor     = "var(--text-primary)";
  const subTextColor  = "var(--text-secondary)";
  const mutedColor    = "var(--text-muted)";
  const bgColor       = "var(--black)";
  const bg2Color      = "var(--dark1)";
  const goldColor     = "var(--gold)";

  return (
    <main style={{ backgroundColor: bgColor, minHeight: "100vh", color: textColor, position: "relative" }}>
      <ParticlesBackground />
      <div className="mouse-glow" style={{ left: mousePos.x, top: mousePos.y }} />

      {/* ══════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════ */}
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="fixed top-0 left-0 right-0 z-50"
        style={{ display: "flex", justifyContent: "center", padding: scrolled ? "12px 16px" : "20px 16px", transition: "padding 0.35s ease" }}
      >
        <nav
          className={`navbar-pill ${scrolled ? "navbar-pill-scrolled" : ""}`}
          style={{
            width: "100%", maxWidth: 1140,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px 10px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Image src="/logo.png" alt="SMI" width={32} height={32}
              onError={(e: any) => e.target.style.display = "none"} />
            <span className="gold-text" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 19 }}>MedAI</span>
            <span style={{ color: mutedColor, fontSize: 12 }}>| Platform</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            {[
              { label: "Models", id: "models" },
              { label: "How it works", id: "how-it-works" },
              { label: "Team", id: "team" },
              { label: "FAQ", id: "faq" },
            ].map(l => (
              <a key={l.id} href={`#${l.id}`}
                style={{ color: subTextColor, fontSize: 14, fontWeight: 500, textDecoration: "none" }}
                className="nav-link hidden md:block">{l.label}</a>
            ))}
            <a onClick={() => setContactOpen(true)}
              style={{ color: subTextColor, fontSize: 14, fontWeight: 500, textDecoration: "none", cursor: "pointer" }}
              className="nav-link hidden md:block">Contact</a>

            <motion.a href="#models" whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}
              className="btn-gold" style={{ padding: "10px 22px", fontSize: 14 }}>
              Start Analysis
            </motion.a>
          </div>
        </nav>
      </motion.div>

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section ref={heroRef} className="hero-bg bg-grid"
        style={{ minHeight: "100vh", display: "flex", alignItems: "center", paddingTop: 160, paddingBottom: 100, paddingLeft: 32, paddingRight: 32, position: "relative", overflow: "hidden" }}>

        {/* Decorative orbs */}
        <GradientOrb color="rgba(47,143,255,0.42)" size={460} top="5%" right="0%" duration={10} />
        <GradientOrb color="rgba(255,176,56,0.40)" size={380} top="0%" left="10%" duration={12} delay={1.5} />
        <GradientOrb color="rgba(34,201,166,0.42)" size={360} bottom="0%" left="30%" duration={9} delay={3} />

        <motion.div style={{ y: heroY, maxWidth: 880, margin: "0 auto", width: "100%", position: "relative", zIndex: 1, textAlign: "center" }}>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ display: "flex", justifyContent: "center" }}>
            <div className="badge" style={{ marginBottom: 28 }}>🏛️ Sindh Madressatul Islam University — FYP 2026</div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, type: "spring", stiffness: 80 }}
            style={{ fontSize: "clamp(36px, 6vw, 66px)", fontWeight: 900, lineHeight: 1.12, fontFamily: "'Plus Jakarta Sans',sans-serif", marginBottom: 24 }}>
            AI screening that shows its <span className="gold-text">reasoning.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            style={{ color: subTextColor, fontSize: 18, maxWidth: 640, margin: "0 auto 40px", lineHeight: 1.8 }}>
            Upload an X-ray, MRI, or CT scan. Three specialized models return a confidence score and a Grad-CAM heatmap — a second opinion you can hand to a physician, in under three seconds.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", marginBottom: 18 }}>
            <a href="#models" className="btn-gold" style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
              Analyze a Scan <ArrowRight size={18} />
            </a>
            <a href="#how-it-works" className="btn-outline-gold" style={{ fontSize: 16 }}>
              View Sample Report
            </a>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
            style={{ color: mutedColor, fontSize: 13, marginBottom: 60 }}>
            No signup needed · Results in under 3 seconds ·{" "}
            <Link href="/ai-doctor" style={{ color: goldColor, textDecoration: "underline" }}>
              Try the AI Health Assistant
            </Link>
          </motion.p>

          {/* AI visualization mockup */}
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.8 }}>
            <AIVisualization />
          </motion.div>

          {/* Stats row */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
            style={{ display: "flex", flexWrap: "wrap", gap: 40, justifyContent: "center", marginTop: 56 }}>
            {[["3", "AI Models"], ["85%", "Avg Accuracy"], ["<3s", "Inference Time"], ["50K+", "Training Images"]].map(([n, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <p className="gold-text" style={{ fontSize: 32, fontWeight: 900, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                  <AnimatedCounter value={n} />
                </p>
                <p style={{ color: mutedColor, fontSize: 13, marginTop: 2 }}>{l}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}
          style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", color: mutedColor, fontSize: 12, textAlign: "center" }}>
          <div style={{ color: goldColor, fontSize: 20 }}>↓</div>
          <p>Scroll to explore</p>
        </motion.div>
      </section>

      <div className="gold-divider" />

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      <section id="how-it-works" style={{ padding: "100px 32px", backgroundColor: bg2Color }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ textAlign: "center", marginBottom: 72 }}>
            <p className="badge" style={{ marginBottom: 16 }}>Process</p>
            <h2 style={{ fontSize: 44, fontWeight: 900 }}>How It <span className="gold-text">Works</span></h2>
            <div className="section-line" />
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {STEPS.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i*0.15, type: "spring" }}
                whileHover={{ y: -8 }} className="card" style={{ padding: 36, textAlign: "center" }}>
                <div className="step-num">{s.num}</div>
                <div style={{ fontSize: 44, marginBottom: 16 }}>{s.icon}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>{s.title}</h3>
                <p style={{ color: subTextColor, fontSize: 14, lineHeight: 1.7 }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ══════════════════════════════════════════
          PIPELINE ANIMATION
      ══════════════════════════════════════════ */}
      <section style={{ padding: "80px 32px", backgroundColor: bgColor, overflow: "hidden" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ textAlign: "center", marginBottom: 56 }}>
            <p className="badge" style={{ marginBottom: 16 }}>Pipeline</p>
            <h2 style={{ fontSize: 44, fontWeight: 900 }}>AI Detection <span className="gold-text">Pipeline</span></h2>
            <div className="section-line" />
            <p style={{ color: subTextColor, marginTop: 16 }}>From image upload to screening report</p>
          </motion.div>

          {/* Pipeline Flow */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
            {/* Animated line */}
            <div style={{ position: "absolute", top: "50%", left: "5%", right: "5%", height: 2, transform: "translateY(-24px)", zIndex: 0 }}>
              <div style={{ width: "100%", height: "100%", background: "rgba(37,99,235,0.1)", borderRadius: 10 }} />
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "100%" }}
                viewport={{ once: true }}
                transition={{ duration: 2, ease: "easeInOut", delay: 0.5 }}
                style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "linear-gradient(90deg, #0D9488, #2563EB)", borderRadius: 10 }} />
            </div>

            {PIPELINE.map((p, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.25 + 0.3, type: "spring", stiffness: 200 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, position: "relative", zIndex: 1 }}>
                <motion.div
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  animate={{ boxShadow: ["0 0 0px rgba(37,99,235,0)", "0 0 20px rgba(37,99,235,0.35)", "0 0 0px rgba(37,99,235,0)"] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                  style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, var(--dark3), var(--dark2))", border: "2px solid rgba(47,143,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, cursor: "default" }}>
                  {p.icon}
                </motion.div>
                <p style={{ color: subTextColor, fontSize: 11, fontWeight: 600, textAlign: "center", letterSpacing: 0.5 }}>{p.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ══════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════ */}
      <section id="features" style={{ padding: "100px 32px", backgroundColor: bg2Color }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ textAlign: "center", marginBottom: 72 }}>
            <p className="badge" style={{ marginBottom: 16 }}>Capabilities</p>
            <h2 style={{ fontSize: 44, fontWeight: 900 }}>Why <span className="gold-text">MedAI</span></h2>
            <div className="section-line" />
            <p style={{ color: subTextColor, marginTop: 16 }}>Built for precision, designed for healthcare professionals</p>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {FEATURES.map((f, i) => (
              <ScrollReveal key={i} type="blur" delay={i * 0.08}>
                <motion.div whileHover={{ y: -6 }} className="card" style={{ padding: 28, height: "100%" }}>
                  <div className="feature-icon" style={{ color: goldColor }}>{f.icon}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
                  <p style={{ color: subTextColor, fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ══════════════════════════════════════════
          MODELS
      ══════════════════════════════════════════ */}
      <section id="models" style={{ padding: "100px 32px", backgroundColor: bgColor }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ textAlign: "center", marginBottom: 72 }}>
            <p className="badge" style={{ marginBottom: 16 }}>Detection</p>
            <h2 style={{ fontSize: 44, fontWeight: 900 }}>AI Detection <span className="gold-text">Models</span></h2>
            <div className="section-line" />
            <p style={{ color: subTextColor, marginTop: 16 }}>Select a modality to begin your analysis</p>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {MODELS.map((m, i) => (
              <motion.div key={m.href}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i*0.08, type: "spring" }}>
                <Link href={m.href} style={{ textDecoration: "none" }}>
                  <FloatingGlassCard className="model-card" maxTilt={5}>
                    {/* Colored top accent */}
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${m.color}88, ${m.color})`, borderRadius: "18px 18px 0 0" }} />
                    <div style={{ fontSize: 40, marginBottom: 14 }}>{m.icon}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: textColor }}>{m.label}</h3>
                      <span style={{ fontSize: 11, color: m.color, fontWeight: 700, background: `${m.color}20`, padding: "3px 8px", borderRadius: 6 }}>{m.acc}</span>
                    </div>
                    <p style={{ color: subTextColor, fontSize: 13, marginBottom: 20 }}>{m.desc}</p>
                    <div style={{ color: goldColor, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      Analyze <ArrowRight size={14} />
                    </div>
                  </FloatingGlassCard>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ══════════════════════════════════════════
          AI DOCTOR
      ══════════════════════════════════════════ */}
      <section style={{ padding: "100px 32px", backgroundColor: bg2Color }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>

            {/* Left */}
            <div>
              <p className="badge" style={{ marginBottom: 20 }}>✨ New Feature</p>
              <h2 style={{ fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 20, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                AI Health <span className="gold-text">Assistant</span>
              </h2>
              <p style={{ color: subTextColor, fontSize: 16, lineHeight: 1.8, marginBottom: 32 }}>
                Describe your symptoms and medical history. Our AI Health Assistant analyzes your condition, suggests possible conditions to discuss with a doctor, recommends tests, and guides you to the right screening model. It does not replace a doctor's diagnosis.
              </p>
              {[
                "📋 Analyzes complete medical history",
                "🔍 Identifies possible conditions to discuss",
                "🧪 Recommends specific tests & scans",
                "🏥 Guides to correct AI screening model",
                "👨‍⚕️ Suggests specialist to consult",
                "🚨 Assesses urgency level",
              ].map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i*0.1 }}
                  style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: goldColor, flexShrink: 0 }} />
                  <span style={{ color: "var(--text-primary)", fontSize: 15 }}>{f}</span>
                </motion.div>
              ))}
              <Link href="/ai-doctor" style={{ textDecoration: "none" }}>
                <motion.button whileHover={{ scale: 1.03, y: -3 }} whileTap={{ scale: 0.97 }}
                  className="btn-gold" style={{ marginTop: 32, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  🩺 Try AI Health Assistant <ArrowRight size={18} />
                </motion.button>
              </Link>
            </div>

            {/* Right — Preview */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="pulse-glow"
              style={{ background: "linear-gradient(135deg, var(--dark3), var(--dark2))", border: "1px solid rgba(37,99,235,0.15)", borderRadius: 24, padding: 32, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #0D9488, #2563EB)" }} />
              <div style={{ fontSize: 40, marginBottom: 16 }}>🩺</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: goldColor }}>Sample AI Assessment</h3>
              {[
                { label: "Patient",   value: "Ahmed Khan, 35M" },
                { label: "Symptoms",  value: "Severe wrist pain after a fall" },
                { label: "Duration",  value: "3 days" },
                { label: "Severity",  value: "High" },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(37,99,235,0.08)" }}>
                  <span style={{ color: mutedColor, fontSize: 13 }}>{r.label}</span>
                  <span style={{ color: textColor, fontSize: 13, fontWeight: 500 }}>{r.value}</span>
                </div>
              ))}
              <div style={{ marginTop: 20, padding: 16, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 12 }}>
                <p style={{ color: "#E57373", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>⚠️ URGENCY: HIGH</p>
                <p style={{ color: subTextColor, fontSize: 12, lineHeight: 1.6 }}>Possible bone fracture. Immediate X-ray recommended.</p>
              </div>
              <div style={{ marginTop: 12, padding: 12, background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.18)", borderRadius: 12 }}>
                <p style={{ color: goldColor, fontSize: 12, fontWeight: 700 }}>🦴 Suggested: Fracture Detection AI Model</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ══════════════════════════════════════════
          TEAM  ← FIXED SECTION
      ══════════════════════════════════════════ */}
      <section id="team" style={{ padding: "100px 32px", backgroundColor: bgColor }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ textAlign: "center", marginBottom: 72 }}>
            <p className="badge" style={{ marginBottom: 16 }}>The Team</p>
            <h2 style={{ fontSize: 44, fontWeight: 900 }}>Meet The <span className="gold-text">Developers</span></h2>
            <div className="section-line" />
            <p style={{ color: subTextColor, marginTop: 16 }}>BS Computer Science 2023 — Sindh Madressatul Islam University</p>
          </motion.div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 32,
          }}>
            {TEAM.map((member, i) => (
              <ScrollReveal key={member.name} type={i % 2 === 0 ? "fade-up" : "scale"} delay={i * 0.15}>
              <FloatingGlassCard
                className="team-card"
                maxTilt={4}
                style={{
                  padding: "48px 36px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <div
                  className="avatar-ring"
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    padding: 4,
                    background: "linear-gradient(135deg, #1E40AF, #2563EB)",
                    marginBottom: 24,
                    flexShrink: 0,
                  }}
                >
                  <div
                    className="avatar-inner"
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: "var(--dark2)",
                    }}
                  >
                    <img
                      src={member.img}
                      alt={member.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e: any) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=2563EB&color=fff&size=120&bold=true`;
                      }}
                    />
                  </div>
                </div>

                <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{member.name}</h3>
                <p style={{ color: mutedColor, fontSize: 12, marginBottom: 14, letterSpacing: 1 }}>{member.id}</p>
                <span className="badge-red" style={{ marginBottom: 18, fontSize: 13, padding: "6px 14px" }}>{member.role}</span>
                <p style={{ color: subTextColor, fontSize: 14, lineHeight: 1.8 }}>{member.desc}</p>
              </FloatingGlassCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ══════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════ */}
      <section id="faq" style={{ padding: "100px 32px", backgroundColor: bg2Color }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ textAlign: "center", marginBottom: 72 }}>
            <p className="badge" style={{ marginBottom: 16 }}>FAQ</p>
            <h2 style={{ fontSize: 44, fontWeight: 900 }}>Common <span className="gold-text">Questions</span></h2>
            <div className="section-line" />
          </motion.div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FAQS.map((faq, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i*0.1 }} className="faq-item">
                <button onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  style={{ width: "100%", padding: "20px 24px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", color: textColor }}>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{faq.q}</span>
                  {activeFaq === i ? <ChevronUp size={18} color={goldColor} /> : <ChevronDown size={18} color={goldColor} />}
                </button>
                <AnimatePresence>
                  {activeFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                      style={{ padding: "0 24px 20px", color: subTextColor, fontSize: 14, lineHeight: 1.8 }}>
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA
      ══════════════════════════════════════════ */}
      <section style={{ padding: "64px 32px 100px" }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="cta-section pulse-glow"
          style={{ maxWidth: 900, margin: "0 auto", padding: "80px 48px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, marginBottom: 20 }}>
            Ready to <span className="gold-text">Transform</span> Screening?
          </h2>
          <p style={{ color: subTextColor, fontSize: 18, maxWidth: 500, margin: "0 auto 40px", lineHeight: 1.7 }}>
            Start screening medical images with AI-assisted precision today.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#models" className="btn-gold" style={{ fontSize: 17, display: "flex", alignItems: "center", gap: 8 }}>
              🚀 Start Analyzing <ArrowRight size={18} />
            </a>
            <Link href="/ai-doctor" className="btn-outline-gold" style={{ fontSize: 17 }}>
              🩺 AI Health Assistant
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer style={{ borderTop: "1px solid rgba(37,99,235,0.12)", padding: "32px", backgroundColor: bgColor }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Image src="/logo.png" alt="Logo" width={28} height={28} onError={(e: any) => e.target.style.display = "none"} />
            <span className="gold-text" style={{ fontWeight: 700, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>MedAI Platform</span>
          </div>
          <p style={{ color: mutedColor, fontSize: 13 }}>© 2026 Sindh Madressatul Islam University — Final Year Project</p>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy", "Terms", "Docs"].map(l => (
              <a key={l} href="#" style={{ color: mutedColor, fontSize: 13, textDecoration: "none" }} className="hover:text-white transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>

      {/* ══════════════════════════════════════════
          CONTACT MODAL
      ══════════════════════════════════════════ */}
      <AnimatePresence>
        {contactOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
            onClick={() => setContactOpen(false)}>
            <motion.div initial={{ scale: 0.85, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }} transition={{ type: "spring", damping: 20 }}
              style={{ background: "var(--dark2)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: 24, padding: 40, width: "90%", maxWidth: 480, position: "relative" }}
              onClick={e => e.stopPropagation()}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #0D9488, #2563EB)", borderRadius: "24px 24px 0 0" }} />
              <h2 className="gold-text" style={{ fontSize: 24, fontWeight: 900, marginBottom: 24, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>📩 Contact Us</h2>
              {sent ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
                  <p className="gold-text" style={{ fontSize: 20, fontWeight: 700 }}>Message Sent!</p>
                  <p style={{ color: subTextColor, fontSize: 14, marginTop: 8 }}>We'll get back to you soon.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[{ ph: "Your Full Name", key: "name", type: "text" }, { ph: "Your Email Address", key: "email", type: "email" }].map(f => (
                    <input key={f.key} type={f.type} placeholder={f.ph} value={(form as any)[f.key]}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      style={{ background: "var(--dark1)", border: "1px solid rgba(37,99,235,0.18)", borderRadius: 12, padding: "14px 18px", color: textColor, outline: "none", fontSize: 14 }} />
                  ))}
                  <textarea placeholder="Your Message" rows={5} value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    style={{ background: "var(--dark1)", border: "1px solid rgba(37,99,235,0.18)", borderRadius: 12, padding: "14px 18px", color: textColor, outline: "none", fontSize: 14, resize: "none" }} />
                  <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={() => setContactOpen(false)}
                      style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid rgba(37,99,235,0.18)", background: "none", color: subTextColor, fontWeight: 600, cursor: "pointer" }}>
                      Cancel
                    </button>
                    <button onClick={handleContact} disabled={sending} className="btn-gold"
                      style={{ flex: 1, padding: 14, borderRadius: 12, fontSize: 14 }}>
                      {sending ? "Sending..." : "Send Message"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}