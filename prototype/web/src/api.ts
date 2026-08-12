const API_BASE = ""
const TOKEN_KEY = "asa_token"
const USER_KEY = "asa_username"

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getStoredUsername(): string | null {
  return localStorage.getItem(USER_KEY)
}

function setStoredUsername(username: string) {
  localStorage.setItem(USER_KEY, username)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isLoggedIn(): boolean {
  return getToken() !== null
}

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (init?.body !== undefined) {
    headers["content-type"] = "application/json"
  }
  if (token) {
    headers["authorization"] = `Bearer ${token}`
  }
  const res = await fetch(`${API_BASE}${input}`, {
    headers,
    ...init,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401) {
      clearToken()
      window.location.href = "/login"
    }
    throw new Error(data.error || `${res.status} ${res.statusText}`)
  }
  return data as T
}

export async function login(username: string, password: string) {
  const data = await fetchJson<{ token: string; user: { id: string; username: string } }>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ username, password }) },
  )
  setToken(data.token)
  setStoredUsername(data.user.username)
  return data
}

export async function register(username: string, password: string) {
  const data = await fetchJson<{ token: string; user: { id: string; username: string } }>(
    "/api/auth/register",
    { method: "POST", body: JSON.stringify({ username, password }) },
  )
  setToken(data.token)
  setStoredUsername(data.user.username)
  return data
}

export type WaDevice = { id: string; name: string | null; platform: string | null }

export type Status = {
  connected: boolean
  device: WaDevice | null
  messageCount: number
  summaryCount: number
  participantCount: number
}

export type MessageType = "text" | "image" | "video" | "audio" | "document"

export type Message = {
  _id: string
  messageId: string
  fromJid: string
  chatJid: string
  chatName?: string | null
  timestamp: number
  type: MessageType
  text: string
  isGroup: boolean
  mediaFilename: string | null
  mediaMimetype: string | null
  trash: boolean
  trashedAt: string | null
  createdAt: string
  updatedAt: string
}

export type Summary = {
  _id: string
  periodStart: string
  periodEnd: string
  sourceGroupJid: string
  bodyMd: string
  priorityScore: number
  sourceMessageIds: string[]
  read: boolean
  important: boolean
  trash: boolean
  createdAt: string
  updatedAt: string
}

export type CuratedInfoType = "beasiswa" | "loker" | "inovasi"
export type CuratedInfoStatus = "draft" | "scheduled" | "sent"

export type CuratedInfo = {
  _id: string
  type: CuratedInfoType
  title: string
  body: string
  status: CuratedInfoStatus
  targets: string[]
  scheduledAt: string | null
  sentAt: string | null
  createdAt: string
  updatedAt: string
}

export type CuratedInfoInput = {
  type: CuratedInfoType
  title: string
  body: string
  targets: string[]
}

export type FanOutResult = {
  ok: boolean
  targets: number
  sent: number
  failed: Array<{ jid: string; error: string }>
}

export type GroupScope = "pusat" | "dusun" | "anggota"
export type GroupSource = "manual" | "auto"

export type Group = {
  _id: string
  waJid: string
  name: string
  scope: GroupScope | null
  dusunId: string | null
  source: GroupSource
  createdAt: string
  updatedAt: string
}

export type Participant = {
  _id: string
  waJid: string
  displayName: string
  role: string
  dusun: string
  createdAt: string
  updatedAt: string
}

export type ContributiveRow = { waJid: string; messageCount: number; ideaCount: number }
export type PeakHourRow = { hour: number; count: number }
export type DusunRow = { dusunId: string; groupCount: number }

export type Sentiment = {
  _id: string
  periodStart: string
  periodEnd: string
  bodyMd: string
  messageCount: number
  createdAt: string
}

export type Reminder = { at: string; sent: boolean; sentAt: string | null }

export type Agenda = {
  _id: string
  title: string
  description: string
  dueAt: string
  remindAt: Reminder[]
  audience: string[]
  createdAt: string
  updatedAt: string
}

