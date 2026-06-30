# OpenClaw WhatsApp bot — always-on deployment (dedicated number)

Run the OpenClaw gateway **24/7 on a small Linux VM**, linked to a **dedicated WhatsApp
number** (the bot). You then DM the bot from your personal number like any normal
contact — no more self-chat, no session-conflict errors, and it stays live with your PC off.

## Numbers for this deployment

| Role                    | Number              | How it's used                                 |
| ----------------------- | ------------------- | --------------------------------------------- |
| **Bot** (linked via QR) | **+216 50 883 275** | The account the gateway logs into             |
| **You** (`allowFrom`)   | **+216 94 702 014** | Your personal line — you DM the bot from here |

## Verified architecture (June 2026)

- OpenClaw's WhatsApp channel is **Baileys** (WhatsApp Web, QR pairing). Exactly **one
  linked device per number at a time** — so the bot needs its **own** number.
- A dedicated bot number is OpenClaw's documented "cleanest operational mode" and removes
  the self-chat session-conflict you were hitting.
- On a **real VM**, `~/.openclaw` (config + Baileys creds + sessions + the ERM skill) lives
  on the disk and **survives restarts with no QR re-scan** — unless WhatsApp logs the link
  out (which is exactly what the self-chat conflict was causing; a dedicated number fixes it).
