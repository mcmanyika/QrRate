import { redirect } from 'next/navigation'
import { getBusinessOwner } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import Header from '@/components/dashboard/Header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Check if user has at least one business (optional - allow access even without businesses)
  const business = await getBusinessOwner()
  
  // Note: We allow access even without businesses so users can create their first one

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 relative overflow-y-auto focus:outline-none dark:bg-gray-900">
          <div className="py-2">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-5">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

