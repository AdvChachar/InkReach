"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Users, TrendingUp, CreditCard, Activity, Crown, XCircle, Loader2 } from "lucide-react";

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await loadData();
      setLoading(false);
    })();
  }, []);

  async function loadData() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();

    if (data.error) {
      setError(data.error);
      return;
    }
    if (!data.profiles) {
      setError("No data returned from API");
      return;
    }

    setError("");
    const total = data.profiles.length;
    const proCount = data.profiles.filter((p: any) => p.subscription_status === "pro").length;
    const todayGens = (data.usage || []).filter((l: any) =>
      l.created_at?.startsWith(new Date().toISOString().slice(0, 10))
    ).length;
    setStats({ total, proCount, todayGens, totalGens: data.usage?.length || 0 });
    setUsers(data.profiles);
  }

  async function togglePro(targetUserId: string, isCurrentlyPro: boolean) {
    setToggling(targetUserId);
    await fetch("/api/admin/set-pro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId, action: isCurrentlyPro ? "remove" : "grant" }),
    });
    setToggling(null);
    await loadData();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted">Loading...</div>;
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center text-red-400">Access denied. Admins only.</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-400">{error}</div>;
  if (!stats) return <div className="min-h-screen flex items-center justify-center text-muted">No data</div>;

  return (
    <div className="min-h-screen bg-dark p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Users className="w-5 h-5" />} label="Total Users" value={stats.total} color="text-blue-400" />
        <StatCard icon={<CreditCard className="w-5 h-5" />} label="Pro Users" value={stats.proCount} color="text-accent" />
        <StatCard icon={<Activity className="w-5 h-5" />} label="Today's Generations" value={stats.todayGens} color="text-yellow-400" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Total Generations" value={stats.totalGens} color="text-purple-400" />
      </div>

      <div className="bg-card border border-border-subtle rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle font-medium text-foreground text-sm">
          Users ({users.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Joined</th>
                <th className="text-center px-4 py-3 font-medium">Pro</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border-subtle text-foreground">
                  <td className="px-4 py-3">{u.email || "—"}</td>
                  <td className="px-4 py-3">{u.name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      u.subscription_status === "pro"
                        ? "bg-accent/10 text-accent"
                        : u.subscription_status === "cancelled"
                        ? "bg-yellow-500/10 text-yellow-400"
                        : "bg-muted/10 text-muted"
                    }`}>
                      {u.subscription_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => togglePro(u.id, u.subscription_status === "pro")}
                      disabled={toggling === u.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        u.subscription_status === "pro"
                          ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          : "bg-accent/10 text-accent hover:bg-accent/20"
                      } disabled:opacity-50`}
                    >
                      {toggling === u.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : u.subscription_status === "pro" ? (
                        <XCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Crown className="w-3.5 h-3.5" />
                      )}
                      {u.subscription_status === "pro" ? "Remove Pro" : "Make Pro"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-card border border-border-subtle rounded-lg p-4">
      <div className={`${color} mb-1`}>{icon}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
