'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Target,
  Bell,
  BellRing,
  User,
  LogOut,
  X,
  Menu,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transacoes', label: 'Transacoes', icon: ArrowLeftRight },
  { href: '/contas', label: 'Contas', icon: Wallet },
  { href: '/metas', label: 'Metas', icon: Target },
  { href: '/lembretes', label: 'Lembretes', icon: Bell },
  { href: '/notificacoes', label: 'Notificacoes', icon: BellRing },
  { href: '/perfil', label: 'Perfil', icon: User },
]

interface SidebarProps {
  onLogout: () => void
}

export default function Sidebar({ onLogout }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-surface-1">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-5 border-b border-edge-1">
        <span className="text-lg font-bold tracking-tight">
          <span className="text-white">My</span>
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Cash</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-3 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`
                group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150
                ${active
                  ? 'bg-white/[0.06] text-white'
                  : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
                }
              `}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-emerald-500" />
              )}
              <Icon className={`h-[18px] w-[18px] flex-shrink-0 stroke-[1.5] ${active ? 'text-emerald-400' : ''}`} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-edge-1 p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-zinc-500 transition-all duration-150 hover:bg-white/[0.04] hover:text-zinc-300"
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0 stroke-[1.5]" />
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-xl bg-surface-2 p-2 text-zinc-400 lg:hidden hover:text-white border border-edge-2"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-out lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-3.5 rounded-lg p-1.5 text-zinc-500 hover:text-white"
          aria-label="Fechar menu"
        >
          <X className="h-4 w-4" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-60 lg:border-r lg:border-edge-1">
        {sidebarContent}
      </aside>
    </>
  )
}
