import React from 'react';

interface AreaSnapshotProps {
  routingKey: string;
  medianPrice: number;
  volume: number;
  growthPercent: number | null;
  county?: string;
}

export function AreaSnapshot({ routingKey, medianPrice, volume, growthPercent, county }: AreaSnapshotProps) {
  const isPositive = growthPercent !== null && growthPercent > 0;
  const isNegative = growthPercent !== null && growthPercent < 0;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">📊</span>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Area Snapshot: {routingKey}</h3>
        </div>
        {growthPercent !== null && (
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
            isPositive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
            isNegative ? 'bg-rose-50 text-rose-700 border-rose-100' : 
            'bg-slate-50 text-slate-600 border-slate-100'
          }`}>
            <span aria-label={isPositive ? `Up ${Math.abs(growthPercent).toFixed(1)} percent year over year` : isNegative ? `Down ${Math.abs(growthPercent).toFixed(1)} percent year over year` : `Stable ${Math.abs(growthPercent).toFixed(1)} percent year over year`}>
              {isPositive ? '↑' : isNegative ? '↓' : ''} {Math.abs(growthPercent).toFixed(1)}% YoY
            </span>
          </span>
        )}
      </div>

      <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
        Market performance for the <strong>{routingKey}</strong> routing key over the last 12 months.
      </p>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Median Price</span>
          <span className="text-sm font-black text-slate-900">€{medianPrice.toLocaleString()}</span>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">12m Volume</span>
          <span className="text-sm font-black text-slate-900">{volume.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">Sales</span></span>
        </div>
      </div>

      <div className="pt-2">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
          <span>Market Sentiment</span>
          <span className={isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-slate-600'}>
            <span aria-label={`Market sentiment: ${isPositive ? 'Growth Phase' : isNegative ? 'Cooling' : 'Stable'} (${isPositive ? 'increasing' : isNegative ? 'decreasing' : 'stable'} prices)`}>
              {isPositive ? 'Growth Phase' : isNegative ? 'Cooling' : 'Stable'}
            </span>
          </span>
        </div>
        <div
          className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.min(Math.max(50 + (growthPercent || 0) * 2, 10), 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Sentiment strength: ${isPositive ? 'Growth' : isNegative ? 'Cooling' : 'Stable'} market`}
        >
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${
              isPositive ? 'bg-emerald-500' : isNegative ? 'bg-rose-500' : 'bg-slate-400'
            }`}
            style={{ width: `${Math.min(Math.max(50 + (growthPercent || 0) * 2, 10), 100)}%` }}
          />
        </div>
      </div>

      {county && (
        <a
          href={`/compare?areas=${encodeURIComponent(county)}`}
          className="block text-center text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider pt-1 transition-colors"
        >
          Compare with other areas →
        </a>
      )}
    </div>
  );
}
