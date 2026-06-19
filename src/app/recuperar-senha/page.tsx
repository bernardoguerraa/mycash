'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      const supabase = createClient()
      // Manda direto pra /auth/reset-password (a propria pagina troca o
      // code por sessao). Evita ter que liberar URLs com query string no
      // allowlist do Supabase, que vinha falhando.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)
    } catch {
      setError('Ocorreu um erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Logo */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-white">My</span>
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Cash</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Recupere o acesso à sua conta
        </p>
      </div>

      {/* Card */}
      <div className="card p-8">
        <h2 className="text-lg font-semibold text-white mb-2">Recuperar senha</h2>
        <p className="text-zinc-500 text-sm mb-6">
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
        </p>

        {success && (
          <div className="mb-4 animate-fade-up rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400">
            E-mail enviado com sucesso! Verifique sua caixa de entrada e spam.
          </div>
        )}

        {error && (
          <div className="mb-4 animate-fade-up rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="input-field py-3"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </span>
              ) : (
                'Enviar link de recuperação'
              )}
            </button>
          </form>
        ) : (
          <button
            onClick={() => {
              setSuccess(false)
              setEmail('')
            }}
            className="w-full py-3 px-4 bg-surface-3 hover:bg-surface-4 border border-edge-2 text-white font-medium rounded-xl transition-colors"
          >
            Enviar novamente
          </button>
        )}

        <p className="mt-6 text-center text-sm text-zinc-500">
          Lembrou a senha?{' '}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  )
}
