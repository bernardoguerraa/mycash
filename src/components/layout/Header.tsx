'use client'

import { Bell } from 'lucide-react'

interface HeaderProps {
  title: string
  userName: string
  unreadCount?: number
}

export default function Header({ title, userName, unreadCount = 0 }: HeaderProps) {
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-800 bg-gray-950/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      {/* Left: spacer for mobile menu button + title */}
      <div className="flex items-center gap-4">
        {/* Spacer so mobile hamburger doesn't overlap */}
        <div className="w-10 lg:hidden" />
        <h1 className="text-lg font-semibold text-white sm:text-xl">{title}</h1>
      </div>

      {/* Right: notifications + avatar */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          className="relative rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          aria-label="Notificacoes"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-green-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-white leading-tight">{userName}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-sm font-bold text-white shadow-lg shadow-green-500/20">
            {initials}
          </div>
        </div>
      </div>
    </header>
  )
}
