'use client';

import { useState } from "react";

interface Props {
  service: string;
  envKey: string;
}

export function ApiKeyInput({ service, envKey }: Props) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(`inkreach_key_${envKey}`) || "";
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem(`inkreach_key_${envKey}`, value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    localStorage.removeItem(`inkreach_key_${envKey}`);
    setValue("");
  };

  return (
    <div className="space-y-2">
      <label className="text-sm text-muted font-medium">{service} API Key</label>
      <div className="flex gap-2">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Enter ${service} API key...`}
          className="flex-1 bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-muted"
        />
        <button
          onClick={handleSave}
          disabled={!value}
          className="bg-accent text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-40 hover:bg-accent/90 transition-colors"
        >
          {saved ? "Saved" : "Save"}
        </button>
        {value && (
          <button onClick={handleClear} className="text-xs text-red-400 hover:text-red-300">
            Clear
          </button>
        )}
      </div>
      <p className="text-xs text-muted">Stored locally in your browser. Overrides the .env.local value.</p>
    </div>
  );
}
