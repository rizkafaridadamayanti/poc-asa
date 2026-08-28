export type InboundMessageType = "text" | "image" | "video" | "audio" | "document"

export type InboundMessage = {
  messageId: string
  fromJid: string
  chatJid: string
  timestamp: number
  type: InboundMessageType
  text: string
  isGroup: boolean
  mediaFilename?: string | null
  mediaMimetype?: string | null
}

export type WaDevice = { id: string; name: string | null; platform: string | null }

export type WaBridge = {
  start(): Promise<void>
  stop(): Promise<void>
  sendText(toJid: string, text: string): Promise<{ id: string }>
  onMessage(handler: (msg: InboundMessage) => void): void
  isConnected(): boolean
  getDeviceInfo(): WaDevice | null
  getGroupMetadata(jid: string): Promise<{
    subject: string
    participants: string[]
    ownerJid: string | null
    creation: number | null
    desc: string | null
  }>
  listParticipatingGroups(): Promise<
    Array<{
      id: string
      subject: string
      participants: string[]
      ownerJid: string | null
      creation: number | null
      desc: string | null
    }>
  >
}

export type AppConfig = {
  port: number
  logLevel: string
  authDir: string
  mediaDir: string
  mongodbUri: string
  dbName: string
  deepseekApiKey: string
  llmBaseUrl: string
  llmModel: string
  reportToJid: string
  testGroupJid: string
  jwtSecret: string
  sendMinDelayMs: number
  sendMaxDelayMs: number
  dashboardPassword: string
  digestCron: string
  weeklyStatsCron: string
}
