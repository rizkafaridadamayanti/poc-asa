# Prototype Plan: WhatsApp Wrapper Bridge

**Feasibility:** Yes — a working prototype is realistic in days, not weeks, if we use an existing library (not a from-scratch protocol stack).

**Recommended path:** **Pattern 2 (Baileys)** for a lean multi-device bridge. Use Pattern 1 only if you need maximum protocol resilience and can afford ~500MB+ RAM per session.

> Unofficial. Violates WhatsApp ToS. Use a disposable test number only.

---

## 1. Goal (MVP)

Build a minimal **send/receive bridge**:

1. Pair one WhatsApp account via QR (or pairing code).
2. Persist session so restart does not require re-scan.
3. Receive inbound text messages and log/emit them as structured JSON.
4. Send outbound text to a given JID (`628xxx@s.whatsapp.net`).
5. Optional: push events to a local queue or HTTP webhook.

Out of scope for MVP: groups admin, payments, multi-tenant UI, media upload pipeline, broadcast blasts.

---

## 2. Stack Decision

| Choice | Pick | Why |
| :--- | :--- | :--- |
| Pattern | **2 — Protocol** | Low RAM, fast iterate, fits bridge design |
| Runtime | **Node.js 20+ / TypeScript** | Best Baileys ecosystem |
| Library | `@whiskeysockets/baileys` | Actively maintained multi-device client |
| Auth store (WA session) | **Local multi-file** (`auth_session/`) | Baileys creds; not chat data |
| Chat / app data | **MongoDB Atlas** + Mongoose | Messages, summaries, ACL |
| LLM | **DeepSeek** via OpenAI-compatible API | `openai` SDK + `baseURL` |
| Event bus (MVP) | **In-process EventEmitter** → optional Redis later | Keep first cut simple |
| Process manager | `tsx` dev / `node` prod | Minimal tooling |

**Fallback:** If Baileys breaks on a protocol update mid-build, pivot MVP to Pattern 1 (`whatsapp-web.js` + Puppeteer) with the same app interface (`onMessage` / `sendText`).

---

## 3. Target Architecture (MVP)

```
[ Phone WhatsApp ]
        |
   (multi-device pair)
        |
[ Baileys socket ] --persist--> [ ./auth_session/ ]
        |
   events: messages.upsert
        v
[ Bridge App ]
   |-- logger (JSON lines)
   |-- outbound API: POST /send { to, text }
   |-- webhook (optional): POST inbound payload to localhost
```

---

## 4. Project Layout

```
prototype/
  package.json
  tsconfig.json
  src/
    index.ts          # boot, QR, reconnect
    session.ts        # WA auth state load/save
    db.ts             # MongoDB Atlas connect
    models/           # messages, summaries, ...
    handlers.ts       # inbound normalize → Atlas insert
    sender.ts         # outbound send + jitter delay
    llm.ts            # DeepSeek OpenAI-compatible client
    digest.ts         # load msgs → LLM → save summary → push WA
    http.ts           # /send, /health, /digest/run
  auth_session/       # gitignored WA credentials
  .env.example
  README.md
```

---

## 5. Phased Delivery

### Phase 0 — Prep (0.5 day)
- [ ] Node 20+, gitignore `auth_session/`, `.env`
- [ ] Disposable WhatsApp test number
- [ ] Confirm legal/ToS acceptance for internal experiment only

### Phase 1 — Connect & Persist (0.5–1 day)
- [ ] Init Baileys socket with multi-file auth state
- [ ] Print QR to terminal (`qrcode-terminal`)
- [ ] Handle `connection.update` (open / close / reconnect)
- [ ] Verify restart restores session without new QR

**Exit criteria:** process restarts → still connected.

### Phase 2 — Inbound Path + Atlas (0.5–1 day)
- [ ] Connect MongoDB Atlas on boot (`MONGODB_URI`)
- [ ] Listen `messages.upsert` (notify type)
- [ ] Normalize + upsert into `messages` collection:

```json
{
  "messageId": "...",
  "fromJid": "628xxx@s.whatsapp.net",
  "chatJid": "120363...@g.us",
  "timestamp": 0,
  "type": "text",
  "text": "hello",
  "isGroup": true
}
```

- [ ] Ignore own echoes / status broadcasts
- [ ] Log JSON lines to stdout

**Exit criteria:** phone/group message → document visible in Atlas.

### Phase 3 — Outbound Path (0.5 day)
- [ ] `sendText(jid, text)` wrapper
- [ ] Jitter delay 1–3s before send
- [ ] HTTP `POST /send` `{ "to": "628xxx", "text": "hi" }`
- [ ] Basic validation (E.164-ish number → JID)

