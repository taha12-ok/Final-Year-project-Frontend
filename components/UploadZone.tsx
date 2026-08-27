"use client";
import { useState, type DragEvent } from "react";
import { motion } from "framer-motion";
import { UploadCloud } from "lucide-react";

interface UploadZoneProps {
  onFile: (file: File) => void;
  onOpenPicker: () => void;
  scanLabel: string;
}

/**
 * Custom drag-and-drop upload area with animated hover/drag states —
 * replaces the plain browser file input affordance.
 */
export default function UploadZone({ onFile, onOpenPicker, scanLabel }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  return (
    <motion.div
      animate={{ scale: dragActive ? 1.015 : 1 }}
      transition={{ duration: 0.2 }}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onClick={onOpenPicker}
      className={`dropzone ${dragActive ? "dropzone-active" : ""}`}
      style={{ padding: "36px 24px", textAlign: "center", cursor: "pointer" }}
      role="button"
      aria-label="Upload scan image"
    >
      <motion.div
        animate={{ y: dragActive ? -4 : 0 }}
        style={{
          width: 56, height: 56, margin: "0 auto 14px",
          borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, var(--brand-soft), var(--violet-soft))",
          border: "1px solid rgba(43,75,223,0.18)",
          color: "var(--brand)",
        }}
      >
        <UploadCloud size={26} />
      </motion.div>
      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
        {dragActive ? "Drop to upload" : "Drag & drop your scan here"}
      </p>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
        or click to browse · JPG / PNG · {scanLabel}
      </p>
    </motion.div>
  );
}
