# AGENTS.md — ASA Karang Taruna

Planning repo for a WA bot → server analytics → WA/dashboard product. **No app code yet.** Implement under `prototype/` per plans; do not invent a parallel layout.

## Source of truth (read in order)

1. `asa_karang_taruna_plan.md` — product scope, ACL, phases, env
2. `prototype_plan.md` — MVP bridge layout, phases, exit criteria
3. `whatsapp_wrapper_types_guide.md` — Pattern 1 vs 2 context only
4. `Brief ASA KARANG TARUNA.docx` — original stakeholder brief

If docs conflict, trust the two `*_plan.md` files over the guide.

## Locked decisions (do not re-litigate)

| Concern | Choice |
| :--- | :--- |
| WA client | **Pattern 2: `@whiskeysockets/baileys`** (Node 20+ / TS) |
| Fallback only if Baileys blocked | Pattern 1 `whatsapp-web.js` behind same `WaBridge` interface |
| App DB | **MongoDB Atlas** DB `asa_karang_taruna`, Mongoose optional |
| LLM | **DeepSeek** via `openai` SDK + `baseURL` (`LLM_BASE_URL`) |
| Auth session (WA) | Local multi-file `auth_session/` — **gitignored, never commit** |
| MVP event bus | In-process; Redis/BullMQ later |
| Dashboard | After bridge loop works (Phase C+) |

Keep WA swappable:

```ts
interface WaBridge {
  start(): Promise<void>
  stop(): Promise<void>
  sendText(toJid: string, text: string): Promise<{ id: string }>
  onMessage(handler: (msg: InboundMessage) => void): void
  isConnected(): boolean
}
```

Thin `LlmClient` wrapper — jobs must not hardcode provider details beyond env.

## Current build target

**Phase A + thin Phase B only** (full loop proof):

`group/DM text → Atlas → DeepSeek digest → REPORT_TO_JID`

Expected tree (from plan):

```
prototype/
  src/{index,session,db,handlers,sender,llm,digest,http}.ts
  src/models/
  auth_session/   # gitignored
  .env.example
```

Do not start Summary Organizer / full dashboard / multi-tenant until that loop is stable.

## Critical product constraints

- **ACL:** `groups.scope` = `pusat` | `dusun` | `anggota`. Pusat chats must **never** enter lower-scope queries or LLM context.
- **Curation:** external info (beasiswa/loker/inovasi) needs Pusat approve before fan-out.
- **Outbound:** jitter `SEND_MIN_DELAY_MS`–`SEND_MAX_DELAY_MS` (default 1–3s); no blast/cold spam.
- **Unofficial WA:** ToS risk — disposable **test number only**; pin Baileys version.
- **Secrets:** `.env` only — `MONGODB_URI`, `DEEPSEEK_API_KEY`, `auth_session/`. Never commit.

## Env (prototype)

```
PORT=3000
AUTH_DIR=./auth_session
MONGODB_URI=mongodb+srv://.../asa_karang_taruna?...
DEEPSEEK_API_KEY=...
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
REPORT_TO_JID=628...@s.whatsapp.net
TEST_GROUP_JID=120363...@g.us
SEND_MIN_DELAY_MS=1000
SEND_MAX_DELAY_MS=3000
DIGEST_CRON=0 7 * * *
```

## MVP HTTP surface

- `GET /health` — `{ connected }`
- `POST /send` — `{ to, text }` → WA
- `POST /digest/run` — yesterday’s `TEST_GROUP_JID` msgs → DeepSeek → `summaries` + push `REPORT_TO_JID`
- Admin: last N messages (Phase A)

## Data (minimum indexes)

- `messages`: `{ chatJid: 1, timestamp: -1 }`, unique `{ messageId: 1 }`
- `summaries`: `{ sourceGroupJid: 1, periodStart: -1 }`; store `sourceMessageIds[]`
- `participants`: unique `{ waJid: 1 }`

Inbound: text-only MVP; ignore own echoes and status broadcasts. Digest must not block WA ingest (retry LLM separately).

## Verify manually (no automated suite yet)

1. QR pair → restart → no new QR  
2. Group/DM text → doc in Atlas  
3. `curl /send` → phone  
4. `curl /digest/run` → summary in Atlas + WA to report JID  

Unit tests later: JID normalize + message mapper (vitest suggested).

## Commands (once `prototype/` exists)

```bash
cd prototype && npm i
cp .env.example .env   # fill secrets
npx tsx src/index.ts   # QR in terminal; keep process up
# curl examples belong in prototype/README.md when added
```
