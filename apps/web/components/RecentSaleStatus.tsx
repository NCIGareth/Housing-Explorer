export default async function RecentSaleStatus() {
  // Skip database calls during the static generation phase of the build
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return null;
  }

  try {
    const { getLatestSaleDate } = await import("@/lib/queries");
    const latestSaleDate = await getLatestSaleDate();
    
    if (!latestSaleDate) return null;

    return (
      <span className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
        Latest update: {latestSaleDate.toLocaleDateString('en-IE', { month: 'short', year: 'numeric' })}
      </span>
    );
  } catch (error) {
    console.warn("Failed to fetch latest sale date for status bar:", error);
    return null;
  }
}
