'use client';

import { useState, useEffect } from "react";
import {
  getGiveaways,
  addGiveaway,
  updateGiveaway,
  removeGiveaway,
  addEntry,
  pickWinner,
  type Giveaway,
} from "@/lib/giveaways";
import { useBook } from "@/context/book-context";
import { trackEvent } from "@/lib/analytics";

export function Giveaways() {
  const { activeBook } = useBook();
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [prize, setPrize] = useState("");
  const [instructions, setInstructions] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxEntries, setMaxEntries] = useState(100);
  const [winner, setWinner] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    setGiveaways(getGiveaways());
  }, []);

  const handleCreate = () => {
    if (!title || !prize) return;
    const updated = addGiveaway({
      title,
      prize,
      entryInstructions: instructions,
      status: "draft",
      startDate,
      endDate,
      maxEntries,
    });
    setGiveaways(updated);
    setShowForm(false);
    setTitle("");
    setPrize("");
    setInstructions("");
    setStartDate("");
    setEndDate("");
    setMaxEntries(100);
  };

  const handlePickWinner = (id: string) => {
    const w = pickWinner(id);
    setWinner(w);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Giveaways</h2>
          <p className="text-sm text-muted">Run giveaways and contests to build hype for your book.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-accent text-white font-semibold rounded-lg px-4 py-2 text-sm transition-all hover:bg-accent/90 active:scale-[0.98]"
        >
          {showForm ? "Cancel" : "+ New Giveaway"}
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-accent-dim rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted font-medium">Giveaway Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Launch Week Giveaway" className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted font-medium">Prize</label>
              <input value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="e.g. Signed paperback + swag pack" className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted font-medium">Entry Instructions</label>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. Follow on IG, tag a friend, and comment below" rows={2} className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted font-medium">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted font-medium">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted font-medium">Max Entries</label>
              <input type="number" value={maxEntries} onChange={(e) => setMaxEntries(Number(e.target.value))} min={1} className="w-full bg-card text-foreground border border-accent-dim rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={handleCreate} disabled={!title || !prize} className="bg-accent text-white font-medium rounded-lg px-4 py-2 text-sm disabled:opacity-40 hover:bg-accent/90 transition-colors">
            Create Giveaway
          </button>
        </div>
      )}

      {winner && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
          <p className="text-lg font-bold text-green-400">Winner: {winner.name}</p>
          <p className="text-sm text-foreground">{winner.email}</p>
          <button onClick={() => setWinner(null)} className="text-xs text-muted hover:text-accent mt-2">Dismiss</button>
        </div>
      )}

      {giveaways.length === 0 ? (
        <div className="bg-card border border-accent-dim rounded-xl p-8 text-center text-sm text-muted">
          No giveaways yet. Create one to start building excitement.
        </div>
      ) : (
        giveaways.map((g) => (
          <div key={g.id} className="bg-card border border-accent-dim rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-foreground">{g.title}</h3>
                <p className="text-sm text-muted">Prize: {g.prize}</p>
              </div>
              <select
                value={g.status}
                onChange={(e) => {
                  const updated = updateGiveaway(g.id, { status: e.target.value as Giveaway["status"] });
                  setGiveaways(updated);
                }}
                className="text-xs bg-card border border-accent-dim rounded px-2 py-1 text-foreground"
              >
                <option value="draft">Draft</option>
                <option value="running">Running</option>
                <option value="ended">Ended</option>
              </select>
            </div>

            {g.entryInstructions && <p className="text-sm text-foreground bg-card/50 rounded px-3 py-2">{g.entryInstructions}</p>}

            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="bg-card/50 rounded-lg p-2">
                <p className="text-lg font-bold text-accent">{g.entries.length}</p>
                <p className="text-xs text-muted">Entries</p>
              </div>
              <div className="bg-card/50 rounded-lg p-2">
                <p className="text-lg font-bold text-foreground">{g.maxEntries}</p>
                <p className="text-xs text-muted">Max</p>
              </div>
              <div className="bg-card/50 rounded-lg p-2">
                <p className={`text-lg font-bold ${g.entries.length >= g.maxEntries ? "text-red-400" : "text-foreground"}`}>
                  {Math.round((g.entries.length / g.maxEntries) * 100)}%
                </p>
                <p className="text-xs text-muted">Filled</p>
              </div>
            </div>

            {g.entries.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {g.entries.map((e, i) => (
                  <div key={i} className="flex items-center justify-between bg-card/50 rounded px-3 py-1.5 text-sm">
                    <span className="text-foreground">{e.name}</span>
                    <span className="text-muted text-xs">{e.email} • {new Date(e.enteredAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handlePickWinner(g.id)}
                disabled={g.entries.length === 0}
                className="bg-accent text-white text-sm font-medium rounded-lg px-3 py-1.5 disabled:opacity-40 hover:bg-accent/90 transition-colors"
              >
                Pick Winner
              </button>
              <button
                onClick={() => {
                  const updated = removeGiveaway(g.id);
                  setGiveaways(updated);
                }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
