'use client'

import { useEffect, useState } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  name: string
  email: string
  phone?: string | null
  profile_image_url?: string | null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const profileData: Profile = {
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          phone: user.user_metadata?.phone || null,
          profile_image_url: user.user_metadata?.avatar_url || null,
        }
        setProfile(profileData)
        setFormData({
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone || '',
        })
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('User not logged in')
        return
      }

      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: formData.name,
          phone: formData.phone || null,
        }
      })

      if (error) throw error

      setEditing(false)
      await fetchProfile()
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-600">Failed to load profile</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Profile</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3">
        {profile.profile_image_url && (
          <div className="mb-3">
            <img
              src={profile.profile_image_url}
              alt={profile.name}
              className="w-16 h-16 rounded-full object-cover mx-auto"
            />
          </div>
        )}

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs"
              />
              <p className="text-xs text-gray-500 mt-0.5">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setFormData({
                    name: profile.name,
                    email: profile.email,
                    phone: profile.phone || '',
                  })
                }}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100">{profile.name}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100">{profile.email}</p>
            </div>
            {profile.phone && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <p className="text-sm text-gray-900 dark:text-gray-100">{profile.phone}</p>
              </div>
            )}
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs"
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
