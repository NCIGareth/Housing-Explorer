"use client";

import { useUser } from "./auth-provider";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function SavePropertyButton({ propertyId }: { propertyId: string }) {
  const { user } = useUser();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch("/api/favourites").then(r => r.json()).then(d => {
      if (d.items?.some((f: { propertyId: string }) => f.propertyId === propertyId)) {
        setSaved(true);
      }
    }).catch(() => {});
  }, [user, propertyId]);

  async function handleClick() {
    if (!user) {
      router.push("/auth/signin");
      return;
    }

    setLoading(true);
    try {
      if (saved) {
        await fetch("/api/favourites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId }),
        });
        setSaved(false);
      } else {
        const res = await fetch("/api/favourites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId }),
        });
        if (res.ok) setSaved(true);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
        saved
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
      aria-label={saved ? "Remove from saved properties" : "Save property"}
    >
      <svg className="w-3.5 h-3.5" fill={saved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
      {saved ? "Saved" : "Save"}
    </button>
  );
}
