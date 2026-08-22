"use client";
import { useState, useRef, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronDown, Camera, Upload, FlaskConical, UploadCloud, ArrowLeft } from "lucide-react";
import ScanAnimation from "@/components/ScanAnimation";
import AnimatedCounter from "@/components/AnimatedCounter";
import GradientOrb from "@/components/GradientOrb";
import ParticlesBackground from "@/components/ParticlesBackground";

const SCAN_TYPES: Record<string, { label: string; scan: string; emoji: string; testImage: string }> = {
  fracture: { label: "Fracture Detection", scan: "X-ray",        emoji: "🦴", testImage: "/test-fracture.png" },
  brain:    { label: "Brain Tumor",        scan: "Brain MRI",    emoji: "🧠", testImage: "/test-brain.png"    },
  kidney:   { label: "Kidney Disease",     scan: "CT Scan",      emoji: "🫘", testImage: "/test-kidney.png"   },
};

const normalResults = ["normal", "not fractured", "no tumor", "benign"];

// ── Backend URL from environment variable ──
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

// Shared dark-theme input style
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(47,143,255,0.18)",
  color: "var(--text-primary)",
};

export default function AnalyzePage() {
  const params    = useParams();
  const router    = useRouter();
  const type      = params.type as string;
  const scanInfo  = SCAN_TYPES[type] || SCAN_TYPES.fracture;

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
  const [dragActive,   setDragActive]   = useState(false);

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

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) applyFile(f, "upload");
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
    test:   { label: "🧪 Test Image",    color: "var(--indigo)" },
    upload: { label: "📁 Uploaded",      color: "var(--red-light)" },
    camera: { label: "📷 Camera",        color: "var(--cyan)" },
    none:   { label: "",                 color: "transparent" },
  };

  return (
    <main className="hero-bg bg-grid" style={{ minHeight: '100vh', position: "relative", overflow: "hidden" }}>
      <ParticlesBackground />
      <GradientOrb color="rgba(47,143,255,0.30)" size={420} top="-8%" left="0%" duration={11} />
      <GradientOrb color="rgba(34,201,166,0.24)" size={340} bottom="0%" right="5%" duration={9} delay={2} />

      {/* ── Navbar (glass pill, same as homepage) ── */}
      <div className="fixed top-0 left-0 right-0 z-50" style={{ display: "flex", justifyContent: "center", padding: "20px 16px" }}>
        <nav className="navbar-pill navbar-pill-scrolled" style={{ width: "100%", maxWidth: 1140, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px 10px 20px" }}>
          <Link href="/" style={{ color: 'var(--gold-light)', display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 16, textDecoration: "none" }}>
            <ArrowLeft size={18} /> MedAI
          </Link>

          {/* Model Dropdown */}
          <div style={{ position: "relative" }}>
            <motion.button onClick={() => setDropdownOpen(p => !p)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "rgba(47,143,255,0.08)", border: "1px solid rgba(47,143,255,0.25)",
                borderRadius: 12, padding: "8px 16px", cursor: "pointer", color: "var(--gold-light)"
              }}>
              <span>{scanInfo.emoji}</span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{scanInfo.label}</span>
              <ChevronDown size={16} color="var(--gold-light)"
                style={{ transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "0.2s" }} />
            </motion.button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  className="glass-surface"
                  style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0,
                    borderRadius: 14, overflow: "hidden", minWidth: 230, zIndex: 100,
                  }}>
                  <div style={{ padding: "8px 16px 6px", borderBottom: "1px solid rgba(47,143,255,0.14)" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>SWITCH MODEL</p>
                  </div>
                  {Object.entries(SCAN_TYPES).map(([key, val]) => (
                    <button key={key} onClick={() => switchModel(key)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        width: "100%", padding: "11px 16px",
                        background: key === type ? "rgba(47,143,255,0.12)" : "none",
                        border: "none", cursor: "pointer",
                        color: key === type ? "var(--gold-light)" : "var(--text-secondary)", fontSize: 13,
                        fontWeight: key === type ? 700 : 400,
                        borderLeft: key === type ? "3px solid var(--gold)" : "3px solid transparent",
                      }}>
                      <span style={{ fontSize: 18 }}>{val.emoji}</span>
                      <div style={{ textAlign: "left" }}>
                        <p style={{ margin: 0 }}>{val.label}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>{val.scan}</p>
                      </div>
                      {key === type && <span style={{ marginLeft: "auto", fontSize: 11 }}>✓</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>
      </div>

      {/* ── Page Header ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="text-center px-8"
        style={{ paddingTop: 150, paddingBottom: 48, position: "relative", zIndex: 1 }}>
        <p className="text-6xl mb-4">{scanInfo.emoji}</p>
        <h1 className="text-4xl font-black mb-2">
          <span className="gold-text">{scanInfo.label}</span>
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>Upload a {scanInfo.scan} image for AI analysis</p>
      </motion.div>

      {/* ── Main Grid ── */}
      <div className="max-w-5xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-2 gap-6" style={{ position: "relative", zIndex: 1 }}>

        {/* LEFT */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl p-6 card">

          {/* Patient Details */}
          <h2 className="gold-text text-xl font-bold mb-4">👤 Patient Details</h2>
          <div className="space-y-3 mb-6">
            {[
              { label: "Full Name", key: "name",  type: "text",   placeholder: "Enter patient name" },
              { label: "Age",       key: "age",   type: "number", placeholder: "Enter age" },
              { label: "Phone",     key: "phone", type: "text",   placeholder: "Enter phone number" },
            ].map((f) => (
              <div key={f.key}>
                <label style={{ color: "var(--text-secondary)" }} className="text-sm">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder}
                  value={(patient as any)[f.key]}
                  onChange={(e) => setPatient({ ...patient, [f.key]: e.target.value })}
                  style={inputStyle}
                  className="w-full mt-1 rounded-xl px-4 py-3 outline-none" />
              </div>
            ))}
            <div>
              <label style={{ color: "var(--text-secondary)" }} className="text-sm">Gender</label>
              <select value={patient.gender} onChange={(e) => setPatient({ ...patient, gender: e.target.value })}
                style={inputStyle}
                className="w-full mt-1 rounded-xl px-4 py-3 outline-none">
                <option value="" style={{ background: "var(--dark2)" }}>Select gender</option>
                <option value="Male" style={{ background: "var(--dark2)" }}>Male</option>
                <option value="Female" style={{ background: "var(--dark2)" }}>Female</option>
                <option value="Other" style={{ background: "var(--dark2)" }}>Other</option>
              </select>
            </div>
          </div>

          {/* Image Source — 3 Options */}
          <h2 className="gold-text text-xl font-bold mb-3">🩻 Select Image</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>

            {/* Testing Image */}
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={useTestImage}
              style={{
                padding: "12px 8px", borderRadius: 12, border: "1px solid",
                borderColor: imageSource === "test" ? "var(--gold)" : "rgba(47,143,255,0.18)",
                background: imageSource === "test" ? "rgba(47,143,255,0.12)" : "rgba(255,255,255,0.03)",
                color: imageSource === "test" ? "var(--indigo)" : "var(--text-secondary)",
                cursor: "pointer", textAlign: "center"
              }}>
              <FlaskConical size={20} style={{ margin: "0 auto 4px" }} />
              <p style={{ fontSize: 11, fontWeight: 600 }}>Test Image</p>
              <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Sample scan</p>
            </motion.button>

            {/* Upload from Gallery */}
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: "12px 8px", borderRadius: 12, border: "1px solid",
                borderColor: imageSource === "upload" ? "var(--red)" : "rgba(47,143,255,0.18)",
                background: imageSource === "upload" ? "rgba(34,201,166,0.14)" : "rgba(255,255,255,0.03)",
                color: imageSource === "upload" ? "var(--red-light)" : "var(--text-secondary)",
                cursor: "pointer", textAlign: "center"
              }}>
              <Upload size={20} style={{ margin: "0 auto 4px" }} />
              <p style={{ fontSize: 11, fontWeight: 600 }}>Gallery</p>
              <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>From device</p>
            </motion.button>

            {/* Camera */}
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => cameraInputRef.current?.click()}
              style={{
                padding: "12px 8px", borderRadius: 12, border: "1px solid",
                borderColor: imageSource === "camera" ? "var(--cyan)" : "rgba(47,143,255,0.18)",
                background: imageSource === "camera" ? "rgba(6,182,212,0.14)" : "rgba(255,255,255,0.03)",
                color: imageSource === "camera" ? "var(--cyan)" : "var(--text-secondary)",
                cursor: "pointer", textAlign: "center"
              }}>
              <Camera size={20} style={{ margin: "0 auto 4px" }} />
              <p style={{ fontSize: 11, fontWeight: 600 }}>Camera</p>
              <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Take photo</p>
            </motion.button>
          </div>

          {/* Hidden Inputs */}
          <input ref={fileInputRef} type="file" accept="image/*"
            onChange={e => { const f = e.target.files?.[0]; if (f) applyFile(f, "upload"); }}
            className="hidden" />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
            onChange={e => { const f = e.target.files?.[0]; if (f) applyFile(f, "camera"); }}
            className="hidden" />

          {/* Preview */}
          {preview ? (
            <div style={{ position: "relative", marginBottom: 16 }}>
              <img src={preview} alt="preview"
                style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 12, border: "1px solid rgba(47,143,255,0.25)" }} />
              {imageSource !== "none" && (
                <span style={{
                  position: "absolute", top: 8, right: 8,
                  background: "rgba(11,17,32,0.85)", border: `1px solid ${sourceBadge[imageSource].color}`,
                  color: sourceBadge[imageSource].color,
                  padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600
                }}>
                  {sourceBadge[imageSource].label}
                </span>
              )}
              <button onClick={() => { setImage(null); setPreview(null); setImageSource("none"); setResult(null); }}
                style={{
                  position: "absolute", bottom: 8, right: 8,
                  background: "rgba(11,17,32,0.85)", border: "1px solid rgba(255,255,255,0.15)",
                  color: "var(--text-secondary)", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer"
                }}>
                ✕ Remove
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`dropzone ${dragActive ? "dropzone-active" : ""}`}
              style={{ padding: 28, textAlign: "center", marginBottom: 16, color: "var(--text-secondary)", cursor: "pointer" }}
            >
              <motion.div animate={{ scale: dragActive ? 1.15 : 1 }} transition={{ type: "spring", stiffness: 300 }}>
                <UploadCloud size={30} style={{ margin: "0 auto 8px", color: dragActive ? "var(--gold)" : "var(--text-muted)" }} />
              </motion.div>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{dragActive ? "Drop to upload" : "Drag & drop a scan, or choose an option above"}</p>
              <p style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)" }}>JPG or PNG · {scanInfo.scan}</p>
            </div>
          )}

          {/* Analyze Button */}
          <motion.button onClick={handlePredict} disabled={!image || loading}
            whileHover={{ scale: (!image || loading) ? 1 : 1.02 }} whileTap={{ scale: (!image || loading) ? 1 : 0.98 }}
            className={(!image || loading) ? "" : "btn-gold"}
            style={{
              background: (loading || !image) ? 'rgba(255,255,255,0.06)' : undefined,
              color: (loading || !image) ? 'var(--text-muted)' : 'white',
              width: "100%", fontWeight: 900, padding: "14px", borderRadius: 12,
              border: "none", cursor: (loading || !image) ? "not-allowed" : "pointer", fontSize: 16
            }}>
            {loading ? "⏳ Analyzing..." : `🔍 Analyze ${scanInfo.emoji}`}
          </motion.button>

          {/* Quick Switch */}
          <div style={{ marginTop: 16, padding: 14, background: "rgba(47,143,255,0.05)", border: "1px solid rgba(47,143,255,0.14)", borderRadius: 12 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, marginBottom: 8, letterSpacing: 1 }}>SWITCH MODEL</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(SCAN_TYPES).map(([key, val]) => (
                <button key={key} onClick={() => switchModel(key)}
                  style={{
                    padding: "5px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer",
                    background: key === type ? "rgba(47,143,255,0.16)" : "none",
                    border: key === type ? "1px solid var(--gold)" : "1px solid rgba(47,143,255,0.16)",
                    color: key === type ? "var(--gold-light)" : "var(--text-secondary)", fontWeight: key === type ? 700 : 400,
                  }}>
                  {val.emoji} {val.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* RIGHT — Result */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl p-6 card">

          <h2 className="gold-text text-xl font-bold mb-4">📊 AI Screening Result</h2>

          {loading && <ScanAnimation image={preview} />}

          {!result && !loading && (
            <div className="text-center mt-20" style={{ color: "var(--text-muted)" }}>
              <p className="text-5xl mb-4">🩻</p>
              <p>Choose image source and click Analyze</p>
            </div>
          )}

          {result && !loading && (
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 120, damping: 16 }}>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(47,143,255,0.14)' }} className="rounded-xl p-4 mb-4">
                <p style={{ color: "var(--text-muted)" }} className="text-xs">Patient</p>
                <p style={{ color: "var(--text-primary)" }} className="font-bold text-lg">{patient.name}</p>
                <p style={{ color: "var(--text-muted)" }} className="text-sm">Age: {patient.age} | {patient.gender}{patient.phone && ` | 📞 ${patient.phone}`}</p>
                <p style={{ color: "var(--text-muted)" }} className="text-xs mt-1">{scanInfo.scan} | {new Date().toLocaleDateString()}</p>
              </div>

              <div style={{
                background: isNormal ? 'rgba(34,201,166,0.12)' : 'rgba(239,68,68,0.12)',
                border: `1px solid ${isNormal ? 'var(--red)' : '#DC2626'}`
              }} className="p-4 rounded-xl text-center mb-4">
                <p style={{ color: "var(--text-muted)" }} className="text-xs mb-1">Possible Finding (AI-Assisted Screening)</p>
                <p style={{ color: "var(--text-primary)" }} className="text-2xl font-black">{isNormal ? "✅" : "⚠️"} {result.result}</p>
                <p style={{ color: "var(--text-secondary)" }} className="mt-1">Model Confidence: <span className="gold-text font-bold"><AnimatedCounter value={`${result.confidence}%`} /></span></p>
              </div>

              <div style={{ padding: "10px 14px", background: "rgba(47,143,255,0.06)", border: "1px solid rgba(47,143,255,0.16)", borderRadius: 10 }} className="mb-4">
                <p style={{ color: "var(--text-muted)" }} className="text-xs">⚠️ This is an AI-assisted screening result, not a medical diagnosis. A qualified doctor must confirm before any treatment decision.</p>
              </div>

              {result.gradcam_image && (
                <div className="text-center mb-4">
                  <p className="gold-text font-bold mb-2">🔍 AI Focus Area (Grad-CAM)</p>
                  <img src={`data:image/jpeg;base64,${result.gradcam_image}`} alt="GradCAM"
                    style={{ border: '1px solid var(--gold)' }}
                    className="mx-auto rounded-xl max-h-48" />
                  <p style={{ color: "var(--text-muted)" }} className="text-xs mt-2">Red/Yellow = region the AI focused on</p>
                </div>
              )}

              <motion.button onClick={handleDownloadPDF} disabled={pdfLoading}
                whileHover={{ scale: pdfLoading ? 1 : 1.02 }} whileTap={{ scale: pdfLoading ? 1 : 0.98 }}
                className={`w-full font-black py-3 rounded-xl mb-3 ${pdfLoading ? "" : "btn-gold"}`}
                style={{ background: pdfLoading ? 'rgba(255,255,255,0.06)' : undefined, color: pdfLoading ? 'var(--text-muted)' : 'white' }}>
                {pdfLoading ? "Generating..." : "📄 Download PDF Report"}
              </motion.button>

              <div style={{ padding: 12, background: "rgba(47,143,255,0.05)", border: "1px solid rgba(47,143,255,0.12)", borderRadius: 12 }}>
                <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 8 }}>🔄 Try another model:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Object.entries(SCAN_TYPES).filter(([k]) => k !== type).map(([key, val]) => (
                    <button key={key} onClick={() => switchModel(key)}
                      style={{
                        padding: "5px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer",
                        background: "none", border: "1px solid rgba(47,143,255,0.18)", color: "var(--text-secondary)",
                      }}>
                      {val.emoji} {val.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
