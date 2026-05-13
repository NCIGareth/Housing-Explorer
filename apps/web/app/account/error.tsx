"use client";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="max-w-2xl mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
        <span className="text-3xl">!</span>
      </div>
      <h1 className="text-2xl font-black text-slate-900">Something went wrong</h1>
      <p className="text-sm text-slate-500 max-w-md leading-relaxed">
        An unexpected error occurred while loading your account page.
        {error.digest && (
          <span className="block mt-2 text-xs font-mono text-slate-400">
            Error ID: {error.digest}
          </span>
        )}
      </p>
      <button
        onClick={reset}
        className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-sm"
      >
        Try again
      </button>
    </main>
  );
}
