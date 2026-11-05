#!/bin/bash
# Installs the daily orders backup on this Mac (run once; safe to run again after updating the script).
#
#   ~/.psgaminghub-backup/            the script + .env with the Supabase key (only you can read it)
#   ~/PSGamingHub-Backups/            orders.csv, daily/ copies and backup.log
#   ~/Library/LaunchAgents/...plist   runs it every day at 10 PM (or as soon as the Mac wakes, if it was asleep)
#
# These live outside ~/Documents on purpose: macOS blocks background jobs from reading Documents.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$HOME/.psgaminghub-backup"
OUT="$HOME/PSGamingHub-Backups"
LABEL="com.psgaminghub.orders-backup"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
NODE="$(command -v node)"

mkdir -p "$DIR" "$OUT" "$HOME/Library/LaunchAgents"
cp "$REPO/scripts/backup-orders.mjs" "$DIR/backup-orders.mjs"

# Create the key file once; never overwrite a key that's already there.
if [ ! -f "$DIR/.env" ]; then
  URL="$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$REPO/.env.local" | cut -d= -f2-)"
  printf 'SUPABASE_URL=%s\nSUPABASE_SECRET_KEY=PASTE_YOUR_SECRET_KEY_HERE\n' "$URL" > "$DIR/.env"
fi
chmod 700 "$DIR"
chmod 600 "$DIR/.env"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>$DIR/backup-orders.mjs</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>22</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>$OUT/backup.log</string>
  <key>StandardErrorPath</key><string>$OUT/backup.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

echo "Installed. Backups go to $OUT (daily at 10 PM)."
if grep -q PASTE "$DIR/.env"; then
  echo "Next: paste your Supabase secret key into $DIR/.env"
fi
