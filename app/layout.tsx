import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedAI Platform — AI Medical Diagnosis",
  description: "AI-Powered Medical Image Analysis System — Final Year Project SMIU",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}