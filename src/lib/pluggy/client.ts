import { PluggyClient } from 'pluggy-sdk'

let singleton: PluggyClient | null = null

export function getPluggyClient(): PluggyClient {
  if (singleton) return singleton

  const clientId = process.env.PLUGGY_CLIENT_ID
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET não configurados')
  }

  singleton = new PluggyClient({ clientId, clientSecret })
  return singleton
}

export type { Account, Transaction, Item } from 'pluggy-sdk'
