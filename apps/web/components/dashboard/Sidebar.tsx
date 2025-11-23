'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Vehicles', href: '/dashboard/vehicles', icon: '🚐' },
  { name: 'Ratings', href: '/dashboard/ratings', icon: '⭐' },
  { name: 'Tips', href: '/dashboard/tips', icon: '💝' },
  { name: 'Profile', href: '/dashboard/profile', icon: '👤' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold">RateMyRide</h1>
        </div>
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="flex-shrink-0 flex border-t border-gray-700 p-4">
        <button
          onClick={handleSignOut}
          className="flex-shrink-0 w-full group block"
        >
          <div className="flex items-center">
            <div className="text-sm font-medium text-gray-300 group-hover:text-white">
              Sign out
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

