# ASA KARANG TARUNA — Product & Prototype Plan

**Status:** Feasible. Your idea (bot as group member → server analytics → push result to a WA number/group) matches the brief’s core pipeline.

**Source brief:** `Brief ASA KARANG TARUNA.docx`  
**Wrapper context:** `whatsapp_wrapper_types_guide.md`, `prototype_plan.md`

---

## 1. What the brief asks for

**Users:** Pengurus Pusat, Pengurus Dusun, Anggota.

### Pain points (compressed)
| Role | Needs |
| :--- | :--- |
| Pengurus | Find buried info; strategic summary; prioritize by impact/feasibility/urgency; detect meeting bias; spam/fraud; sentiment; who is active vs contributive; member profiles/interests; content distribution; introvert voice channel; **data access control** (Pusat chats must not leak) |
| Anggota | Search old chats; spam filter; personalized useful content; private way to share ideas |

### Solution principles
1. All chats in bot-joined groups → recorded to server.
2. All DM (japri) bot ↔ person → recorded to server.
3. **Access control** by group/role (e.g. Pengurus Pusat data only for Pusat).

### AI / automation jobs
| Cadence | Target | Content |
| :--- | :--- | :--- |
| Daily morning | Each group (separate) | Prioritized summary of previous day (impact, feasibility, urgency, anti meeting-bias) |
| Daily morning | Pengurus Pusat only | Sentiment +/- of previous day |
| Weekly | Pengurus Pusat | Stats: active/contributive pengurus & anggota; member count by dusun; peak chat hours |
| Daily morning | Pengurus Pusat | Curated beasiswa, magang/loker, inovasi — **must be approved by Pusat before fan-out to other groups** |
| On schedule | Members | Agenda reminders (calendar-like) |
| Realtime | Groups | Spam/fraud/hoax detection |
| On demand | User (DM/group) | Q&A from internet + allowed chat history (respect ACL) |

### Products to build
1. **WA Bot** — member of groups + japri channel  
2. **Server** — ingest, store, ACL, analytics, AI jobs  
3. **Dashboard Pengurus Pusat**
   - Summary Organizer (Gmail-like: source group, time, read/important/trash 30d, export .docx, filters)
   - Login to Bot (QR)
   - Infografis (stats)
   - Pengingat Agenda
   - Informasi Baru (loker / beasiswa / inovasi) + curation workflow

---

## 2. Your idea ↔ brief mapping

```
[ WA Groups + Japri ]
        |  bot is a normal multi-device participant
        v
[ WA Bridge (Baileys) ]  ---- session / QR via Dashboard "Login to Bot"
        |
        |  normalized events (message, react, join, ...)
        v
[ Ingest API + Queue ]
        v
[ Store + ACL ]  ---- group_id → visibility scope (pusat | dusun | public-kt)
        |
        +---> Analytics / AI workers (daily & weekly jobs)
        |
        +---> Dashboard (Summary Organizer, Infografis, ...)
        |
        v
[ Outbound dispatcher ]
        |-- morning digest → each source group (or Pusat only)
        |-- curated info → after Pusat approve → target groups
        |-- alerts (spam) → Pusat number/group
        |-- Q&A / introvert ideas → japri
```

**Yes, possible:** bot sits in groups, mirrors chat to server, server runs analytics/AI, results go back to a **specific WA number** and/or **specific groups** (brief wants both).

---

## 3. Recommended stack (build order)

| Layer | Choice | Notes |
| :--- | :--- | :--- |
| WA client | Pattern 2: **Baileys** (Node/TS) | One bot identity; multi-group |
| Bridge API | Fastify/Express | Ingest internal + `/send` |
| Queue | Redis + BullMQ (or in-process for MVP) | Decouple WA events from AI |
| DB | **MongoDB Atlas** | Messages, users, ACL, summaries (collections) |
| ODM | **Mongoose** (or native driver) | Schema + indexes on Atlas |
| Object/files | Local/S3 / GridFS | Media, .docx exports |
| AI | **DeepSeek** via **OpenAI-compatible** API | `openai` SDK + custom `baseURL` |
| Dashboard | Next.js (or similar) | Pusat only first |
| Auth dashboard | Simple login + role `pengurus_pusat` | QR login is for **bot session**, not user SSO |

**Official Cloud API later** if compliance/scale demands it; same domain events interface.

### 3.1 LLM: DeepSeek (OpenAI-compatible)

Use the official `openai` Node SDK pointed at DeepSeek:

```ts
import OpenAI from "openai"

const llm = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.LLM_BASE_URL, // https://api.deepseek.com
})

const res = await llm.chat.completions.create({
  model: process.env.LLM_MODEL, // deepseek-chat | deepseek-reasoner
  messages: [{ role: "user", content: prompt }],
})
```

| Env | Example | Purpose |
| :--- | :--- | :--- |
| `DEEPSEEK_API_KEY` | `sk-...` | Auth |
| `LLM_BASE_URL` | `https://api.deepseek.com` | OpenAI-compatible endpoint |
| `LLM_MODEL` | `deepseek-chat` | Default; use `deepseek-reasoner` if needed for harder ranking |

Keep a thin `LlmClient` wrapper so model/provider can change without touching digest jobs.

### 3.2 DB: MongoDB Atlas

| Item | Choice |
| :--- | :--- |
| Hosting | MongoDB Atlas (M0 free for prototype) |
| Connection | `MONGODB_URI` SRV string (never commit) |
| DB name | `asa_karang_taruna` |
| Access | IP allowlist or Atlas Network Access + least-privilege DB user |

