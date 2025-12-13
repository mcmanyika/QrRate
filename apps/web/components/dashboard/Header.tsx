'use client'

import { useEffect, useState } from 'react'
import ThemeToggle from '@/components/ThemeToggle'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  name: string
  email: string
}

export default function Header() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setProfile({
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
          })
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  return (
    <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 md:px-8 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          {!loading && profile && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Welcome, <span className="font-semibold">{profile.name}</span>
            </span>
          )}
        </div>
        <div className="flex items-center">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

