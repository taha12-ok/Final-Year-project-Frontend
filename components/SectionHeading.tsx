"use client";
import Reveal from "@/components/Reveal";

interface SectionHeadingProps {
  eyebrow: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  align?: "center" | "left";
}

/** Consistent section header: letterspaced eyebrow + display title + optional sub. */
export default function SectionHeading({ eyebrow, title, sub, align = "center" }: SectionHeadingProps) {
  const centered = align === "center";
  return (
    <Reveal
      type="fade-up"
      style={{ textAlign: centered ? "center" : "left", marginBottom: 64, maxWidth: centered ? 720 : undefined, margin: centered ? "0 auto 64px" : "0 0 64px" }}
    >
      <span className="eyebrow" style={{ marginBottom: 18, justifyContent: centered ? "center" : "flex-start", width: centered ? "100%" : undefined, display: "inline-flex" }}>
        {eyebrow}
      </span>
      <h2 className="display-section" style={{ marginTop: 8 }}>{title}</h2>
      {sub && <p style={{ color: "var(--muted)", fontSize: 17, marginTop: 16, lineHeight: 1.7 }}>{sub}</p>}
    </Reveal>
  );
}
