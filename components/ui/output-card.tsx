'use client';

import { ReactNode } from "react";

export function OutputCard({ children }: { children: ReactNode }) {
  return <div className="output-card">{children}</div>;
}

export function DownloadButton({ content, filename, label }: {
  content: string;
  filename: string;
  label: string;
}) {
  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      disabled={!content}
      className="mt-4 bg-gradient-to-r from-accent to-purple-600 text-white font-semibold rounded-lg px-4 py-2 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  );
}
