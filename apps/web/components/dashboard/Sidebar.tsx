'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { FaChartBar, FaCalendarAlt, FaUser, FaSignOutAlt, FaDollarSign, FaChartLine } from 'react-icons/fa'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: FaChartBar },
  { name: 'Campaigns', href: '/dashboard/events', icon: FaCalendarAlt },
  { name: 'Reports', href: '/dashboard/reports', icon: FaChartLine },
  { name: 'Pricing', href: '/pricing', icon: FaDollarSign },
  { name: 'Profile', href: '/dashboard/profile', icon: FaUser },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isHovered, setIsHovered] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div
      className={`flex flex-col h-full bg-gray-900 text-white transition-all duration-300 ease-in-out ${
        isHovered ? 'w-64' : 'w-20'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          {isHovered ? (
            <h1 className="text-xl font-bold whitespace-nowrap">FeedbackQR</h1>
          ) : (
            <h1 className="text-xl font-bold whitespace-nowrap">QR</h1>
          )}
        </div>
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all ${
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                } ${isHovered ? 'justify-start' : 'justify-center'}`}
                title={!isHovered ? item.name : undefined}
              >
                <item.icon className={`w-5 h-5 ${isHovered ? 'mr-3' : ''}`} />
                {isHovered && (
                  <span className="whitespace-nowrap">{item.name}</span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="flex-shrink-0 flex border-t border-gray-700 p-4">
        <button
          onClick={handleSignOut}
          className={`flex-shrink-0 w-full group block ${isHovered ? 'justify-start' : 'justify-center'}`}
          title={!isHovered ? 'Sign out' : undefined}
        >
          <div className="flex items-center justify-center">
            <FaSignOutAlt className={`w-5 h-5 ${isHovered ? 'mr-2' : ''}`} />
            {isHovered && (
              <div className="text-sm font-medium text-gray-300 group-hover:text-white whitespace-nowrap">
                Sign out
              </div>
            )}
          </div>
        </button>
      </div>
    </div>
  )
}

