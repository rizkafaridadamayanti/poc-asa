export type InboundMessage = {
  messageId: string
  fromJid: string
  chatJid: string
  timestamp: number
  type: "text"
  text: string
  isGroup: boolean
}

export type WaDevice = { id: string; name: string | null }

export type WaBridge = {
  start(): Promise<void>
  stop(): Promise<void>
  sendText(toJid: string, text: string): Promise<{ id: string }>
  onMessage(handler: (msg: InboundMessage) => void): void
  isConnected(): boolean
  getDeviceInfo(): WaDevice | null
  getGroupMetadata(jid: string): Promise<{ subject: string }>
  listParticipatingGroups(): Promise<Array<{ id: string; subject: string }>>
}

export type AppConfig = {
  port: number
  logLevel: string
  authDir: string
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
}
