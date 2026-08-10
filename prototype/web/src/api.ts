const API_BASE = ""
const TOKEN_KEY = "asa_token"

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function isLoggedIn(): boolean {
  return getToken() !== null
}

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { "content-type": "application/json" }
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
  return data
}

export async function register(username: string, password: string) {
  const data = await fetchJson<{ token: string; user: { id: string; username: string } }>(
    "/api/auth/register",
    { method: "POST", body: JSON.stringify({ username, password }) },
  )
  setToken(data.token)
  return data
}

export type Status = {
  connected: boolean
  messageCount: number
  summaryCount: number
  participantCount: number
}

export type Message = {
  _id: string
  messageId: string
  fromJid: string
  chatJid: string
  timestamp: number
  type: string
  text: string
  isGroup: boolean
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
export type CuratedInfoStatus = "draft" | "approved" | "sent"

export type CuratedInfo = {
  _id: string
  type: CuratedInfoType
  title: string
  body: string
  status: CuratedInfoStatus
  targets: string[]
  approvedAt: string | null
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

export type Group = {
  _id: string
  waJid: string
  name: string
  scope: GroupScope
  dusunId: string
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

export const api = {
  status: () => fetchJson<Status>("/api/dashboard/status"),

  qr: () => fetchJson<{ connected: boolean; qr: string | null }>("/api/qr"),

  messages: (limit = 20, offset = 0) =>
    fetchJson<{ total: number; offset: number; limit: number; count: number; messages: Message[] }>(
      `/api/messages?limit=${limit}&offset=${offset}`,
    ),

  summaries: (
    limit = 20,
    offset = 0,
    filters: { groupJid?: string; from?: string; to?: string; keyword?: string } = {},
  ) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (filters.groupJid) params.set("groupJid", filters.groupJid)
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)
    if (filters.keyword) params.set("keyword", filters.keyword)
    return fetchJson<{ total: number; offset: number; limit: number; count: number; summaries: Summary[] }>(
      `/api/summaries?${params.toString()}`,
    )
  },

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

  send: (to: string, text: string) =>
    fetchJson<{ ok: boolean; id: string }>("/api/send", {
      method: "POST",
      body: JSON.stringify({ to, text }),
    }),

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

  approveCuratedInfo: (id: string) =>
    fetchJson<CuratedInfo>(`/api/curated-infos/${id}/approve`, { method: "POST" }),

  fanOutCuratedInfo: (id: string) =>
    fetchJson<FanOutResult>(`/api/curated-infos/${id}/fan-out`, { method: "POST" }),

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

  updateSummary: (id: string, patch: Partial<{ read: boolean; important: boolean; trash: boolean }>) =>
    fetchJson<{ ok: boolean; summary: Summary }>(`/api/summaries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  contributiveStats: () => fetchJson<{ rows: ContributiveRow[] }>("/api/stats/contributive"),

  peakHours: () => fetchJson<{ rows: PeakHourRow[] }>("/api/stats/peak-hours"),

  dusunStats: () => fetchJson<{ rows: DusunRow[] }>("/api/stats/dusun"),

  sentiments: () => fetchJson<{ count: number; sentiments: Sentiment[] }>("/api/sentiments"),
}
