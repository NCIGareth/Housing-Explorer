"use client";

import { useUser } from "@/components/auth-provider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Favourite = {
  id: string;
  createdAt: string;
  property: {
    id: string;
    address: string;
    county: string;
    priceEur: number;
    saleDate: string;
    eircode: string | null;
    descriptionOfProperty: string;
  };
};

export default function FavouritesPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [items, setItems] = useState<Favourite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/signin");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/favourites").then(r => r.json()).then(d => {
      setItems(d.items || []);
      setLoading(false);
    });
  }, [user]);

  async function removeFav(propertyId: string) {
    await fetch("/api/favourites", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId }),
    });
    setItems(s => s.filter(x => x.property.id !== propertyId));
  }

  if (authLoading || loading) {
    return <div className="max-w-3xl mx-auto px-4 py-12"><p className="text-slate-500">Loading...</p></div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Saved Properties</h1>
      <p className="text-sm text-slate-500 mb-8">Properties you&apos;ve bookmarked for later.</p>

      {items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl">
          <p className="text-slate-500">No saved properties yet.</p>
          <p className="text-sm text-slate-400 mt-1">Browse the map or search results and save properties you&apos;re interested in.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(fav => (
            <div key={fav.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-colors">
              <Link href={`/sales/${fav.property.id}`} className="flex-1 min-w-0 mr-4 decoration-transparent">
                <p className="font-medium text-slate-900 truncate">{fav.property.address}</p>
                <p className="text-sm text-slate-500">
                  {fav.property.county}{fav.property.eircode ? `, ${fav.property.eircode}` : ""}
                </p>
                <p className="text-sm font-semibold text-slate-700 mt-0.5">
                  €{fav.property.priceEur.toLocaleString()}
                  <span className="text-xs text-slate-400 font-normal ml-2">
                    {new Date(fav.property.saleDate).toLocaleDateString("en-IE", { year: "numeric", month: "short" })}
                  </span>
                </p>
              </Link>
              <button
                onClick={() => removeFav(fav.property.id)}
                className="shrink-0 text-xs text-rose-600 hover:text-rose-700 font-medium px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