**Indexes (minimum):**
- `messages`: `{ chatJid: 1, timestamp: -1 }`, unique `{ messageId: 1 }`
- `summaries`: `{ sourceGroupJid: 1, periodStart: -1 }`, `{ trash: 1, trashedAt: 1 }`
- `participants`: `{ waJid: 1 }` unique

---

## 4. Data model (MongoDB collections)

- `groups` — waJid, name, scope (`pusat` | `dusun` | `anggota`), dusunId  
- `participants` — waJid, displayName, role, dusun  
- `messages` — messageId, chatJid, fromJid, isGroup, timestamp, type, text, mediaRef, raw, flags `{ spamScore, sentiment, isIdea }`  
- `summaries` — periodStart, periodEnd, sourceGroupJid, bodyMd, priorityScore, read, important, trash, trashedAt, sourceMessageIds[]  
- `curated_infos` — type (`beasiswa`|`loker`|`inovasi`), body, status (`draft`|`approved`|`sent`), targets[]  
- `agendas` — title, dueAt, remindAt[], audience  
- `outbound_logs` — toJid, kind, payload, sentAt, waMessageId  

**ACL rule:** queries and AI context filter by `scope` + requester role. Pusat group messages never enter dusun/anggota LLM context.

---

## 5. Phased delivery

### Phase A — WA bridge MVP (1–2 days) ← start here
Same as `prototype_plan.md`, plus:
- [ ] Join **one test group**
- [ ] Connect **MongoDB Atlas**; persist **all group + DM** text messages to `messages`
- [ ] HTTP admin: health, last N messages
- [ ] `POST /push-report` → send text to **one configured WA number** (your analytics sink)

**Exit:** chat in test group appears in Atlas; curl triggers report to your number.

### Phase B — Daily digest job (2–3 days)
- [ ] Nightly/morning cron: load previous-day messages per group from Atlas
- [ ] **DeepSeek** (OpenAI-compatible): summary + rank by impact/feasibility/urgency + meeting-bias hint
- [ ] Store row in `summaries`
- [ ] Send digest to: (1) configured Pusat number, and/or (2) source group
- [ ] Simple ACL: pusat-scoped groups only in pusat digests

**Exit:** one automated morning message with yesterday’s summary.

### Phase C — Dashboard Summary Organizer (3–5 days)
- [ ] List summaries (Gmail-like)
- [ ] Filters: group, date range, keyword
- [ ] read / important / trash (30-day purge job)
- [ ] Export .docx
- [ ] “Login to Bot” page: show Baileys QR, connection status

**Exit:** Pusat can review digests without opening WA.

### Phase D — Stats + sentiment (2–4 days)
- [ ] Active vs contributive heuristics (msg count vs impact-tagged ideas)
- [ ] Peak hours, members by dusun
- [ ] Daily sentiment for Pusat
- [ ] Infografis pages

### Phase E — Curation, reminders, spam, Q&A (ongoing)
- [ ] Informasi Baru draft → Pusat approve → fan-out to groups
- [ ] Agenda reminders
- [ ] Realtime spam heuristics + optional LLM
- [ ] DM Q&A with RAG over **allowed** messages only
- [ ] Introvert channel: DM bot idea → anonymized optional queue for Pusat

---

## 6. Prototype scope (this week)

Build **only Phase A + thin Phase B**:

1. Bot joins 1 group.  
2. Every message → server DB.  
3. Cron or manual button: “analyze yesterday” → short summary.  
4. Summary sent to **your WA number** (not full dashboard yet).

That proves the full loop the brief depends on:

`group chat → server → analytics/AI → specific WA destination`

---

## 7. Config (prototype)

```env
PORT=3000
AUTH_DIR=./auth_session

# MongoDB Atlas
MONGODB_URI=mongodb+srv://USER:PASS@CLUSTER.mongodb.net/asa_karang_taruna?retryWrites=true&w=majority

# DeepSeek (OpenAI-compatible)
DEEPSEEK_API_KEY=sk-...
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat

REPORT_TO_JID=628xxxxxxxxxx@s.whatsapp.net
TEST_GROUP_JID=120363...@g.us
SEND_MIN_DELAY_MS=1000
SEND_MAX_DELAY_MS=3000
DIGEST_CRON=0 7 * * *
```

---

## 8. Risks specific to this product

| Risk | Mitigation |
| :--- | :--- |
| WA ToS / ban | Test number; human-like delays; no spam blasts |
| Privacy leak (Pusat → others) | Hard ACL in DB queries + separate LLM context per scope |
| Multi-group scale on one bot | One Baileys session can join many groups; watch rate limits |
| LLM cost / hallucination | Store `sourceMessageIds` on every summary; human curation for external info |
| DeepSeek / API downtime | Retry + queue digest jobs; cache last good summary |
| Atlas IP / credential leak | Network Access lock; secrets only in env; rotate keys |
| Meeting bias false positives | Report participation share as **signal**, not verdict |
| Brief “cc” incomplete | Confirm missing dashboard items with stakeholder |

---

## 9. Success metrics (product)

- Pengurus finds yesterday’s decisions in < 2 minutes (digest or Summary Organizer).  
- Zero ACL incidents (Pusat content never in lower-scope outputs).  
- Weekly stats used in at least one Pusat meeting.  
- Spam flagged before wide forward (best-effort).  

---

## 10. Immediate next step

Implement **Phase A** under `prototype/` using **Baileys + MongoDB Atlas + `REPORT_TO_JID`**, then add one manual “run digest now” that calls **DeepSeek** (OpenAI-compatible) on yesterday’s group chat and sends the result to that number.

Dashboard and full AI cadences come after the loop is stable.
