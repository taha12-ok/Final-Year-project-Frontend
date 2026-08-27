"use client";
import { useState, useRef, useEffect, cloneElement, isValidElement, type ReactElement } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import Link from "next/link";
import {
  Activity, Shield, Zap, FileText, Brain, Stethoscope,
  ChevronDown, ArrowRight, ArrowUpRight, Sparkles,
  Bone, Droplets, Upload, UserRound, Bot, Settings,
  Flame, BarChart3, Check, AlertTriangle, Rocket, Mail, Plus,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Reveal, { EASE } from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import MagneticButton from "@/components/MagneticButton";
import AnimatedCounter from "@/components/AnimatedCounter";
import HeroScan from "@/components/HeroScan";
import PinnedTeam, { TeamMember } from "@/components/PinnedTeam";
import Field from "@/components/Field";

/* ════════════════════════════ Data ════════════════════════════ */

const TEAM: TeamMember[] = [
  {
    name: "Taha Shabbir", id: "CSC-23S-062", role: "AI & Model Training", image: "/taha.png",
    description: "Designed the overall system architecture and trained all three AI models — fracture, brain-tumor and kidney pipelines — with transfer learning on ResNet50.",
    focus: ["Model Training", "System Architecture", "Groq Integration"],
  },
  {
    name: "Muhammad Haider", id: "CSC-23S-061", role: "Data Preprocessing", image: "/haider.png",
    description: "Handled dataset preprocessing and augmentation, and managed project documentation across the build.",
    focus: ["Data Pipelines", "Data Processing", "Documentation"],
  },
  {
    name: "Ali Baba", id: "CSC-23S-093", role: "Model Evaluation & Deployment", image: "/ali.png",
    description: "Evaluated model performance across held-out test sets and managed deployment infrastructure, QA and release readiness.",
    focus: ["Evaluation", "Deployment", "QA"],
  },
];

/**
 * Models — each entry now carries a `bg` (full-bleed background image) used
 * by the auto-cycling Models section. Drop real screenshots/photos into
 * /public/models/ and point these paths at them. Until then it falls back
 * to a rich color-matched gradient so nothing looks broken.
 */
const MODELS = [
  {
    label: "Fracture Detection", href: "/analyze/fracture",
    desc: "Bone X-ray fracture analysis with region-level heatmaps.",
    icon: <Bone size={40} />, acc: "86%",
    color: "var(--violet)", soft: "var(--violet-soft)",
    bg: "/models/fracture-bg.jpg",
    fallbackGrad: "linear-gradient(135deg, #2A1B5E 0%, #5B3FE4 55%, #8B7BF0 100%)",
  },
  {
    label: "Brain Tumor", href: "/analyze/brain",
    desc: "MRI tumor classification with explainable Grad-CAM.",
    icon: <Brain size={40} />, acc: "83%",
    color: "var(--brand)", soft: "var(--brand-soft)",
    bg: "/models/brain-bg.jpg",
    fallbackGrad: "linear-gradient(135deg, #0E1A56 0%, #2B4BDF 55%, #7CA0FF 100%)",
  },
  {
    label: "Kidney Disease", href: "/analyze/kidney",
    desc: "CT scan analysis for kidney abnormalities.",
    icon: <Droplets size={40} />, acc: "85%",
    color: "var(--teal)", soft: "var(--teal-soft)",
    bg: "/models/kidney-bg.jpg",
    fallbackGrad: "linear-gradient(135deg, #063A36 0%, #0E8C7F 55%, #5EEAD4 100%)",
  },
];

const FEATURES = [
  { icon: <Brain size={22} />,       title: "3 Specialized Models",   desc: "Each ResNet50 model fine-tuned for a specific medical imaging modality with transfer learning.", tint: "var(--brand-soft)",  col: "var(--brand)" },
  { icon: <Activity size={22} />,    title: "Grad-CAM Heatmaps",      desc: "Visual AI explanations showing exactly where the model detected abnormalities in the scan.",     tint: "var(--violet-soft)", col: "var(--violet)" },
  { icon: <Zap size={22} />,         title: "Real-time Analysis",     desc: "Sub-3-second GPU-accelerated inference for fast screening support.",                            tint: "var(--teal-soft)",   col: "var(--teal)" },
  { icon: <FileText size={22} />,    title: "PDF Report Generator",   desc: "Professional patient reports with Grad-CAM visualization generated automatically.",             tint: "var(--brand-soft)",  col: "var(--brand)" },
  { icon: <Shield size={22} />,      title: "Privacy First",          desc: "Stateless processing — no patient data stored. All analysis done locally.",                     tint: "var(--teal-soft)",   col: "var(--teal-deep)" },
  { icon: <Stethoscope size={22} />, title: "AI Health Assistant",    desc: "Describe symptoms and get AI-assisted guidance with specialist recommendations.",               tint: "var(--violet-soft)", col: "#5B3FE4" },
];

const STEPS = [
  { num: "01", icon: <Upload size={26} />,   title: "Upload Medical Scan", desc: "Drop in an X-ray, MRI, or CT scan — or pick a bundled test image to see it in action." },
  { num: "02", icon: <UserRound size={26} />, title: "Enter Patient Info",  desc: "Fill in basic patient details so the screening report is complete and personal." },
  { num: "03", icon: <Bot size={26} />,       title: "Get AI Analysis",     desc: "Receive a result with confidence score, Grad-CAM heatmap and downloadable PDF." },
];

const PIPELINE = [
  { icon: <Upload size={24} />,     label: "Upload Image" },
  { icon: <Settings size={24} />,   label: "Preprocessing" },
  { icon: <Brain size={24} />,      label: "AI Model" },
  { icon: <Flame size={24} />,      label: "Grad-CAM" },
  { icon: <BarChart3 size={24} />,  label: "Results" },
  { icon: <FileText size={24} />,   label: "PDF Report" },
];

const FAQS = [
  { q: "What is MedAI Platform?",                  a: "MedAI is an AI-assisted medical image screening system developed as a Final Year Project at Sindh Madressatul Islam University. It provides AI-assisted screening support across 3 imaging modalities and does not replace professional diagnosis." },
  { q: "How accurate are the models?",             a: "Our models achieve between 83% to 86% accuracy on held-out test data, depending on the imaging modality. These are screening-support tools — results should always be confirmed by a qualified radiologist or physician." },
  { q: "What technology stack is used?",           a: "Python FastAPI backend, PyTorch with ResNet50 for AI, Grad-CAM for visualization, Next.js 14 frontend, and ReportLab for PDF generation." },
  { q: "Is this suitable for clinical use?",       a: "MedAI is an academic research project for educational purposes. All results must be reviewed and validated by qualified medical professionals." },
  { q: "What is the AI Health Assistant feature?", a: "The AI Health Assistant reviews your symptoms and medical history to suggest possible conditions worth discussing with a doctor, recommend relevant tests, and point you to the right screening model. It does not provide a diagnosis." },
];

/* ═══════════════════════ Motion variants ═══════════════════════ */

const heroWords: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } },
};
const heroWord: Variants = {
  hidden: { opacity: 0, y: "0.85em", filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE } },
};

