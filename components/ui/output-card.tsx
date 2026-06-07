'use client';

import { ReactNode } from "react";
import { Download } from "lucide-react";

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
      className="mt-4 bg-accent text-white font-semibold rounded-lg px-4 py-2 transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Download className="w-4 h-4 inline-block mr-1.5" />{label}
    </button>
  );
}
