'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

interface DashboardShellProps {
  userName: string
  children: React.ReactNode
}

export default function DashboardShell({ userName, children }: DashboardShellProps) {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-surface-0 text-white">
      <Sidebar onLogout={handleLogout} />
      <div className="lg:pl-60">
        <Header userName={userName} unreadCount={3} />
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
