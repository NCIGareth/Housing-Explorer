export function formatErrorRadius(errorMeters: number): string {
  if (errorMeters < 1000) return `±${Math.round(errorMeters)} m`;
  return `±${(errorMeters / 1000).toFixed(1)} km`;
}

type Props = {
  confidence: number | null;
  errorMeters: number | null;
};

export function CoordinateConfidenceBadge({ confidence, errorMeters }: Props) {
  if (confidence == null) return null;

  const label = confidence >= 90 ? "High precision" : confidence >= 65 ? "Approximate" : "Low precision";
  const cls =
    confidence >= 90
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : confidence >= 65
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-red-100 text-red-700 border-red-200";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-tighter border ${cls}`}
      title={`Map pin confidence ${Math.round(confidence)}/100`}
    >
      {label}
      {errorMeters != null && (
        <span className="font-bold normal-case tracking-normal">{formatErrorRadius(errorMeters)}</span>
      )}
    </span>
  );
}
