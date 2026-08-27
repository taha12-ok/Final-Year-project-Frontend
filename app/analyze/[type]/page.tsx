"use client";
import { useState, useRef, cloneElement, isValidElement, type ReactNode } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronDown, Camera, Upload, FlaskConical, FileText, ScanEye,
  Bone, Brain, Droplets, Search, Check, AlertTriangle, CheckCircle2,
  Phone, RefreshCw, X, FolderOpen, ArrowRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import ScanAnimation from "@/components/ScanAnimation";
import AnimatedCounter from "@/components/AnimatedCounter";
import Field from "@/components/Field";
import UploadZone from "@/components/UploadZone";
import { EASE } from "@/components/Reveal";

const SCAN_TYPES: Record<string, { label: string; scan: string; icon: ReactNode; testImage: string; accent: string; soft: string }> = {
  fracture: { label: "Fracture Detection", scan: "X-ray",     icon: <Bone size={18} />,     testImage: "/test-fracture.png", accent: "var(--violet)", soft: "var(--violet-soft)" },
  brain:    { label: "Brain Tumor",        scan: "Brain MRI", icon: <Brain size={18} />,    testImage: "/test-brain.png",    accent: "var(--brand)",  soft: "var(--brand-soft)" },
  kidney:   { label: "Kidney Disease",     scan: "CT Scan",   icon: <Droplets size={18} />, testImage: "/test-kidney.png",   accent: "var(--teal)",   soft: "var(--teal-soft)" },
};

const normalResults = ["normal", "not fractured", "no tumor", "benign"];

/* Staggered result reveal — the most important moment in the app. */
const resultContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};
const resultItem: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE } },
};

// ── Backend URL from environment variable ──
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

