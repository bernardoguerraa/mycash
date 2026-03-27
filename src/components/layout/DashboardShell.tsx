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
    <div className="min-h-screen bg-gray-950 text-white">
      <Sidebar onLogout={handleLogout} />

      {/* Main content area */}
      <div className="lg:pl-64">
        <Header title="Dashboard" userName={userName} unreadCount={3} />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