- The bot number's **phone must come online ~every 14 days** or WhatsApp drops all linked
  devices (you'd have to re-scan the QR). A separate ~30-day total-inactivity rule also applies.
- **Do NOT host on Azure App Service / Container Instances** — their container recycling kills
  the process mid-write and corrupts the Baileys session. Use a plain VM.

---

## 0. Prerequisites (only you can do these)

- **50883275 verified as a WhatsApp account** on a phone (real carrier SIM — not a free
  VoIP/virtual number, which WhatsApp blocks/flags). Use a spare handset, WhatsApp's
  _Settings → Accounts → Add account_, or the **WhatsApp Business** app as a 2nd account.
- A **Linux VM** (Ubuntu 22.04+): Azure B1s / Oracle Always-Free A1 / Hetzner CX22 (see the
  per-host quickstarts at the bottom).
- An **OpenRouter API key** (https://openrouter.ai/keys).

## 1. Base setup on the VM

SSH in and run the helper (installs Node + OpenClaw):

```bash
curl -fsSL https://raw.githubusercontent.com/<your-repo>/main/openclaw/deploy/provision-ubuntu.sh | bash
# …or do it manually:
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -   # Node 22 LTS (Bun is NOT supported for WhatsApp)
sudo apt-get install -y nodejs build-essential
sudo npm i -g openclaw
openclaw --version
```

## 2. Bring over your ERM setup (PC → VM)

Copy the config + skill + bot-token file. **Do NOT copy the old Baileys credentials**
(`~/.openclaw/credentials/whatsapp/…`) — you'll re-pair fresh to the new number.

```powershell
# from your Windows PC (adjust HOST/user):
scp "$env:USERPROFILE\.openclaw\openclaw.json"            user@HOST:~/.openclaw/openclaw.json
scp -r "$env:USERPROFILE\.openclaw\skills\erm-assistant"  user@HOST:~/.openclaw/skills/
scp "$env:USERPROFILE\openclaw-bot-token.txt"             user@HOST:~/openclaw-bot-token.txt
```

Then edit `~/.openclaw/openclaw.json` **on the VM**:

```jsonc
{
  "channels": {
    "whatsapp": {
      "enabled": true,
      "dmPolicy": "allowlist",
      "allowFrom": ["+21694702014"], // YOUR personal number (the gateway is LINKED to the bot number)
    },
  },
  "gateway": {
    "mode": "local",
    "bind": "loopback", // never expose to the internet
    "auth": { "mode": "token", "token": "<run: openssl rand -hex 32>" },
  },
  "skills": {
    "entries": {
      "erm-assistant": {
        "enabled": true,
        "env": {
          "ERM_API_BASE": "https://tactic-backend-d1452d.azurewebsites.net",
          "ERM_BOT_FILE": "/home/USER/openclaw-bot-token.txt", // ← Linux path now, not C:\…
        },
      },
    },
  },
  "env": { "OPENROUTER_API_KEY": "sk-or-v1-…" },
}
```

Lock down permissions:

```bash
chmod 700 ~/.openclaw
chmod 600 ~/.openclaw/openclaw.json ~/openclaw-bot-token.txt
```

## 3. Link WhatsApp to the BOT number (QR over SSH)

```bash
openclaw channels add        # pick whatsapp, follow prompts
# or print a pairing QR/code directly:
openclaw qr
```

A QR (ASCII art) prints in the terminal. On the phone holding **50883275**:
**WhatsApp → Settings → Linked Devices → Link a device → scan it.** Then verify:

```bash
openclaw channels status     # should show whatsapp connected as +21650883275
```

## 4. Install it as a 24/7 service (survives reboot + crash)

```bash
openclaw gateway install     # creates a systemd unit
openclaw gateway start
openclaw gateway status
```

## 5. Stop the gateway on your PC

Run **exactly one** gateway. On Windows, stop the foreground `openclaw gateway` (Ctrl-C);
if you installed it as a service there, `openclaw gateway stop` then `openclaw gateway uninstall`.
(The PC was linked to your old number 94702014 — that link is now irrelevant.)

## 6. Test

From your personal WhatsApp (94702014), open a chat with **+216 50 883 275** and send
_"Quel est le score du risque"_ → you should get the live ERM answer.

## 7. Secure remote admin (optional)

Never bind `0.0.0.0`. To reach the gateway from your laptop:

```bash
# SSH tunnel (port from `openclaw gateway status`):
ssh -N -L 19000:127.0.0.1:<port> user@HOST
# …or the built-in Tailscale exposure:
openclaw gateway --tailscale serve
```

## 8. Operate

- Open WhatsApp on **50883275's phone at least every ~14 days** (sooner is safer).
- Backups: `openclaw backup create` (config + creds + sessions) → copy off-box.
- Update: `sudo npm i -g openclaw@latest && openclaw gateway restart`.
- Audit: `openclaw security audit --deep`.

---

## Per-host quickstart

### Azure VM B1s — recommended (stays on Azure, free 12 months if your sub is free-tier eligible, else ~$7.59/mo)

```bash
az group create -n erm-bot-rg -l westeurope
az vm create -g erm-bot-rg -n erm-bot --image Ubuntu2204 --size Standard_B1s \
  --admin-username azureuser --generate-ssh-keys
# keep only SSH open — do NOT open the gateway port
ssh azureuser@<public-ip>
```

> B1s has 1 GB RAM (tight). If the gateway is sluggish, resize to `Standard_B2s`.

### Oracle Cloud Always Free — A1 ARM (free forever)

Create a `VM.Standard.A1.Flex` (1 OCPU / 6 GB is plenty) on Ubuntu 22.04 in an **EU/APAC**
region (US often returns "out of host capacity"). Security list: allow **SSH only**.

### Hetzner CX22 (~€4.59/mo — cheapest reliable)

Create a CX22 Ubuntu 22.04 server; firewall: **SSH only**.

---

## Zero-ban-risk alternative (not this setup)

Baileys is unofficial WhatsApp Web → a non-zero account-ban risk on the bot number. The only
zero-ban path is the **official WhatsApp Cloud API** via a community channel plugin
(`openclaw-channel-twilio-whatsapp`): webhook-based (no QR, no persistent socket — it could
even run on your existing Azure App Service), but it **costs per conversation**, needs
**Twilio + Meta business onboarding**, and has **no group chat**. Stick with Baileys + a
cheap dedicated number unless you outgrow it.
