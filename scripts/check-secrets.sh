#!/bin/sh
# Pre-commit hook: reject files containing what look like real credentials
# Only checks files that define env vars: *.env*, *.example, *.sample

STAGED=$(git diff --cached --name-only --diff-filter=ACM -- '.env*' '*.example' '*.sample' 2>/dev/null)

if [ -z "$STAGED" ]; then
  exit 0
fi

HAS_SECRET=0

known_placeholders="localhost|placeholder|your_|YOUR_|change-me|CHANGE_ME|your-key|xxx|\.\.\."

for file in $STAGED; do
  CONTENT=$(git show ":$file" 2>/dev/null)

  # Helper: extract a var's value from the env file
  get_val() {
    echo "$CONTENT" | grep "^$1=" | sed "s/^$1=//" | head -1
  }

  # ─── SMTP_PASS with a non-empty, non-placeholder value ───
  val=$(get_val SMTP_PASS | tr -d '"'"'")
  if [ -n "$val" ] && ! echo "$val" | grep -Eq "$known_placeholders"; then
    echo "❌ SECRET LEAK: $file contains SMTP_PASS with a real-looking value"
    HAS_SECRET=1
  fi

  # ─── SMTP_USER with a non-empty, non-placeholder value ───
  val=$(get_val SMTP_USER | tr -d '"'"'")
  if [ -n "$val" ] && ! echo "$val" | grep -Eq "$known_placeholders"; then
    echo "❌ SECRET LEAK: $file contains SMTP_USER with a real-looking value"
    HAS_SECRET=1
  fi

  # ─── SMTP_HOST not localhost ───
  val=$(get_val SMTP_HOST | tr -d '"'"'")
  if [ -n "$val" ] && [ "$val" != "localhost" ] && [ "$val" != "127.0.0.1" ]; then
    echo "❌ SECRET LEAK: $file contains SMTP_HOST pointing to a non-localhost server"
    HAS_SECRET=1
  fi

  # ─── RESEND_API_KEY with a real-looking value ───
  val=$(get_val RESEND_API_KEY | tr -d '"'"'")
  if [ -n "$val" ] && ! echo "$val" | grep -Eq "$known_placeholders"; then
    echo "❌ SECRET LEAK: $file contains a real-looking RESEND_API_KEY"
    HAS_SECRET=1
  fi

  # ─── DISPATCH_CRON_SECRET with a real-looking value ───
  val=$(get_val DISPATCH_CRON_SECRET | tr -d '"'"'")
  if [ -n "$val" ] && ! echo "$val" | grep -Eq "$known_placeholders"; then
    echo "❌ SECRET LEAK: $file contains DISPATCH_CRON_SECRET with a real-looking value"
    HAS_SECRET=1
  fi

  # ─── DATABASE_URL / DIRECT_URL not localhost ───
  for varname in DATABASE_URL DIRECT_URL; do
    val=$(get_val "$varname" | tr -d '"'"'")
    if [ -n "$val" ]; then
      host=$(echo "$val" | sed 's|postgresql://[^:]*:[^@]*@||' | sed 's|[:/].*||')
      if [ "$host" != "localhost" ] && [ "$host" != "127.0.0.1" ]; then
        echo "❌ SECRET LEAK: $file contains $varname pointing to $host (not localhost)"
        HAS_SECRET=1
      fi
    fi
  done
done

if [ "$HAS_SECRET" = "1" ]; then
  echo ""
  echo "⚠️  Use placeholder values in .env.example files. Real credentials go in .env (gitignored)."
  exit 1
fi

exit 0