export type AgendaInput = {
  title: string
  description?: string
  dueAt: string
  remindAt: string[]
  audience: string[]
}

export type SpamAlert = {
  _id: string
  messageId: string
  chatJid: string
  fromJid: string
  text: string
  spamScore: number
  reasons: string[]
  notified: boolean
  createdAt: string
}

export type OutboundLog = {
  _id: string
  toJid: string
  kind: string
  text: string
  ok: boolean
  waMessageId: string | null
  error: string | null
  createdAt: string
}

export type AnonymousIdea = {
  _id: string
  text: string
  status: "new" | "reviewed"
  createdAt: string
}

export const api = {
  status: () => fetchJson<Status>("/api/dashboard/status"),

  qr: () => fetchJson<{ connected: boolean; qr: string | null }>("/api/qr"),

  messages: (limit = 20, offset = 0, chatJid?: string, q?: string, trash = false) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (chatJid) params.set("chatJid", chatJid)
    if (q) params.set("q", q)
    if (trash) params.set("trash", "true")
    return fetchJson<{ total: number; offset: number; limit: number; count: number; messages: Message[] }>(
      `/api/messages?${params.toString()}`,
    )
  },

  trashMessage: (id: string) => fetchJson<{ ok: boolean }>(`/api/messages/${id}`, { method: "DELETE" }),

  trashAllMessages: () =>
    fetchJson<{ ok: boolean; trashedCount: number }>("/api/messages/trash-all", { method: "POST" }),

  restoreMessage: (id: string) =>
    fetchJson<{ ok: boolean }>(`/api/messages/${id}/restore`, { method: "POST" }),

  deleteMessagePermanent: (id: string) =>
    fetchJson<{ ok: boolean }>(`/api/messages/${id}/permanent`, { method: "DELETE" }),

  resetMessages: () =>
    fetchJson<{ ok: boolean; deletedCount: number }>("/api/messages/reset", { method: "POST" }),

  messageMediaBlob: async (id: string): Promise<Blob> => {
    const token = getToken()
    const res = await fetch(`${API_BASE}/api/messages/${id}/media`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error(`Failed to load media: ${res.status} ${res.statusText}`)
    return res.blob()
  },

  summaries: (
    limit = 20,
    offset = 0,
    filters: { groupJid?: string; from?: string; to?: string; keyword?: string } = {},
    trash = false,
  ) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (filters.groupJid) params.set("groupJid", filters.groupJid)
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)
    if (filters.keyword) params.set("keyword", filters.keyword)
    if (trash) params.set("trash", "true")
    return fetchJson<{ total: number; offset: number; limit: number; count: number; summaries: Summary[] }>(
      `/api/summaries?${params.toString()}`,
    )
  },

  deleteSummaryPermanent: (id: string) =>
    fetchJson<{ ok: boolean }>(`/api/summaries/${id}/permanent`, { method: "DELETE" }),

  exportSummary: async (id: string): Promise<Blob> => {
    const token = getToken()
    const res = await fetch(`${API_BASE}/api/summaries/${id}/export`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error(`Export failed: ${res.status} ${res.statusText}`)
    return res.blob()
  },

  participants: () =>
    fetchJson<{ count: number; participants: Participant[] }>("/api/participants"),

  digest: (last24h = false) =>
    fetchJson<{ ok: boolean; summaryId: string; bodyMd: string; messageCount: number; waMessageId?: string }>(
      "/api/digest/run",
      {
        method: "POST",
        body: JSON.stringify({ last24h }),
      },
    ),

  curatedInfos: (status?: CuratedInfoStatus) =>
    fetchJson<{ count: number; curatedInfos: CuratedInfo[] }>(
      `/api/curated-infos${status ? `?status=${status}` : ""}`,
    ),

  createCuratedInfo: (data: CuratedInfoInput) =>
    fetchJson<CuratedInfo>("/api/curated-infos", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCuratedInfo: (id: string, data: Partial<CuratedInfoInput>) =>
    fetchJson<CuratedInfo>(`/api/curated-infos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteCuratedInfo: (id: string) =>
    fetchJson<{ ok: boolean }>(`/api/curated-infos/${id}`, { method: "DELETE" }),

  scheduleCuratedInfo: (id: string, scheduledAt: string) =>
    fetchJson<CuratedInfo>(`/api/curated-infos/${id}/schedule`, {
      method: "POST",
      body: JSON.stringify({ scheduledAt }),
    }),

  unscheduleCuratedInfo: (id: string) =>
    fetchJson<CuratedInfo>(`/api/curated-infos/${id}/unschedule`, { method: "POST" }),

  sendCuratedInfo: (id: string) =>
    fetchJson<FanOutResult>(`/api/curated-infos/${id}/send`, { method: "POST" }),

  groups: () => fetchJson<{ count: number; groups: Group[] }>("/api/groups"),

  createGroup: (input: { waJid: string; name: string; scope: GroupScope; dusunId: string }) =>
    fetchJson<{ ok: boolean; group: Group }>("/api/groups", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateGroup: (id: string, patch: Partial<{ name: string; scope: GroupScope; dusunId: string }>) =>
    fetchJson<{ ok: boolean; group: Group }>(`/api/groups/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteGroup: (id: string) =>
    fetchJson<{ ok: boolean }>(`/api/groups/${id}`, { method: "DELETE" }),

  syncGroups: () =>
    fetchJson<{ ok: boolean; scanned: number; created: number }>("/api/groups/sync", {
      method: "POST",
    }),

  updateSummary: (id: string, patch: Partial<{ read: boolean; important: boolean; trash: boolean }>) =>
    fetchJson<{ ok: boolean; summary: Summary }>(`/api/summaries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  contributiveStats: () => fetchJson<{ rows: ContributiveRow[] }>("/api/stats/contributive"),

  peakHours: () => fetchJson<{ rows: PeakHourRow[] }>("/api/stats/peak-hours"),

  dusunStats: () => fetchJson<{ rows: DusunRow[] }>("/api/stats/dusun"),

  sentiments: () => fetchJson<{ count: number; sentiments: Sentiment[] }>("/api/sentiments"),

  agendas: (upcoming = false) =>
    fetchJson<{ count: number; agendas: Agenda[] }>(
      `/api/agendas${upcoming ? "?upcoming=true" : ""}`,
    ),

  createAgenda: (data: AgendaInput) =>
    fetchJson<Agenda>("/api/agendas", { method: "POST", body: JSON.stringify(data) }),

  updateAgenda: (id: string, data: Partial<AgendaInput>) =>
    fetchJson<Agenda>(`/api/agendas/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteAgenda: (id: string) =>
    fetchJson<{ ok: boolean }>(`/api/agendas/${id}`, { method: "DELETE" }),

  spamAlerts: () => fetchJson<{ count: number; alerts: SpamAlert[] }>("/api/spam-alerts"),

  outboundLogs: (limit = 50) =>
    fetchJson<{ count: number; logs: OutboundLog[] }>(`/api/outbound-logs?limit=${limit}`),

  askQuestion: (question: string, scopeGroupJid?: string) =>
    fetchJson<{ answer: string; sourceMessageIds: string[] }>("/api/qa/ask", {
      method: "POST",
      body: JSON.stringify({ question, scopeGroupJid }),
    }),

  anonymousIdeas: (status?: "new" | "reviewed") =>
    fetchJson<{ count: number; ideas: AnonymousIdea[] }>(
      `/api/anonymous-ideas${status ? `?status=${status}` : ""}`,
    ),

  markIdeaReviewed: (id: string) =>
    fetchJson<AnonymousIdea>(`/api/anonymous-ideas/${id}/review`, { method: "POST" }),
}
