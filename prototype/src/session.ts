import { useMultiFileAuthState, type AuthenticationState } from "@whiskeysockets/baileys"
import path from "node:path"

export type SessionState = {
  state: AuthenticationState
  saveCreds: () => Promise<void>
}

export async function loadAuthState(authDir: string): Promise<SessionState> {
  const dir = path.resolve(authDir)
  const { state, saveCreds } = await useMultiFileAuthState(dir)
  return { state, saveCreds }
}