export default function AnalyzePage() {
  const params   = useParams();
  const router   = useRouter();
  const type     = params.type as string;
  const scanInfo = SCAN_TYPES[type] || SCAN_TYPES.fracture;

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [image,        setImage]        = useState<File | null>(null);
  const [preview,      setPreview]      = useState<string | null>(null);
  const [imageSource,  setImageSource]  = useState<"none" | "test" | "upload" | "camera">("none");
  const [result,       setResult]       = useState<any>(null);
  const [loading,      setLoading]      = useState(false);
  const [pdfLoading,   setPdfLoading]   = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [patient,      setPatient]      = useState({ name: "", age: "", gender: "", phone: "" });

  // ── File set karo ──
  const applyFile = (file: File, source: "upload" | "camera") => {
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setImageSource(source);
  };

  // ── Testing image use karo ──
  const useTestImage = async () => {
    try {
      const res  = await fetch(scanInfo.testImage);
      const blob = await res.blob();
      const file = new File([blob], `test-${type}.png`, { type: "image/png" });
      setImage(file);
      setPreview(scanInfo.testImage);
      setResult(null);
      setImageSource("test");
    } catch {
      alert("Test image not found! Please add test-" + type + ".png to public folder.");
    }
  };

  const handlePredict = async () => {
    if (!image || !patient.name || !patient.age || !patient.gender) {
      alert("Please fill all patient details and select an image!");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("file", image);
    const res  = await fetch(`${BACKEND_URL}/predict/${type}`, { method: "POST", body: formData });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  const handleDownloadPDF = async () => {
    if (!image || !result) return;
    setPdfLoading(true);
    const formData = new FormData();
    formData.append("file", image);
    formData.append("name", patient.name);
    formData.append("age", patient.age);
    formData.append("gender", patient.gender);
    formData.append("phone", patient.phone);
    formData.append("result", result.result);
    formData.append("confidence", result.confidence.toString());
    formData.append("gradcam_image", result.gradcam_image);
    formData.append("scan_type", scanInfo.scan);
    const res  = await fetch(`${BACKEND_URL}/generate-report`, { method: "POST", body: formData });
    const blob = await res.blob();
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `report_${patient.name}.pdf`; a.click();
    setPdfLoading(false);
  };

  const switchModel = (key: string) => {
    setDropdownOpen(false);
    setImage(null);
    setPreview(null);
    setResult(null);
    setImageSource("none");
    router.push(`/analyze/${key}`);
  };

  const isNormal = normalResults.includes(result?.result?.toLowerCase());

  const sourceBadge = {
    test:   { icon: <FlaskConical size={12} />, label: "Test Image", color: "var(--violet)" },
    upload: { icon: <FolderOpen size={12} />,   label: "Uploaded",   color: "var(--brand)" },
    camera: { icon: <Camera size={12} />,       label: "Camera",     color: "var(--teal)" },
    none:   { icon: null,                       label: "",           color: "transparent" },
  };

  const sourceOptions = [
    { key: "test",   icon: <FlaskConical size={19} />, label: "Test Image", sub: "Sample scan",  onClick: useTestImage,                          accent: "var(--violet)" },
    { key: "upload", icon: <Upload size={19} />,       label: "Gallery",    sub: "From device",  onClick: () => fileInputRef.current?.click(),   accent: "var(--brand)" },
    { key: "camera", icon: <Camera size={19} />,       label: "Camera",     sub: "Take photo",   onClick: () => cameraInputRef.current?.click(), accent: "var(--teal)" },
  ];

  return (
    <main style={{ minHeight: "100vh", position: "relative", overflow: "clip", background: "var(--bg)" }}>
      {/* Ambient background */}
      <div className="mesh-bg" />
      <div className="orb orb-drift" style={{ width: 420, height: 420, top: "-10%", left: "-6%", background: "rgba(43,75,223,0.12)" }} />
      <div className="orb orb-drift-alt" style={{ width: 360, height: 360, bottom: "-8%", right: "-4%", background: "rgba(124,92,252,0.1)" }} />

      {/* Navbar with model switcher dropdown */}
      <Navbar
        variant="app"
        right={
          <div style={{ position: "relative" }}>
            <button onClick={() => setDropdownOpen((p) => !p)} className="btn btn-secondary"
              style={{ padding: "9px 16px", fontSize: 13.5 }}>
              <span style={{ display: "inline-flex" }}>{scanInfo.icon}</span> {scanInfo.label}
              <ChevronDown size={15} style={{ transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.25s var(--ease)" }} />
            </button>
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ duration: 0.25, ease: EASE }}
                  className="panel" style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, minWidth: 250, overflow: "hidden", zIndex: 100, boxShadow: "var(--shadow-lg)" }}>
                  <p style={{ padding: "10px 16px 8px", borderBottom: "1px solid var(--border)", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", color: "var(--muted)" }}>SWITCH MODEL</p>
                  {Object.entries(SCAN_TYPES).map(([key, val]) => (
                    <button key={key} onClick={() => switchModel(key)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 16px",
                        background: key === type ? "var(--brand-soft)" : "none", border: "none", cursor: "pointer",
                        borderLeft: key === type ? "3px solid var(--brand)" : "3px solid transparent",
                        textAlign: "left",
                      }}>
                      <span style={{ display: "inline-flex", color: val.accent }}>{val.icon}</span>
                      <span>
                        <p style={{ fontSize: 13, fontWeight: key === type ? 700 : 500, color: key === type ? "var(--brand-deep)" : "var(--ink)" }}>{val.label}</p>
                        <p style={{ fontSize: 11, color: "var(--muted)" }}>{val.scan}</p>
                      </span>
                      {key === type && <span style={{ marginLeft: "auto", color: "var(--brand)", display: "inline-flex" }}><Check size={14} strokeWidth={3} /></span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        }
      />

      {/* ── Page header ── */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}
        style={{ textAlign: "center", padding: "140px 24px 44px", position: "relative", zIndex: 1 }}>
        <motion.span
          animate={{ y: [0, -6, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ display: "inline-flex", justifyContent: "center", color: scanInfo.accent }}>
          {isValidElement(scanInfo.icon) ? cloneElement(scanInfo.icon as any, { size: 52 }) : scanInfo.icon}
        </motion.span>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 4.4vw, 48px)", fontWeight: 700, letterSpacing: "-0.03em", marginTop: 8 }}>
          <span className="gradient-text">{scanInfo.label}</span>
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15.5, marginTop: 8 }}>Upload a {scanInfo.scan} image for AI-assisted screening</p>
      </motion.div>

      {/* ── Main grid ── */}
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 90px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, position: "relative", zIndex: 1 }} className="split-grid">

        {/* ═══ LEFT — inputs ═══ */}
        <motion.div initial={{ opacity: 0, x: -26 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
          className="panel" style={{ padding: "28px 26px" }}>

          <p className="eyebrow" style={{ marginBottom: 16 }}>Step 1 · Patient</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 26 }}>
            <Field label="Full name" value={patient.name} onChange={(v) => setPatient({ ...patient, name: v })} required />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Age" type="number" value={patient.age} onChange={(v) => setPatient({ ...patient, age: v })} required />
              <Field label="Gender" value={patient.gender} onChange={(v) => setPatient({ ...patient, gender: v })}
                options={[{ value: "", label: "Please select" }, { value: "Male", label: "Male" }, { value: "Female", label: "Female" }, { value: "Other", label: "Other" }]} required />
            </div>
            <Field label="Phone (optional)" type="tel" value={patient.phone} onChange={(v) => setPatient({ ...patient, phone: v })} />
          </div>

          <p className="eyebrow" style={{ marginBottom: 16 }}>Step 2 · Image source</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            {sourceOptions.map((o) => {
              const active = imageSource === o.key;
              return (
                <motion.button key={o.key} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                  onClick={o.onClick}
                  style={{
                    padding: "14px 8px 12px", borderRadius: 14, cursor: "pointer", textAlign: "center",
                    border: `1.5px solid ${active ? o.accent : "var(--border)"}`,
                    background: active ? "var(--surface)" : "var(--surface-tint)",
                    boxShadow: active ? "var(--shadow-sm)" : "none",
                    color: active ? o.accent : "var(--body)",
                    transition: "border-color 0.25s var(--ease), background 0.25s var(--ease)",
                  }}>
                  <span style={{ display: "inline-flex", width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", background: active ? `color-mix(in srgb, ${o.accent} 12%, white)` : "var(--bg-alt)", marginBottom: 6 }}>
                    {o.icon}
                  </span>
                  <p style={{ fontSize: 11.5, fontWeight: 700 }}>{o.label}</p>
                  <p style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>{o.sub}</p>
                </motion.button>
              );
            })}
          </div>

          {/* Hidden inputs */}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) applyFile(f, "upload"); }} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) applyFile(f, "camera"); }} />

          <p className="eyebrow" style={{ marginBottom: 16 }}>Step 3 · Upload scan</p>
          {preview ? (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, ease: EASE }}
              style={{ position: "relative", marginBottom: 18 }}>
              <img src={preview} alt="preview"
                style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 16, border: "1px solid var(--border)", background: "var(--surface-tint)", padding: 8 }} />
              {imageSource !== "none" && (
                <span style={{
                  position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.94)",
                  border: `1.5px solid ${sourceBadge[imageSource].color}`, color: sourceBadge[imageSource].color,
                  padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700, boxShadow: "var(--shadow-xs)",
                  display: "inline-flex", alignItems: "center", gap: 5,
                }}>
                  {sourceBadge[imageSource].icon} {sourceBadge[imageSource].label}
                </span>
              )}
              <button onClick={() => { setImage(null); setPreview(null); setImageSource("none"); setResult(null); }}
                style={{
                  position: "absolute", bottom: 12, right: 10, background: "rgba(255,255,255,0.94)",
                  border: "1px solid var(--border-strong)", color: "var(--body)", padding: "5px 12px",
                  borderRadius: 100, fontSize: 11.5, fontWeight: 600, cursor: "pointer", boxShadow: "var(--shadow-xs)",
                  display: "inline-flex", alignItems: "center", gap: 4,
                }}>
                <X size={12} /> Remove
              </button>
            </motion.div>
          ) : (
            <div style={{ marginBottom: 18 }}>
              <UploadZone scanLabel={scanInfo.scan} onFile={(f) => applyFile(f, "upload")} onOpenPicker={() => fileInputRef.current?.click()} />
            </div>
          )}

          {/* Analyze button */}
          <motion.button onClick={handlePredict} disabled={!image || loading}
            whileHover={!image || loading ? {} : { scale: 1.015 }} whileTap={!image || loading ? {} : { scale: 0.985 }}
            className="btn"
            style={{
              width: "100%", fontSize: 15.5, padding: "15px 0",
              ...(image && !loading
                ? { background: "linear-gradient(135deg, var(--brand), var(--violet) 130%)", color: "#fff", boxShadow: "var(--shadow-brand)" }
                : { background: "var(--bg-alt)", color: "var(--muted)", cursor: "not-allowed" }),
            }}>
            {loading
              ? (<><span className="btn-spinner" style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "#fff" }} /> Analyzing…</>)
              : (<><Search size={16} /> Analyze <span style={{ display: "inline-flex" }}>{scanInfo.icon}</span></>)}
          </motion.button>

          {/* Quick model switch */}
          <div style={{ marginTop: 18, padding: 14, background: "var(--surface-tint)", border: "1px solid var(--border)", borderRadius: 14 }}>
            <p style={{ color: "var(--muted)", fontSize: 10.5, fontWeight: 700, marginBottom: 8, letterSpacing: "0.14em" }}>SWITCH MODEL</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(SCAN_TYPES).map(([key, val]) => (
                <button key={key} onClick={() => switchModel(key)}
                  style={{
                    padding: "6px 12px", borderRadius: 100, fontSize: 11.5, cursor: "pointer", fontWeight: key === type ? 700 : 500,
                    background: key === type ? "var(--brand-soft)" : "var(--surface)",
                    border: `1px solid ${key === type ? "rgba(43,75,223,0.4)" : "var(--border)"}`,
                    color: key === type ? "var(--brand-deep)" : "var(--body)",
                    transition: "all 0.2s var(--ease)",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}>
                  <span style={{ display: "inline-flex" }}>{val.icon}</span> {val.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ═══ RIGHT — result ═══ */}
        <motion.div initial={{ opacity: 0, x: 26 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.18, ease: EASE }}
          className="panel" style={{ padding: "28px 26px", position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <p className="eyebrow" style={{ marginBottom: 0 }}>Screening result</p>
            <span className={`chip ${isNormal && result ? "chip-teal" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, ...(!result ? { background: "var(--bg-alt)", color: "var(--muted)", borderColor: "var(--border)" } : {}) }}>
              {loading
                ? "Processing…"
                : result
                  ? (isNormal ? <><CheckCircle2 size={13} /> Normal indicators</> : <><AlertTriangle size={13} /> Review suggested</>)
                  : "Awaiting scan"}
            </span>
          </div>

          {loading && <ScanAnimation image={preview} />}

          {!result && !loading && (
            <div style={{ textAlign: "center", padding: "72px 12px", color: "var(--muted)" }}>
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: 76, height: 76, margin: "0 auto 18px", borderRadius: 22, background: "linear-gradient(135deg, var(--brand-soft), var(--violet-soft))", border: "1px solid rgba(43,75,223,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ScanEye size={30} style={{ color: "var(--brand)" }} />
              </motion.div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--body)" }}>Your screening result will appear here</p>
              <p style={{ fontSize: 13, marginTop: 6 }}>Choose an image source and click Analyze</p>
            </div>
          )}

          {result && !loading && (
            <motion.div variants={resultContainer} initial="hidden" animate="show">

              {/* Patient */}
              <motion.div variants={resultItem} style={{ background: "var(--surface-tint)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
                <p style={{ color: "var(--muted)", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Patient</p>
                <p style={{ color: "var(--ink)", fontWeight: 700, fontSize: 17, fontFamily: "var(--font-display)" }}>{patient.name}</p>
                <p style={{ color: "var(--body)", fontSize: 13, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                  Age: {patient.age} · {patient.gender}
                  {patient.phone && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}> · <Phone size={11} /> {patient.phone}</span>}
                </p>
                <p style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 4 }}>{scanInfo.scan} · {new Date().toLocaleDateString()}</p>
              </motion.div>

              {/* Finding — the headline moment */}
              <motion.div variants={resultItem} style={{
                borderRadius: 16, padding: "22px 18px", textAlign: "center", marginBottom: 14,
                background: isNormal ? "linear-gradient(135deg, rgba(20,184,166,0.1), rgba(20,184,166,0.04))" : "linear-gradient(135deg, rgba(229,72,77,0.09), rgba(229,72,77,0.03))",
                border: `1.5px solid ${isNormal ? "var(--teal)" : "var(--alert)"}`,
              }}>
                <p style={{ color: "var(--muted)", fontSize: 11.5, marginBottom: 6, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Possible finding · AI-assisted screening</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  {isNormal ? <CheckCircle2 size={24} style={{ color: "var(--teal-deep)" }} /> : <AlertTriangle size={24} style={{ color: "var(--alert)" }} />} {result.result}
                </p>
                <p style={{ color: "var(--body)", fontSize: 13.5, marginTop: 8 }}>
                  Model confidence:{" "}
                  <span className="gradient-text" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15.5 }}>
                    <AnimatedCounter value={`${result.confidence}%`} />
                  </span>
                </p>
              </motion.div>

              {/* Disclaimer */}
              <motion.div variants={resultItem} style={{ padding: "11px 14px", background: "var(--brand-soft)", border: "1px solid rgba(43,75,223,0.18)", borderRadius: 12, marginBottom: 14, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <AlertTriangle size={14} style={{ color: "var(--brand)", flexShrink: 0, marginTop: 2 }} />
                <p style={{ color: "var(--body)", fontSize: 12, lineHeight: 1.6 }}>
                  This is an AI-assisted screening result, not a medical diagnosis. A qualified doctor must confirm before any treatment decision.
                </p>
              </motion.div>

              {/* Grad-CAM */}
              {result.gradcam_image && (
                <motion.div variants={resultItem} style={{ textAlign: "center", marginBottom: 14 }}>
                  <p className="gradient-text" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14.5, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Search size={15} /> AI Focus Area (Grad-CAM)</p>
                  <div style={{ display: "inline-block", padding: 4, borderRadius: 16, background: "linear-gradient(135deg, var(--brand), var(--violet))" }}>
                    <img src={`data:image/jpeg;base64,${result.gradcam_image}`} alt="GradCAM"
                      style={{ borderRadius: 13, maxHeight: 190, display: "block" }} />
                  </div>
                  <p style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 8 }}>Red/Yellow = region the AI focused on</p>
                </motion.div>
              )}

              {/* PDF report */}
              <motion.div variants={resultItem}>
                <motion.button onClick={handleDownloadPDF} disabled={pdfLoading}
                  whileHover={pdfLoading ? {} : { scale: 1.015 }} whileTap={pdfLoading ? {} : { scale: 0.985 }}
                  className="btn"
                  style={{
                    width: "100%", marginBottom: 14, fontSize: 15,
                    ...(pdfLoading
                      ? { background: "var(--bg-alt)", color: "var(--muted)", cursor: "not-allowed" }
                      : { background: "linear-gradient(135deg, var(--teal-deep), var(--teal))", color: "#fff", boxShadow: "0 8px 24px rgba(14,140,127,0.32)" }),
                  }}>
                  {pdfLoading ? (<><span className="btn-spinner" style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "#fff" }} /> Generating…</>) : (<><FileText size={16} /> Download PDF Report</>)}
                </motion.button>
              </motion.div>

              {/* Other models */}
              <motion.div variants={resultItem} style={{ padding: 12, background: "var(--surface-tint)", border: "1px solid var(--border)", borderRadius: 14 }}>
                <p style={{ color: "var(--muted)", fontSize: 11.5, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><RefreshCw size={12} /> Try another model:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Object.entries(SCAN_TYPES).filter(([k]) => k !== type).map(([key, val]) => (
                    <button key={key} onClick={() => switchModel(key)}
                      style={{ padding: "6px 12px", borderRadius: 100, fontSize: 11.5, cursor: "pointer", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--body)", transition: "all 0.2s var(--ease)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ display: "inline-flex" }}>{val.icon}</span> {val.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Footer strip */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "22px 24px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, fontSize: 12.5, color: "var(--muted)", position: "relative", zIndex: 1 }}>
        <span>MedAI Platform · {scanInfo.label} pipeline</span>
        <Link href="/ai-doctor" style={{ color: "var(--brand)", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>Not sure which scan? Try the AI Health Assistant <ArrowRight size={14} /></Link>
      </div>
    </main>
  );
}