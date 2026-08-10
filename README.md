# poc-asa — ASA Karang Taruna

WhatsApp bot bridge POC: group/DM text → MongoDB Atlas → DeepSeek daily digest → push to a report WA number.

## Docs (planning)

| File | Role |
| --- | --- |
| `AGENTS.md` | Agent/dev constraints |
| `asa_karang_taruna_plan.md` | Product scope & phases |
| `prototype_plan.md` | MVP bridge plan |
| `whatsapp_wrapper_types_guide.md` | Baileys vs web.js context |
| `Brief ASA KARANG TARUNA.docx` | Stakeholder brief |

## Run the POC

```bash
cd prototype
npm i && cp .env.example .env   # fill secrets
npm run dev
```

Details and curl examples: [`prototype/README.md`](prototype/README.md).

**Do not commit** `.env` or `prototype/auth_session/`.
