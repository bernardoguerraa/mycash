'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function ConfirmeSeuEmailInner() {
  const params = useSearchParams()
  const email = params.get('email') ?? ''
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  async function handleResend() {
    if (!email) {
      setResendError('Não temos o e-mail desta sessão. Volte à tela de cadastro.')
      return
    }
    setResending(true)
    setResendError(null)
    setResendSuccess(false)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setResendError(error.message)
      } else {
        setResendSuccess(true)
      }
    } catch {
      setResendError('Erro inesperado ao reenviar. Tente novamente em alguns minutos.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-white">My</span>
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Cash</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-500">Confirme seu e-mail</p>
      </div>

      <div className="card p-8 space-y-5">
        <div className="flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
            <MailCheck className="h-7 w-7 text-emerald-400" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-white">Conta criada com sucesso</h2>
          <p className="text-sm text-zinc-400">
            Enviamos um link de confirmação para
            {email ? (
              <>
                {' '}
                <span className="font-medium text-emerald-300">{email}</span>.
              </>
            ) : (
              ' o e-mail informado.'
            )}
          </p>
          <p className="text-xs text-zinc-500">
            Clique no link para ativar a conta antes de fazer login. Verifique também a caixa de spam.
          </p>
        </div>

        {resendSuccess && (
          <div className="animate-fade-up rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-300">
            E-mail reenviado. Verifique sua caixa de entrada.
          </div>
        )}

        {resendError && (
          <div className="animate-fade-up rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {resendError}
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handleResend}
            disabled={resending || !email}
            className="btn-primary w-full py-3"
          >
            {resending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Reenviando...
              </span>
            ) : (
              'Reenviar e-mail de confirmação'
            )}
          </button>

          <Link
            href="/login"
            className="block w-full py-3 px-4 text-center bg-surface-3 hover:bg-surface-4 border border-edge-2 text-white font-medium rounded-xl transition-colors"
          >
            Ir para o login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmeSeuEmailPage() {
  return (
    <Suspense fallback={<div className="text-center text-zinc-500">Carregando...</div>}>
      <ConfirmeSeuEmailInner />
    </Suspense>
  )
}
