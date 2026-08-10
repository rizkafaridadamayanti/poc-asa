# POC ASA — WhatsApp Bridge + Digest + Web Dashboard

Phase A + thin Phase B: Baileys → MongoDB Atlas → DeepSeek → report WA number, now with a web admin dashboard.

> Unofficial WA client (ToS risk). Use a **disposable test number** only.

## Setup

```bash
cd prototype
npm i                    # backend deps
cd web && npm i && cd .. # frontend deps
cp .env.example .env
# fill MONGODB_URI, DB_NAME, DEEPSEEK_API_KEY, REPORT_TO_JID, TEST_GROUP_JID
npm run build:web        # build dashboard into web/dist/
npm run dev              # start bridge + serve dashboard on localhost:3000
```

Open `http://localhost:3000` to see the dashboard. Scan QR in the terminal (Linked Devices) to pair. Restart should reconnect without a new QR (`auth_session/` is local + gitignored).

During frontend-only iteration, run `npm run dev:web` to use Vite's dev server (port 5173).

## HTTP

```bash
# health
curl -s localhost:3000/health

# last N messages in Atlas
curl -s 'localhost:3000/messages?limit=10'

# send text (to = phone or full JID)
curl -s -X POST localhost:3000/send \
  -H 'content-type: application/json' \
  -d '{"to":"628xxxxxxxxxx","text":"hello from poc-asa"}'

# digest yesterday's TEST_GROUP_JID → summaries + REPORT_TO_JID
curl -s -X POST localhost:3000/digest/run \
  -H 'content-type: application/json' \
  -d '{}'

# POC demo: last 24h instead of calendar yesterday
curl -s -X POST localhost:3000/digest/run \
  -H 'content-type: application/json' \
  -d '{"last24h":true}'
```

## Manual verify

1. QR pair → restart → no new QR  
2. Group/DM text → doc in Atlas (`messages`)  
3. `curl /send` → phone  
4. `curl /digest/run` → `summaries` + WA to `REPORT_TO_JID`

## Stack

| Piece | Choice |
| --- | --- |
| WA | `@whiskeysockets/baileys@6.7.23` (pinned) |
| HTTP | Fastify |
| DB | MongoDB Atlas + Mongoose |
| LLM | DeepSeek via `openai` SDK (`LLM_BASE_URL`) |

See repo root `AGENTS.md` and `*_plan.md` for product constraints (ACL, no blast, secrets).
