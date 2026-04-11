import React from 'react';

type CrimeStat = {
  category: string;
  incidents: number;
};

interface CrimeStatsGridProps {
  stats: CrimeStat[];
  county: string;
}

export function CrimeStatsGrid({ stats, county }: CrimeStatsGridProps) {
  if (!stats || stats.length === 0) {
    return null;
  }

  // Remove the long repetitive prefix from the CSO crime categories to make them UI-friendly.
  const cleanCategoryName = (name: string) => {
    return name
      .replace(/offences\s*\(.*?\)/i, "")
      .replace(/offences\s+/i, "")
      .trim();
  };

  const totalIncidents = stats.reduce((acc, curr) => acc + curr.incidents, 0);

  return (
    <div className="bg-slate-900 p-5 rounded-2xl shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Local Area Safety</h3>
        <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
          Official CSO
        </span>
      </div>
      
      <p className="text-xs text-slate-400 font-medium leading-relaxed">
        Recorded crime incidents reported by Garda stations operating in the <strong className="text-slate-200">{county}</strong> division over the last 12-month period.
      </p>

      <div className="space-y-3 pt-2">
        {stats.slice(0, 5).map((stat) => {
          const percentage = totalIncidents > 0 ? (stat.incidents / totalIncidents) * 100 : 0;
          return (
            <div key={stat.category} className="space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-slate-200 truncate pr-4">
                  {cleanCategoryName(stat.category)}
                </span>
                <span className="text-[10px] font-black text-rose-400 tracking-wider">
                  {stat.incidents.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-rose-500 to-rose-400 h-1.5 rounded-full" 
                  style={{ width: `${Math.min(percentage * 2, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
