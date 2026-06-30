#!/usr/bin/env bash
# Provision a fresh Ubuntu 22.04+ VM to run the OpenClaw WhatsApp gateway 24/7.
# Installs Node 22 LTS + OpenClaw, prepares ~/.openclaw. Idempotent-ish.
#
# After this runs:
#   1) copy your openclaw.json + skills/erm-assistant + bot-token file onto the VM
#   2) openclaw channels add      (pair WhatsApp QR to the dedicated bot number)
#   3) openclaw gateway install && openclaw gateway start
# See README.md for the full runbook.
set -euo pipefail

if [ "$(id -u)" -eq 0 ]; then
  echo "Run this as your normal (non-root) user; it uses sudo where needed." >&2
  exit 1
fi

echo "==> Installing Node 22 LTS + build tools (Bun is NOT supported for WhatsApp)"
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential

echo "==> Installing OpenClaw globally"
sudo npm i -g openclaw
echo -n "OpenClaw version: "; openclaw --version

echo "==> Preparing ~/.openclaw"
mkdir -p "$HOME/.openclaw/skills"
chmod 700 "$HOME/.openclaw"

cat <<'NEXT'

==> Base setup complete.

Next steps (see openclaw/deploy/README.md):
  1. Copy your config + skill + token onto this VM:
       ~/.openclaw/openclaw.json
       ~/.openclaw/skills/erm-assistant/
       ~/openclaw-bot-token.txt
     ...and edit openclaw.json: dmPolicy=allowlist, allowFrom=["+21694702014"],
     ERM_BOT_FILE=/home/<you>/openclaw-bot-token.txt, gateway.auth.token, OPENROUTER_API_KEY.
  2. Pair WhatsApp to the BOT number (50883275):
       openclaw channels add      # or: openclaw qr
     Scan the QR from the phone holding 50883275 (Linked Devices > Link a device).
  3. Run it 24/7:
       openclaw gateway install && openclaw gateway start && openclaw gateway status
NEXT
