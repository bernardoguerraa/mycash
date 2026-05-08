'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Bell } from 'lucide-react'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/transacoes': 'Transacoes',
  '/contas': 'Contas',
  '/metas': 'Metas',
  '/lembretes': 'Lembretes',
  '/notificacoes': 'Notificacoes',
  '/perfil': 'Perfil',
}

interface HeaderProps {
  userName: string
  unreadCount?: number
}

export default function Header({ userName, unreadCount = 0 }: HeaderProps) {
  const pathname = usePathname()
  const title = pageTitles[pathname] || 'MyCash'

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-edge-1 bg-surface-0/70 backdrop-blur-2xl px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <div className="w-10 lg:hidden" />
        <span className="text-sm text-zinc-500">MyCash</span>
        <span className="text-zinc-700">/</span>
        <span className="text-sm font-medium text-white">{title}</span>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/notificacoes"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <Bell className="h-[18px] w-[18px] stroke-[1.5]" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        <Link href="/perfil" className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/[0.04]">
          <span className="hidden text-sm text-zinc-400 sm:block">{userName}</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white ring-1 ring-edge-2">
            {initials}
          </div>
        </Link>
      </div>
    </header>
  )
}
