'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [linkInvalid, setLinkInvalid] = useState(false)
  const exchangedOnce = useRef(false)

  // Ao montar, se vier ?code=... na URL, troca por sessao de recovery.
  // Caso contrario, verifica se ja existe sessao ativa (acesso via refresh
  // depois da troca, ou acesso direto autenticado).
  useEffect(() => {
    if (exchangedOnce.current) return
    exchangedOnce.current = true

    const supabase = createClient()
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')

    async function init() {
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          setLinkInvalid(true)
        } else {
          // Limpa o code da URL para evitar re-uso ao recarregar
          window.history.replaceState({}, '', '/auth/reset-password')
          setReady(true)
        }
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setReady(true)
      } else {
        setLinkInvalid(true)
      }
    }

    init()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Ocorreu um erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Gradient mesh background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(20,184,166,0.08),transparent_50%)]" />

      <div className="w-full max-w-sm relative z-10 space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-white">My</span>
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Cash</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Defina sua nova senha
          </p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-white mb-6">Nova senha</h2>

          {!ready && !linkInvalid && (
            <div className="flex items-center justify-center py-6 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Validando link de recuperação...
            </div>
          )}

          {linkInvalid && (
            <div className="space-y-4">
              <div className="animate-fade-up rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                Link de recuperação inválido ou expirado. Solicite um novo.
              </div>
              <Link
                href="/recuperar-senha"
                className="block w-full py-3 px-4 text-center bg-surface-3 hover:bg-surface-4 border border-edge-2 text-white font-medium rounded-xl transition-colors"
              >
                Solicitar novo link
              </Link>
            </div>
          )}

          {ready && (
            <>
              {error && (
                <div className="mb-4 animate-fade-up rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                    Nova senha
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Mínimo 6 caracteres"
                    className="input-field py-3"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                    Confirmar nova senha
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repita a senha"
                    className="input-field py-3"
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    'Salvar nova senha'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
