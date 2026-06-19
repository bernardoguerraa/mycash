'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

type Theme = 'light' | 'dark'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')

  // Lê o tema atual da classe no <html> (definida pelo init script no layout)
  useEffect(() => {
    const isLight = document.documentElement.classList.contains('light')
    setTheme(isLight ? 'light' : 'dark')
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.classList.toggle('light', next === 'light')
    try {
      localStorage.setItem('theme', next)
    } catch {}
  }

  const Icon = theme === 'dark' ? Sun : Moon
  const label = theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-zinc-500 transition-all duration-150 hover:bg-white/[0.04] hover:text-zinc-300"
    >
      <Icon className="h-[18px] w-[18px] flex-shrink-0 stroke-[1.5]" />
      {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
    </button>
  )
}