**Exit criteria:** curl `/send` → message arrives on phone.

### Phase 4 — Hardening Lite (0.5–1 day)
- [ ] Exponential backoff reconnect
- [ ] Graceful shutdown (close socket, flush)
- [ ] Health endpoint `GET /health` (`{ connected: true }`)
- [ ] Optional webhook POST on inbound
- [ ] Rate-limit outbound (token bucket, e.g. 1 msg / 2s)

**Exit criteria:** kill -TERM clean; flaky network reconnects; no burst sends.

### Phase 5 — Digest via DeepSeek (0.5–1 day)
- [ ] `LlmClient` with `baseURL=https://api.deepseek.com`, model `deepseek-chat`
- [ ] `POST /digest/run` — load yesterday’s messages for `TEST_GROUP_JID` from Atlas
- [ ] Prompt: summary + impact/feasibility/urgency + speaker dominance hint
- [ ] Save to `summaries`; send text to `REPORT_TO_JID`

**Exit criteria:** curl `/digest/run` → summary in Atlas + WA to report number.

### Phase 6 — (Optional) Pattern 1 Spike
- [ ] Same HTTP interface on `whatsapp-web.js`
- [ ] Compare RAM, connect time, failure modes
- [ ] Document pick for next milestone

---

## 6. Core Interfaces (keep pattern-swappable)

```ts
interface WaBridge {
  start(): Promise<void>
  stop(): Promise<void>
  sendText(toJid: string, text: string): Promise<{ id: string }>
  onMessage(handler: (msg: InboundMessage) => void): void
  isConnected(): boolean
}
```

Implement `BaileysBridge` first; later `WebJsBridge` behind the same interface.

---

## 7. Env & Config

```env
PORT=3000
LOG_LEVEL=info
AUTH_DIR=./auth_session
WEBHOOK_URL=

MONGODB_URI=mongodb+srv://USER:PASS@CLUSTER.mongodb.net/asa_karang_taruna?retryWrites=true&w=majority

DEEPSEEK_API_KEY=sk-...
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat

REPORT_TO_JID=628xxxxxxxxxx@s.whatsapp.net
TEST_GROUP_JID=120363...@g.us
SEND_MIN_DELAY_MS=1000
SEND_MAX_DELAY_MS=3000
```

---

## 8. Test Plan

| Test | Method | Pass |
| :--- | :--- | :--- |
| Pairing | Scan QR once | `connection === open` |
| Session restore | Restart process | No new QR |
| Inbound text | Phone/group → bridge | Doc in Atlas + log |
| Outbound text | `curl /send` | Phone receives |
| Digest | `curl /digest/run` | Summary in Atlas + WA to `REPORT_TO_JID` |
| Reconnect | Toggle laptop network | Auto-recover |
| Rate limit | Burst 10 sends | Spaced ≥ min delay |

Manual only for MVP; add vitest unit tests for JID normalize + message mapper later.

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| Baileys breaks on WA update | High | Pin version; watch releases; fallback P1 |
| Account ban | High | Test number only; no cold blasts; jitter |
| Auth dir loss | High | Backup `auth_session/`; never commit it |
| Atlas URI leak | High | `.env` only; Atlas user least privilege |
| DeepSeek downtime | Med | Retry digest; do not block WA ingest |
| Media/groups complexity | Med | Defer; text-only MVP |
| Missing app-state sync | Low–Med | Accept partial history on first pair |

---

## 10. Success Definition

Prototype is done when:

1. One test account pairs and survives restart.
2. Bidirectional **text** works via logs + `POST /send`.
3. Group/DM text lands in **MongoDB Atlas**.
4. `POST /digest/run` uses **DeepSeek** and pushes summary to `REPORT_TO_JID`.
5. README documents run steps (install → QR → curl examples).

---

## 11. Suggested Timeline

| Day | Work |
| :--- | :--- |
| D1 | Phase 0–2 (connect, Atlas inbound) |
| D2 | Phase 3–4 (outbound HTTP, hardening) |
| D3 | Phase 5 (DeepSeek digest → report JID) + docs |

**Total:** ~2–3 focused days for bridge + Atlas + digest loop.

---

## 12. Next After Prototype

- Redis/NATS ingestion for LLM agents (per guide §5B)
- Dashboard Summary Organizer on Atlas `summaries`
- Media download/decrypt
- Official Cloud API adapter behind the same `WaBridge` interface for production path
