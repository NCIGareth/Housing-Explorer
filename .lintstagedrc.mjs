// Use function form so lint-staged doesn't append file paths as args.
// Run tsc directly (not via turbo) to avoid triggering prisma generate,
// which fails on Windows when the dev server holds the DLL lock.
export default {
  "**/*.{ts,tsx}": () => [
    "pnpm --filter @housing/web exec tsc --noEmit",
    "pnpm --filter @housing/ingestion exec tsc --noEmit",
    "pnpm --filter @housing/shared exec tsc --noEmit",
  ],
};
