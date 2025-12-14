'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FaTimes } from 'react-icons/fa'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useRouter } from 'next/navigation'

interface QuickCreateCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function QuickCreateCampaignModal({ isOpen, onClose, onSuccess }: QuickCreateCampaignModalProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaign_type: 'business' as 'product' | 'business' | 'event' | 'service' | 'other',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('Campaign name is required')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('Please log in to create campaigns')
        setSubmitting(false)
        return
      }

      // Generate slug from name
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      // Check if slug exists
      let finalSlug = slug
      let counter = 1
      while (true) {
        const { data: existing } = await supabase
          .from('event')
          .select('id')
          .eq('slug', finalSlug)
          .maybeSingle()
        
        if (!existing) break
        finalSlug = `${slug}-${counter}`
        counter++
      }

      // Create campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from('event')
        .insert({
          organizer_id: user.id,
          name: formData.name.trim(),
          slug: finalSlug,
          description: formData.description.trim() || null,
          campaign_type: formData.campaign_type,
          is_active: true,
        })
        .select()
        .single()

      if (campaignError) throw campaignError

      // Reset form
      setFormData({
        name: '',
        description: '',
        campaign_type: 'business',
      })

      // Close modal and refresh
      onClose()
      if (onSuccess) {
        onSuccess()
      } else {
        // Redirect to campaign page or refresh
        router.push(`/dashboard/events/${campaignData.id}`)
        router.refresh()
      }
    } catch (err: any) {
      console.error('Error creating campaign:', err)
      setError(err.message || 'Failed to create campaign')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm max-w-md w-full mx-4 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <FaTimes className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Quick Create Campaign</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Campaign Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              placeholder="Farmers Market 2024"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Campaign Type *
            </label>
            <select
              value={formData.campaign_type}
              onChange={(e) => setFormData({ ...formData, campaign_type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="product">Product</option>
              <option value="business">Business</option>
              <option value="event">Event</option>
              <option value="service">Service</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              placeholder="Optional description..."
            />
          </div>

          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Creating...
                </>
              ) : (
                'Create Campaign'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
