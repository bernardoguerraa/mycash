'use client'

import { useState } from 'react'
import {
  User,
  Mail,
  Shield,
  Calendar,
  Crown,
  CreditCard,
  ArrowRightLeft,
  Target,
  Pencil,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'

type Usuario = Database['public']['Tables']['usuarios']['Row']

interface PerfilClientProps {
  usuario: Usuario | null
  userEmail: string
  stats: {
    totalContas: number
    totalTransacoes: number
    totalMetas: number
  }
}

export default function PerfilClient({
  usuario,
  userEmail,
  stats,
}: PerfilClientProps) {
  const [nome, setNome] = useState(usuario?.nome_completo ?? '')
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const supabase = createClient()

  const plano = usuario?.plano ?? 'Free'
  const statusConta = usuario?.status_conta ?? 'Ativo'
  const dataCadastro = usuario?.data_cadastro
    ? new Date(usuario.data_cadastro).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '--'

  async function handleSaveName() {
    if (!nome.trim()) {
      setNameMsg({ type: 'error', text: 'O nome não pode estar vazio.' })
      return
    }
    if (!usuario) return

    setSavingName(true)
    setNameMsg(null)

    const { error } = await supabase
      .from('usuarios')
      .update({ nome_completo: nome.trim() })
      .eq('id_usuario', usuario.id_usuario)

    if (error) {
      setNameMsg({ type: 'error', text: error.message })
    } else {
      setNameMsg({ type: 'success', text: 'Nome atualizado com sucesso!' })
      setEditingName(false)
    }
    setSavingName(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMsg(null)

    if (!newPassword || !confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Preencha todos os campos.' })
      return
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'As senhas não coincidem.' })
      return
    }

    setSavingPassword(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setPasswordMsg({ type: 'error', text: error.message })
    } else {
      setPasswordMsg({ type: 'success', text: 'Senha alterada com sucesso!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    setSavingPassword(false)
  }

  const statusColors: Record<string, string> = {
    Ativo: 'bg-emerald-500/[0.08] text-emerald-400 border-emerald-500/30',
    Inativo: 'bg-surface-3 text-zinc-400 border-edge-2',
    Bloqueado: 'bg-rose-500/[0.08] text-rose-400 border-rose-500/30',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white sm:text-3xl">Meu Perfil</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Gerencie suas informações pessoais e configurações.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: User info + Stats */}
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="card relative overflow-hidden rounded-2xl p-6">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500 opacity-10 blur-3xl" />
            <div className="relative">
              {/* Avatar */}
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-3xl font-bold text-white ring-2 ring-edge-2">
                {(usuario?.nome_completo ?? 'U').charAt(0).toUpperCase()}
              </div>

              <h3 className="mt-4 text-xl font-bold text-white">
                {usuario?.nome_completo ?? 'Usuário'}
              </h3>

              <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                <Mail className="h-4 w-4" />
                {userEmail}
              </div>

              {/* Plan Badge */}
              <div className="mt-4 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    plano === 'Premium'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'bg-surface-3 text-zinc-300 border border-edge-2'
                  }`}
                >
                  {plano === 'Premium' ? (
                    <Crown className="h-3.5 w-3.5" />
                  ) : (
                    <User className="h-3.5 w-3.5" />
                  )}
                  {plano}
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                    statusColors[statusConta] ?? statusColors.Ativo
                  }`}
                >
                  {statusConta}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                <Calendar className="h-3.5 w-3.5" />
                Membro desde {dataCadastro}
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="card rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Estatísticas
            </h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-zinc-300">Contas</span>
                </div>
                <span className="text-lg font-bold text-white">{stats.totalContas}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                    <ArrowRightLeft className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-zinc-300">Transações</span>
                </div>
                <span className="text-lg font-bold text-white">{stats.totalTransacoes}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/[0.08] text-emerald-400">
                    <Target className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-zinc-300">Metas</span>
                </div>
                <span className="text-lg font-bold text-white">{stats.totalMetas}</span>
              </div>
            </div>
          </div>

          {/* Upgrade CTA (only for Free users) */}
          {plano === 'Free' && (
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-600/10 p-6">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-500 opacity-10 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Upgrade para Premium</h3>
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  Desbloqueie relatórios avançados, metas ilimitadas e suporte prioritário.
                </p>
                <button className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-lg hover:shadow-amber-500/20">
                  Conhecer Plano Premium
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Edit forms */}
        <div className="space-y-6 lg:col-span-2">
          {/* Edit Name */}
          <div className="card rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold text-white">
                <User className="h-4 w-4 text-zinc-500" />
                Informações Pessoais
              </h3>
              {!editingName && (
                <button
                  onClick={() => setEditingName(true)}
                  className="btn-ghost inline-flex items-center gap-1.5 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
              )}
            </div>

            {nameMsg && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  nameMsg.type === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400'
                    : 'border-rose-500/30 bg-rose-500/[0.08] text-rose-400'
                }`}
              >
                {nameMsg.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                )}
                {nameMsg.text}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400">
                  Nome Completo
                </label>
                {editingName ? (
                  <div className="mt-1 flex gap-3">
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="input-field flex-1"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={savingName}
                      className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      {savingName && <Loader2 className="h-4 w-4 animate-spin" />}
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setEditingName(false)
                        setNome(usuario?.nome_completo ?? '')
                        setNameMsg(null)
                      }}
                      className="btn-ghost"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-white">
                    {usuario?.nome_completo ?? '--'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400">Email</label>
                <p className="mt-1 text-sm text-white">{userEmail}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400">Plano</label>
                  <p className="mt-1 text-sm text-white">{plano}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400">Status</label>
                  <p className="mt-1 text-sm text-white">{statusConta}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="card rounded-2xl p-6">
            <h3 className="flex items-center gap-2 text-base font-semibold text-white">
              <Lock className="h-4 w-4 text-zinc-500" />
              Alterar Senha
            </h3>

            {passwordMsg && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  passwordMsg.type === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400'
                    : 'border-rose-500/30 bg-rose-500/[0.08] text-rose-400'
                }`}
              >
                {passwordMsg.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                )}
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400">
                  Senha Atual
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  className="input-field mt-1 w-full"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-400">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="input-field mt-1 w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="input-field mt-1 w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                  Alterar Senha
                </button>
              </div>
            </form>
          </div>

          {/* Security Info */}
          <div className="card rounded-2xl p-6">
            <h3 className="flex items-center gap-2 text-base font-semibold text-white">
              <Shield className="h-4 w-4 text-zinc-500" />
              Segurança
            </h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-edge-1 bg-surface-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">Autenticação por Email</p>
                  <p className="text-xs text-zinc-500">Login via email e senha</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/[0.08] px-2.5 py-1 text-xs font-medium text-emerald-400">
                  <CheckCircle className="h-3 w-3" />
                  Ativo
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-edge-1 bg-surface-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">Verificação em 2 Etapas</p>
                  <p className="text-xs text-zinc-500">Camada extra de segurança</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-surface-4 px-2.5 py-1 text-xs font-medium text-zinc-400">
                  Em breve
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
