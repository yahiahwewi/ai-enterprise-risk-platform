# OpenClaw WhatsApp assistant — setup

This kit wires OpenClaw to your **live** Tac-Tic ERM backend through a read-only bot.
Almost everything is pre-built; your manual steps are the inherently-interactive ones.

## ✅ Already done for you (ERM side)

- Read-only **analyst bot account** + long-lived token → `C:\Users\user\openclaw-bot-token.txt`.
- `/api/ai/copilot` opened to the bot role (free-form NL questions).
- This **config** (`openclaw.json`) + **skill** (`skills/erm-assistant/`) pre-pointed at
  `https://tactic-backend-d1452d.azurewebsites.net`.

## 🔧 What YOU do manually

1. **Pick a host** that stays online and run it on **Node** (docs warn Bun is incompatible
   for the WhatsApp gateway). Install OpenClaw there (see https://docs.openclaw.ai/).
2. **Use a dedicated/secondary WhatsApp number** — OpenClaw links via WhatsApp Web
   (Baileys, _unofficial_), so there is an account-ban risk. Do **not** use the main line.
3. **Provide your LLM key** (any provider — Claude / OpenAI / Groq / DeepSeek / Ollama):
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...      # or GROQ_API_KEY=... (reuse your existing one)
   ```
4. **Keep the ERM bot token in a file** and point the skill at its path. OpenClaw
   **blocks secret-named env vars** (anything containing `TOKEN`/`KEY`/`SECRET`) from
   reaching skill processes, so do _not_ pass the token via env — `erm.js` reads it from
   the file given in `ERM_BOT_FILE` (already set in `openclaw.json`):
   ```bash
   # the file already exists from the bot-provisioning step:
   #   C:\Users\user\openclaw-bot-token.txt   (Linux/mac: /path/to/openclaw-bot-token.txt)
   # just make sure ERM_BOT_FILE in openclaw.json points at it.
   ```
5. **Install the config + skill:**
   ```bash
   mkdir -p ~/.openclaw/skills
   cp openclaw.json ~/.openclaw/openclaw.json
   cp -r skills/erm-assistant ~/.openclaw/skills/
   # then edit ~/.openclaw/openclaw.json → set allowFrom to your WhatsApp number
   ```
6. **Add the WhatsApp channel + link the phone (QR — the one truly manual step):**
   ```bash
   openclaw channels add --channel whatsapp
   openclaw channels login --channel whatsapp     # ← scan the QR with your dedicated phone
   openclaw pairing approve whatsapp <CODE>        # if it shows a pairing code
   openclaw gateway                                # bot is now live
   ```
7. **Test:** from your allow-listed number, message the bot:
   _"Quel est le score de risque ?"_ → it should reply with the live score.

## Notes

- Proactive alerts run automatically via the `heartbeat`/`cron` in `openclaw.json` (every 30 min
  the skill runs `node erm.js alerts` and pings you only if `CRITICAL`).
- Keep the bot token in its **file** (referenced by `ERM_BOT_FILE`) and the LLM key in
  env — never in the committed config, and never paste the token into a chat message.
- OpenClaw strips secret-named env vars (`*TOKEN*`/`*KEY*`/`*SECRET*`) from skill
  processes; that is why the token is delivered by file path, not by `ERM_BOT_TOKEN`.
- Send the bot **one message at a time** — a new message that arrives while the previous
  one is still being answered fails with `reply session initialization conflicted`.
- The bot can only **read** (analyst role); it cannot approve, transfer, or modify anything.
