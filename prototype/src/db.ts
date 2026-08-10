import dns from "node:dns"
import mongoose from "mongoose"
import type { Logger } from "./logger.js"

// Windows sometimes hands Node a broken link-local/site-local DNS resolver,
// which fails SRV lookups for mongodb+srv:// with ECONNREFUSED. Force a
// known-good public resolver before connecting.
dns.setServers(["8.8.8.8", "1.1.1.1"])

export async function connectDb(uri: string, dbName: string, log: Logger): Promise<void> {
  mongoose.set("strictQuery", true)
  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 30000,
  })
  log.info({ dbName }, "mongodb connected")
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect()
}
