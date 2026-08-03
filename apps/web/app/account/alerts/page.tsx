"use client";

export const dynamic = "force-dynamic";

import { useUser } from "@/components/auth-provider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SavedSearch = {
  id: string;
  name: string;
  county: string | null;
  minPriceEur: number | null;
  maxPriceEur: number | null;
  createdAt: string;
  alerts: AlertItem[];
};

type AlertItem = {
  id: string;
  type: string;
  enabled: boolean;
  savedSearchId: string | null;
  lastTriggeredAt?: string | null;
};

export default function AlertsPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCounty, setFormCounty] = useState("");
  const [formMinPrice, setFormMinPrice] = useState("");
  const [formMaxPrice, setFormMaxPrice] = useState("");
  const [alertType, setAlertType] = useState("NEW_LISTING_MATCH");
  const [creating, setCreating] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testFeedback, setTestFeedback] = useState<Record<string, "sent" | "error">>({});

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/signin");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/saved-searches").then(r => r.json()).then(d => {
      setSearches(d.items || []);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      console.error("Failed to load saved searches");
    });
  }, [user]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("new") === "1") setShowForm(true);
  }, []);

  async function createSavedSearch(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const body: Record<string, unknown> = { name: formName };
      if (formCounty) body.county = formCounty;
      if (formMinPrice) body.minPriceEur = parseInt(formMinPrice);
      if (formMaxPrice) body.maxPriceEur = parseInt(formMaxPrice);

      const res = await fetch("/api/saved-searches", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) { setCreating(false); return; }
      const { item } = await res.json();

      await fetch("/api/alerts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savedSearchId: item.id, type: alertType }),
      });

      setShowForm(false);
      setFormName(""); setFormCounty(""); setFormMinPrice(""); setFormMaxPrice("");
      const r = await fetch("/api/saved-searches");
      const d = await r.json();
      setSearches(d.items || []);
    } catch (err) {
      console.error("Failed to create saved search:", err);
    }
    setCreating(false);
  }

  async function deleteSearch(id: string) {
    try {
      await fetch("/api/saved-searches", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
      setSearches(s => s.filter(x => x.id !== id));
    } catch (err) {
      console.error("Failed to delete saved search:", err);
    }
  }

  async function sendTestEmail(a: AlertItem, s: SavedSearch) {
    setTestingId(a.id);
    try {
      const res = await fetch("/api/alerts", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertId: a.id,
          previewMessage: `Test alert for: ${s.name}\n\nNew matching sales will be listed here monthly.`,
        }),
      });
      if (!res.ok) throw new Error(`Failed to send test email: ${res.status}`);
      setTestFeedback(prev => ({ ...prev, [a.id]: "sent" }));
    } catch (err) {
      console.error("Failed to send test email:", err);
      setTestFeedback(prev => ({ ...prev, [a.id]: "error" }));
    } finally {
      setTestingId(null);
    }
  }

  if (authLoading || loading) {
    return <div className="max-w-3xl mx-auto px-4 py-12"><p className="text-slate-500">Loading...</p></div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Alerts</h1>
          <p className="text-sm text-slate-500 mt-1">Get notified of new PPR property sales matching your search.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
          {showForm ? "Cancel" : "New alert"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createSavedSearch} className="mb-8 p-5 border border-slate-200 rounded-xl bg-slate-50 space-y-4">
          <h2 className="font-semibold text-slate-900">New saved search & alert</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input required value={formName} onChange={e => setFormName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Dublin houses" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">County</label>
              <input value={formCounty} onChange={e => setFormCounty(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Dublin" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Min price (EUR)</label>
              <input type="number" value={formMinPrice} onChange={e => setFormMinPrice(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max price (EUR)</label>
              <input type="number" value={formMaxPrice} onChange={e => setFormMaxPrice(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Alert type</label>
              <select value={alertType} onChange={e => setAlertType(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="NEW_LISTING_MATCH">New property sales</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={creating} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {creating ? "Creating..." : "Create alert"}
          </button>
        </form>
      )}

      {searches.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl">
          <p className="text-slate-500">No saved searches yet.</p>
          <p className="text-sm text-slate-400 mt-1">Get notified when new PPR property sales match your criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {searches.map(s => (
            <div key={s.id} className="p-5 border border-slate-200 rounded-xl bg-white">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{s.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {[s.county, s.minPriceEur ? `€${s.minPriceEur.toLocaleString()}+` : "", s.maxPriceEur ? `up to €${s.maxPriceEur.toLocaleString()}` : ""].filter(Boolean).join(" · ") || "No filters"}
                  </p>
                </div>
                <button onClick={() => deleteSearch(s.id)} className="text-xs text-rose-600 hover:text-rose-700 font-medium">Delete</button>
              </div>
              {s.alerts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  {s.alerts.map(a => (
                    <div key={a.id} className="flex items-start justify-between text-sm gap-2">
                      <div className="space-y-0.5">
                        <span className="text-slate-600">New property sales</span>
                        <p className="text-xs text-slate-400">
                          {a.lastTriggeredAt
                            ? `Last triggered: ${new Date(a.lastTriggeredAt).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" })}`
                            : "Never triggered yet"}
                        </p>
                        {testFeedback[a.id] === "sent" && <p className="text-xs text-emerald-600">Test sent</p>}
                        {testFeedback[a.id] === "error" && <p className="text-xs text-rose-600">Couldn&apos;t send test email</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {a.enabled && (
                          <button
                            onClick={() => sendTestEmail(a, s)}
                            disabled={testingId === a.id}
                            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                          >
                            {testingId === a.id ? "Sending…" : "Send test email"}
                          </button>
                        )}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {a.enabled ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