/* ═══════════════════════ Hover variants ═══════════════════════ */

const cardLift: Variants = { rest: { y: 0 }, hover: { y: -7 } };
const iconSpin: Variants = { rest: { rotate: 0 }, hover: { rotate: 360 } };

const sampleCardContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
};
const sampleCardRow: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

/** Re-renders a lucide icon element at a different pixel size. */
function cloneIcon(icon: ReactElement, size: number) {
  return isValidElement(icon) ? cloneElement(icon as any, { size }) : icon;
}

/* ═══════════════════════════ Page ═══════════════════════════ */

export default function LandingPage() {
  const [contactOpen, setContactOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [contactError, setContactError] = useState("");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activeModel, setActiveModel] = useState(0);
  const [imgFailed, setImgFailed] = useState<Record<number, boolean>>({});

  // ── Pipeline "train" — lock scroll until the line + icons finish playing ──
  const pipelineRef = useRef<HTMLDivElement>(null);
  const pipelinePlayed = useRef(false);
  useEffect(() => {
    const el = pipelineRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !pipelinePlayed.current) {
          pipelinePlayed.current = true;
          const prevOverflow = document.body.style.overflow;
          document.body.style.overflow = "hidden";
          window.setTimeout(() => { document.body.style.overflow = prevOverflow || ""; }, 2500);
        }
      },
      { threshold: 0.45 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Models section — auto-cycles the FULL BACKGROUND every 3 seconds,
  // entirely on its own (no buttons needed to drive it). ──
  useEffect(() => {
    const t = window.setInterval(() => setActiveModel((p) => (p + 1) % MODELS.length), 3000);
    return () => window.clearInterval(t);
  }, []);

  const handleContact = async () => {
    setContactError("");
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setContactError("Please fill in all fields before sending.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setContactError("Please enter a valid email address.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setSent(true);
        setTimeout(() => { setContactOpen(false); setSent(false); setForm({ name: "", email: "", message: "" }); }, 2500);
      } else {
        setContactError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setContactError("Something went wrong. Please try again.");
    }
    setSending(false);
  };

  const model = MODELS[activeModel];

  return (
    <main style={{ minHeight: "100vh", position: "relative", overflow: "clip" }}>
      <Navbar onContact={() => setContactOpen(true)} />

      {/* ══════════════════ HERO ══════════════════ */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", padding: "150px 24px 90px", overflow: "hidden" }}>
        <div className="mesh-bg" />
        <div className="grid-overlay" />
        <div className="orb orb-drift" style={{ width: 480, height: 480, top: "-8%", left: "-6%", background: "rgba(43,75,223,0.16)" }} />
        <div className="orb orb-drift-alt" style={{ width: 420, height: 420, top: "6%", right: "-8%", background: "rgba(124,92,252,0.15)" }} />
        <div className="orb orb-drift" style={{ width: 400, height: 400, bottom: "-12%", left: "32%", background: "rgba(20,184,166,0.14)", animationDelay: "4s" }} />

        <div style={{ maxWidth: 1180, margin: "0 auto", width: "100%", position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: "clamp(32px, 5vw, 64px)", alignItems: "center" }} className="split-grid">
          {/* Copy */}
          <div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
              <span className="chip" style={{ marginBottom: 26, padding: "7px 14px", fontSize: 12.5 }}>
                <Sparkles size={13} /> SMIU · Final Year Project 2026
              </span>
            </motion.div>

            <motion.h1 variants={heroWords} initial="hidden" animate="show" className="display-hero" aria-label="AI screening that shows its reasoning.">
              {["AI", "screening", "that", "shows", "its"].map((w) => (
                <motion.span key={w} variants={heroWord} style={{ display: "inline-block", marginRight: "0.26em" }}>{w}</motion.span>
              ))}
              <motion.span variants={heroWord} className="gradient-text" style={{ display: "inline-block" }}>reasoning.</motion.span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
              style={{ fontSize: 17.5, color: "var(--body)", maxWidth: 520, margin: "26px 0 36px", lineHeight: 1.75 }}>
              Upload an X-ray, MRI, or CT scan. Three specialized models return a confidence
              score and a Grad-CAM heatmap — a second opinion you can hand to a physician,
              in under three seconds.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.7, ease: EASE }}
              style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
              <MagneticButton>
                <a href="#models" className="btn btn-primary" style={{ fontSize: 15.5 }}>
                  Analyze a Scan <ArrowRight size={17} />
                </a>
              </MagneticButton>
              <MagneticButton>
                <Link href="/ai-doctor" className="btn btn-secondary" style={{ fontSize: 15.5 }}>
                  <Stethoscope size={16} /> AI Health Assistant
                </Link>
              </MagneticButton>
            </motion.div>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.95 }}
              style={{ fontSize: 13, color: "var(--muted)", marginTop: 22 }}>
              No signup needed · Results in under 3 seconds · Screening aid, not a diagnosis
            </motion.p>
          </div>

          {/* Hero visual */}
          <HeroScan />
        </div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}
          style={{ position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)", textAlign: "center", zIndex: 2 }}
        >
          <motion.div animate={{ y: [0, 9, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ color: "var(--brand)", fontSize: 18, display: "flex", justifyContent: "center" }}><ChevronDown size={18} /></motion.div>
          <p style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Scroll to explore</p>
        </motion.div>
      </section>

      {/* Stats strip */}
      <section style={{ position: "relative", zIndex: 3, padding: "0 24px", marginTop: -34 }}>
        <Reveal type="fade-up" duration={0.8}>
          <div className="panel" style={{ maxWidth: 1020, margin: "0 auto", padding: "26px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, boxShadow: "var(--shadow-md)" }}>
            {[["3", "AI Models"], ["85%", "Avg Accuracy"], ["50K+", "Training Images"]].map(([n, l], i) => (
              <div key={l} style={{ textAlign: "center", borderLeft: i > 0 ? "1px solid var(--border)" : "none" }}>
                <p className="gradient-text" style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, lineHeight: 1.15 }}>
                  <AnimatedCounter value={n} />
                </p>
                <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 4, fontWeight: 500 }}>{l}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ══════════════════ HOW IT WORKS ══════════════════ */}
      <section id="how-it-works" style={{ padding: "120px 24px 100px", background: "var(--bg)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <SectionHeading eyebrow="Process" title={<>From scan to insight in <span className="gradient-text">three steps</span></>} sub="No accounts, no setup — upload a medical image and get a structured screening result." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 22, position: "relative" }}>
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 0.14} style={{ height: "100%" }}>
                <motion.div initial="rest" whileHover="hover" variants={cardLift} transition={{ duration: 0.25, ease: EASE }}
                  className="panel card-hover" style={{ padding: "34px 30px", height: "100%", position: "relative", overflow: "hidden" }}>
                  <span style={{ position: "absolute", top: 12, right: 20, fontFamily: "var(--font-display)", fontSize: 68, fontWeight: 700, color: "transparent", WebkitTextStroke: "1.5px rgba(43,75,223,0.16)", lineHeight: 1 }}>{s.num}</span>
                  <motion.div variants={iconSpin} transition={{ duration: 0.6, ease: EASE }}
                    style={{ width: 56, height: 56, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand)", background: "linear-gradient(135deg, var(--brand-soft), var(--violet-soft))", border: "1px solid rgba(43,75,223,0.14)", marginBottom: 20 }}>
                    {s.icon}
                  </motion.div>
                  <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 10 }}>{s.title}</h3>
                  <p style={{ color: "var(--body)", fontSize: 14.5, lineHeight: 1.7 }}>{s.desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="mesh-divider" />

      {/* ══════════════════ PIPELINE ══════════════════ */}
      <section ref={pipelineRef} style={{ padding: "100px 24px", background: "var(--bg-alt)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <SectionHeading eyebrow="Pipeline" title={<>AI detection <span className="gradient-text">pipeline</span></>} sub="From image upload to screening report — every stage visualized." />
          <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 22 }}>
            <div style={{ position: "absolute", top: 33, left: "6%", right: "6%", height: 2, zIndex: 0 }} className="hidden md:block">
              <div style={{ width: "100%", height: "100%", background: "rgba(43,75,223,0.12)", borderRadius: 10 }} />
              <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: true }}
                transition={{ duration: 1.8, ease: EASE, delay: 0.4 }}
                style={{ position: "absolute", top: 0, left: 0, height: "100%", background: "linear-gradient(90deg, var(--brand), var(--violet), var(--teal))", borderRadius: 10 }} />
              {/* Train — travels along the line as it fills */}
              <motion.div initial={{ left: "0%", opacity: 0 }} whileInView={{ left: "100%", opacity: [0, 1, 1, 0] }} viewport={{ once: true }}
                transition={{ duration: 1.8, ease: EASE, delay: 0.4 }}
                style={{
                  position: "absolute", top: "50%", width: 14, height: 14, borderRadius: "50%", marginTop: -7, marginLeft: -7,
                  background: "#fff", border: "3px solid var(--brand)", boxShadow: "0 0 0 4px rgba(43,75,223,0.18), 0 2px 8px rgba(43,75,223,0.4)",
                }} />
            </div>
            {PIPELINE.map((p, i) => (
              <motion.div key={p.label}
                initial={{ opacity: 0, scale: 0.6, y: 14 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.16 + 0.3, duration: 0.55, ease: EASE }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, position: "relative", zIndex: 1, flex: "1 1 90px" }}>
                <motion.div whileHover={{ scale: 1.12, rotate: 4 }} transition={{ duration: 0.2, ease: EASE }}
                  style={{ width: 66, height: 66, borderRadius: 20, background: "var(--surface)", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand)" }}>
                  {p.icon}
                </motion.div>
                <p style={{ color: "var(--body)", fontSize: 11.5, fontWeight: 600, textAlign: "center", letterSpacing: "0.03em" }}>{p.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="mesh-divider" />

      {/* ══════════════════ FEATURES ══════════════════ */}
      <section id="features" style={{ padding: "110px 24px", background: "var(--bg)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <SectionHeading eyebrow="Capabilities" title={<>Built for precision, <span className="gradient-text">designed for clinicians</span></>} sub="Everything a screening workflow needs — explainability, speed and reports included." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} type="fade-up" delay={(i % 3) * 0.12} style={{ height: "100%" }}>
                <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.25, ease: EASE }}
                  className="panel card-hover" style={{ padding: "28px 26px", height: "100%" }}>
                  <motion.div whileHover={{ scale: 1.08, rotate: -4 }} transition={{ duration: 0.25, ease: EASE }}
                    style={{ width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: f.tint, color: f.col, marginBottom: 18 }}>
                    {f.icon}
                  </motion.div>
                  <h3 style={{ fontSize: 17.5, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ color: "var(--body)", fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="mesh-divider" />

      {/* ══════════════════ MODELS — full-bleed, auto-changing background ══════════════════
          One background at a time. Every 3s it crossfades to the next model's
          background + content, entirely on its own. As you scroll into this
          section it scales up slightly (same language as the hero). */}
      <ModelsSection model={model} activeModel={activeModel} imgFailed={imgFailed} setImgFailed={setImgFailed} />

      {/* ══════════════════ AI HEALTH ASSISTANT ══════════════════ */}
      <section style={{ padding: "120px 24px", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
        <div className="orb orb-drift-alt" style={{ width: 420, height: 420, bottom: "-15%", left: "-8%", background: "rgba(20,184,166,0.1)" }} />
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(36px, 5vw, 72px)", alignItems: "center", position: "relative", zIndex: 1 }} className="split-grid">
          <Reveal type="slide-left" duration={0.8}>
            <span className="eyebrow" style={{ marginBottom: 16, display: "inline-flex", alignItems: "center", gap: 6 }}><Sparkles size={13} /> New feature</span>
            <h2 className="display-section" style={{ marginTop: 8, marginBottom: 20 }}>AI Health <span className="gradient-text">Assistant</span></h2>
            <p style={{ color: "var(--body)", fontSize: 16, lineHeight: 1.8, marginBottom: 30 }}>
              Describe your symptoms and medical history. The assistant analyzes your condition,
              suggests possibilities worth discussing with a doctor, recommends tests, and guides
              you to the right screening model. It never replaces a doctor's diagnosis.
            </p>
            {[
              "Analyzes complete medical history",
              "Identifies possible conditions to discuss",
              "Recommends specific tests & scans",
              "Guides you to the correct AI screening model",
              "Suggests which specialist to consult",
              "Assesses urgency level — HIGH / MEDIUM / LOW",
            ].map((f, i) => (
              <motion.div key={f} initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5, ease: EASE }}
                style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 11 }}>
                <span style={{ width: 20, height: 20, borderRadius: 7, background: "var(--teal-soft)", border: "1px solid rgba(20,184,166,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--teal-deep)", flexShrink: 0 }}><Check size={13} strokeWidth={3} /></span>
                <span style={{ color: "var(--ink)", fontSize: 14.5, fontWeight: 500 }}>{f}</span>
              </motion.div>
            ))}
            <MagneticButton style={{ marginTop: 30 }}>
              <Link href="/ai-doctor" className="btn btn-primary">
                <Stethoscope size={16} /> Try AI Health Assistant <ArrowRight size={16} />
              </Link>
            </MagneticButton>
          </Reveal>

          {/* Video + Preview card */}
          <Reveal type="slide-right" duration={0.8}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Demo video — replace src with your own file/URL */}
              <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                transition={{ duration: 0.6, ease: EASE }}
                className="panel" style={{ padding: 6, overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
                <video
                  controls
                  playsInline
                  poster="/ai-doctor-preview.png"
                  style={{ width: "100%", display: "block", borderRadius: 16, background: "#0C1338", aspectRatio: "16/9" }}
                >
                  <source src="/ai-health-assistant-demo.mp4" type="video/mp4" />
                </video>
              </motion.div>

              <motion.div variants={sampleCardContainer} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="panel" style={{ padding: 30, position: "relative", overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--teal), var(--brand))" }} />
                <motion.div variants={sampleCardRow} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <span style={{ width: 42, height: 42, borderRadius: 13, background: "linear-gradient(135deg, var(--brand-soft), var(--violet-soft))", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand)" }}><Stethoscope size={21} /></span>
                  <div>
                    <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15.5, color: "var(--ink)" }}>Sample AI Assessment</p>
                    <p style={{ fontSize: 12, color: "var(--muted)" }}>Generated in 1.8 seconds</p>
                  </div>
                </motion.div>
                {[
                  { label: "Patient", value: "Ahmed Khan, 35M" },
                  { label: "Symptoms", value: "Severe wrist pain after a fall" },
                  { label: "Duration", value: "3 days" },
                  { label: "Severity", value: "High" },
                ].map((r) => (
                  <motion.div key={r.label} variants={sampleCardRow} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--muted)", fontSize: 13 }}>{r.label}</span>
                    <span style={{ color: "var(--ink)", fontSize: 13, fontWeight: 600 }}>{r.value}</span>
                  </motion.div>
                ))}
                <motion.div variants={sampleCardRow} style={{ marginTop: 18, padding: 15, background: "var(--alert-soft)", border: "1px solid rgba(229,72,77,0.25)", borderRadius: 13 }}>
                  <p style={{ color: "var(--alert)", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={13} /> URGENCY: HIGH</p>
                  <p style={{ color: "var(--body)", fontSize: 12.5, lineHeight: 1.6 }}>Possible bone fracture. Immediate X-ray recommended.</p>
                </motion.div>
                <motion.div variants={sampleCardRow} style={{ marginTop: 12, padding: 12, background: "var(--brand-soft)", border: "1px solid rgba(43,75,223,0.2)", borderRadius: 13 }}>
                  <p style={{ color: "var(--brand-deep)", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}><Bone size={14} /> Suggested: Fracture Detection AI Model</p>
                </motion.div>
              </motion.div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════ TEAM (scroll-pinned) ══════════════════ */}
      <div style={{ background: "var(--bg-alt)" }}>
        <PinnedTeam members={TEAM} />
      </div>

      {/* ══════════════════ FAQ ══════════════════ */}
      <section id="faq" style={{ padding: "120px 24px", background: "var(--bg)" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <SectionHeading eyebrow="FAQ" title={<>Common <span className="gradient-text">questions</span></>} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQS.map((faq, i) => (
              <Reveal key={i} type="fade-up" delay={i * 0.07} duration={0.55}>
                <div className={`faq-row ${activeFaq === i ? "faq-open" : ""}`}>
                  <button onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                    style={{ width: "100%", padding: "20px 24px", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, background: "none", border: "none", cursor: "pointer" }}>
                    <span style={{ fontWeight: 600, fontSize: 15.5, color: "var(--ink)", fontFamily: "var(--font-display)" }}>{faq.q}</span>
                    <motion.span animate={{ rotate: activeFaq === i ? 135 : 0 }} transition={{ duration: 0.3, ease: EASE }}
                      style={{ color: "var(--brand)", flexShrink: 0, display: "flex" }}>
                      <Plus size={18} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {activeFaq === i && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}
                        style={{ overflow: "hidden" }}>
                        <p style={{ padding: "0 24px 20px", color: "var(--body)", fontSize: 14, lineHeight: 1.75 }}>{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ CTA (was invisible — fixed: "wave" → "fade-up") ══════════════════ */}
      <section style={{ padding: "0 24px 110px" }}>
        <Reveal type="fade-up" duration={0.8}>
          <div style={{ maxWidth: 940, margin: "0 auto", borderRadius: 32, padding: "clamp(48px, 6vw, 84px)", textAlign: "center", position: "relative", overflow: "hidden", background: "linear-gradient(130deg, #101A56 0%, #2B4BDF 48%, #5B3FE4 78%, #0E8C7F 115%)", boxShadow: "0 24px 64px rgba(29,51,172,0.35)" }}>
            <div className="grid-overlay" style={{ maskImage: "none", WebkitMaskImage: "none", opacity: 0.5, backgroundImage: "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)" }} />
            <div className="orb orb-drift" style={{ width: 320, height: 320, top: "-30%", right: "-8%", background: "rgba(20,184,166,0.35)" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <span className="eyebrow" style={{ color: "rgba(255,255,255,0.75)", justifyContent: "center", width: "100%", display: "inline-flex" }}>Ready when you are</span>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 4.6vw, 54px)", fontWeight: 700, color: "#fff", lineHeight: 1.1, marginTop: 14, marginBottom: 18, letterSpacing: "-0.025em" }}>
                Ready to transform medical screening?
              </h2>
              <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 17, maxWidth: 520, margin: "0 auto 36px", lineHeight: 1.7 }}>
                Start screening medical images with AI-assisted precision — explainable, fast, and free to try.
              </p>
              <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                <MagneticButton>
                  <a href="#models" className="btn" style={{ background: "#fff", color: "var(--brand-deep)", boxShadow: "0 10px 28px rgba(12,19,56,0.3)" }}>
                    <Rocket size={16} /> Start Analyzing <ArrowRight size={17} />
                  </a>
                </MagneticButton>
                <MagneticButton>
                  <Link href="/ai-doctor" className="btn" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.35)", backdropFilter: "blur(8px)" }}>
                    <Stethoscope size={16} /> AI Health Assistant
                  </Link>
                </MagneticButton>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer onContact={() => setContactOpen(true)} />

      {/* ══════════════════ CONTACT MODAL ══════════════════ */}
      <AnimatePresence>
        {contactOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(12,19,56,0.5)", backdropFilter: "blur(10px)", padding: 16 }}
            onClick={() => setContactOpen(false)}>
            <motion.div initial={{ scale: 0.93, opacity: 0, y: 26 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ duration: 0.35, ease: EASE }}
              className="panel"
              style={{ padding: "36px 34px", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", position: "relative", boxShadow: "var(--shadow-lg)" }}
              onClick={(e) => e.stopPropagation()}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--teal), var(--brand), var(--violet))", borderRadius: "22px 22px 0 0" }} />
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 25, fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}><Mail size={22} /> Contact us</h2>
              <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 24 }}>We usually reply within one business day.</p>
              {sent ? (
                <div style={{ textAlign: "center", padding: "36px 0 20px" }}>
                  <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: EASE }}
                    style={{ width: 74, height: 74, borderRadius: "50%", background: "var(--teal-soft)", border: "2px solid var(--teal)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                    <motion.svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--teal-deep)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <motion.path d="M4 12.5l5 5L20 6.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.15, ease: "easeOut" }} />
                    </motion.svg>
                  </motion.div>
                  <p className="gradient-text" style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 700 }}>Message sent!</p>
                  <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 6 }}>We'll get back to you soon.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Field label="Your full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
                  <Field label="Your email address" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
                  <Field label="Your message" textarea rows={5} value={form.message} onChange={(v) => setForm({ ...form, message: v })} required />
                  <AnimatePresence>
                    {contactError && (
                      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                        style={{ color: "var(--alert)", fontSize: 13, fontWeight: 600, background: "var(--alert-soft)", border: "1px solid rgba(229,72,77,0.25)", borderRadius: 12, padding: "10px 14px" }}>
                        {contactError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                    <button onClick={() => setContactOpen(false)} className="btn btn-secondary" style={{ flex: 1, padding: "13px 0" }}>Cancel</button>
                    <button onClick={handleContact} disabled={sending} className="btn btn-primary" style={{ flex: 1.4, padding: "13px 0" }}>
                      {sending && <span className="btn-spinner" />}
                      {sending ? "Sending…" : "Send message"}
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

/* ═══════════════ Models section: full-bleed, auto-cycling background ═══════════════ */

function ModelsSection({
  model,
  activeModel,
  imgFailed,
  setImgFailed,
}: {
  model: (typeof MODELS)[number];
  activeModel: number;
  imgFailed: Record<number, boolean>;
  setImgFailed: (fn: (prev: Record<number, boolean>) => Record<number, boolean>) => void;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <section id="models" ref={sectionRef} style={{ position: "relative" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.9, ease: EASE }}
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          transformOrigin: "center center",
        }}
      >
        {/* Crossfading full background — one at a time, auto-advances every 3s */}
        <AnimatePresence mode="sync">
          <motion.div
            key={activeModel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: EASE }}
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: imgFailed[activeModel]
                ? model.fallbackGrad
                : `linear-gradient(180deg, rgba(8,12,40,0.55), rgba(8,12,40,0.75)), url(${model.bg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* hidden probe image so we can fall back to a gradient if the real photo isn't there yet */}
            {!imgFailed[activeModel] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={model.bg}
                alt=""
                style={{ display: "none" }}
                onError={() => setImgFailed((p) => ({ ...p, [activeModel]: true }))}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Foreground content — crossfades along with the background */}
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 24px", maxWidth: 680 }}>
          <span className="eyebrow" style={{ color: "rgba(255,255,255,0.75)", justifyContent: "center", width: "100%", display: "inline-flex", marginBottom: 18 }}>
            Detection
          </span>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModel}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <div
                style={{
                  width: 84, height: 84, borderRadius: 24, margin: "0 auto 26px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(8px)",
                }}
              >
                {cloneIcon(model.icon, 40)}
              </div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
                  {model.label}
                </h3>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.3)", padding: "4px 12px", borderRadius: 100 }}>
                  {model.acc}
                </span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, lineHeight: 1.75, marginBottom: 30, maxWidth: 460, margin: "0 auto 30px" }}>
                {model.desc}
              </p>
              <MagneticButton>
                <Link href={model.href} className="btn" style={{ background: "#fff", color: "var(--brand-deep)" }}>
                  Run analysis <ArrowUpRight size={16} />
                </Link>
              </MagneticButton>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots — purely indicative, section still runs entirely on its own */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 44 }}>
            {MODELS.map((m, i) => (
              <span
                key={m.href}
                style={{
                  width: i === activeModel ? 26 : 8, height: 8, borderRadius: 6,
                  background: i === activeModel ? "#fff" : "rgba(255,255,255,0.35)",
                  transition: "all 0.4s var(--ease)",
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}