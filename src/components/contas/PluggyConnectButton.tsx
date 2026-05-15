'use client'

import { useEffect, useRef, useState } from 'react'
import { Link2, Loader2 } from 'lucide-react'

interface PluggyConnectOptions {
  connectToken: string
  includeSandbox?: boolean
  onSuccess?: (data: { item: { id: string } }) => void | Promise<void>
  onError?: (err: unknown) => void
}
interface PluggyConnectInstance {
  init: () => void
}
type PluggyConnectCtor = new (opts: PluggyConnectOptions) => PluggyConnectInstance

declare global {
  interface Window {
    PluggyConnect?: PluggyConnectCtor
  }
}

const PLUGGY_WIDGET_SRC = 'https://cdn.pluggy.ai/pluggy-connect/v2.9.0/pluggy-connect.js'

export default function PluggyConnectButton({
  onConnected,
}: {
  onConnected: () => void
}) {
  const [loading, setLoading] = useState(false)
  const scriptLoaded = useRef(false)

  useEffect(() => {
    if (scriptLoaded.current) return
    if (typeof window === 'undefined') return
    if (window.PluggyConnect) {
      scriptLoaded.current = true
      return
    }

    const s = document.createElement('script')
    s.src = PLUGGY_WIDGET_SRC
    s.async = true
    s.onload = () => {
      scriptLoaded.current = true
    }
    document.body.appendChild(s)
  }, [])

  async function handleClick() {
    setLoading(true)
    try {
      const resp = await fetch('/api/pluggy/connect-token', { method: 'POST' })
      if (!resp.ok) throw new Error('falha ao obter token')
      const { accessToken } = await resp.json()

      if (!window.PluggyConnect) {
        alert('Widget Pluggy ainda carregando, tente novamente em 2s')
        return
      }

      const connect = new window.PluggyConnect({
        connectToken: accessToken,
        includeSandbox: true,
        onSuccess: async (itemData: { item: { id: string } }) => {
          await fetch('/api/pluggy/connections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: itemData.item.id }),
          })
          onConnected()
        },
        onError: (err: unknown) => {
          console.error('Pluggy error', err)
        },
      })

      connect.init()
    } catch (err) {
      console.error(err)
      alert('Erro ao iniciar conexão Pluggy')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="btn-primary inline-flex items-center gap-2 focus:ring-2 focus:ring-emerald-500/20 focus:ring-offset-2 focus:ring-offset-surface-0"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
      Conectar banco
    </button>
  )
}
