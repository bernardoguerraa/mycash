'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RegistroPage() {
  const router = useRouter()
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState<string | null>(null)

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

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome_completo: nomeCompleto,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      // Quando a confirmacao de email esta habilitada no Supabase, signUp
      // retorna `user` mas `session` nula. Nesse caso a insercao em `usuarios`
      // rodaria como anonima e violaria RLS — adiamos para o callback pos-confirmacao.
      if (!data.session) {
        setPendingConfirmEmail(email)
        return
      }

      // Sessao ativa (auto-confirm ligado): cria o perfil e segue para o dashboard
      if (data.user) {
        const { error: insertError } = await supabase
          .from('usuarios')
          .insert({
            nome_completo: nomeCompleto,
            email,
            senha_hash: 'managed_by_supabase_auth',
          })

        if (insertError) {
          console.error('Error inserting usuario:', insertError)
        }
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
    <div className="space-y-8">
      {/* Logo */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-white">My</span>
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Cash</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Crie sua conta gratuita
        </p>
      </div>

      {/* Card */}
      <div className="card p-8">
        <h2 className="text-lg font-semibold text-white mb-6">Criar conta</h2>

        {pendingConfirmEmail && (
          <div className="space-y-4">
            <div className="animate-fade-up rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-300">
              <p className="font-semibold mb-1">Conta criada!</p>
              <p>
                Enviamos um link de confirmação para{' '}
                <span className="font-medium text-emerald-200">{pendingConfirmEmail}</span>.
                Clique no link do e-mail para ativar a conta antes de fazer login.
              </p>
              <p className="mt-2 text-xs text-emerald-400/80">
                Não recebeu? Verifique a caixa de spam.
              </p>
            </div>
            <Link
              href="/login"
              className="block w-full py-3 px-4 text-center bg-surface-3 hover:bg-surface-4 border border-edge-2 text-white font-medium rounded-xl transition-colors"
            >
              Ir para o login
            </Link>
          </div>
        )}

        {error && !pendingConfirmEmail && (
          <div className="mb-4 animate-fade-up rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {!pendingConfirmEmail && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nome" className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
              Nome completo
            </label>
            <input
              id="nome"
              type="text"
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              required
              placeholder="Seu nome completo"
              className="input-field py-3"
            />
          </div>

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

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
              Senha
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
              Confirmar senha
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
                Criando conta...
              </span>
            ) : (
              'Criar conta'
            )}
          </button>
        </form>
        )}

        {!pendingConfirmEmail && (
          <p className="mt-6 text-center text-sm text-zinc-500">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
              Entrar
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
