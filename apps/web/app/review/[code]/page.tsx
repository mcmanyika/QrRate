'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function ReviewPage() {
  const params = useParams()
  const code = params.code as string
  const [business, setBusiness] = useState<any>(null)
  const [qrCode, setQrCode] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stars, setStars] = useState(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Available tags (can be customized per business)
  const defaultTags = ['Friendly', 'Fast', 'Great value', 'Clean', 'Professional', 'Helpful']

  useEffect(() => {
    async function loadBusiness() {
      try {
        setError(null)
        // Find QR code by code
        const { data: qrData, error: qrError } = await supabase
          .from('qr_code')
          .select('*, business:business_id(*)')
          .eq('code', code)
          .eq('is_active', true)
          .single()

        if (qrError || !qrData) {
          setError('QR code not found or invalid')
          setLoading(false)
          return
        }

        setQrCode(qrData)
        setBusiness(qrData.business)

        // Load business settings for custom tags
        if (qrData.business) {
          const { data: settings } = await supabase
            .from('business_settings')
            .select('custom_tags')
            .eq('business_id', qrData.business.id)
            .single()

          if (settings?.custom_tags && settings.custom_tags.length > 0) {
            // Use custom tags if available, otherwise use defaults
            // This will be used in the tag selection UI
          }
        }
      } catch (error) {
        console.error('Error loading business:', error)
        setError('Failed to load business information')
      } finally {
        setLoading(false)
      }
    }

    if (code) {
      loadBusiness()
    }
  }, [code, supabase])

  // Handle photo selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setPhotos(files)
      
      // Create previews
      const previews = files.map(file => URL.createObjectURL(file))
      setPhotoPreviews(previews)
    }
  }

  // Get device hash (same logic as mobile app)
  async function getDeviceHash(): Promise<string> {
    const key = 'device_hash_v1'
    let hash = localStorage.getItem(key)
    if (!hash) {
      hash = Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem(key, hash)
    }
    return hash
  }

  async function handleSubmit() {
    if (!business || !qrCode || stars < 1) {
      setError('Please select a rating')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const deviceHash = await getDeviceHash()

      // Upload photos if any
      const photoUrls: string[] = []
      if (photos.length > 0) {
        for (const photo of photos) {
          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${photo.name.split('.').pop()}`
          const { data, error: uploadError } = await supabase.storage
            .from('review-photos')
            .upload(fileName, photo)

          if (uploadError) {
            console.error('Error uploading photo:', uploadError)
            continue
          }

          if (data) {
            const { data: urlData } = supabase.storage
              .from('review-photos')
              .getPublicUrl(data.path)
            photoUrls.push(urlData.publicUrl)
          }
        }
      }

      // Submit review
      const { error: reviewError } = await supabase
        .from('review')
        .insert({
          business_id: business.id,
          qr_code_id: qrCode.id,
          stars,
          tags: selectedTags.length > 0 ? selectedTags : null,
          comment: comment.trim() || null,
          photo_urls: photoUrls.length > 0 ? photoUrls : null,
          device_hash: deviceHash,
        })

      if (reviewError) {
        // Handle rate limiting errors
        if (reviewError.message?.includes('daily_review_limit_exceeded')) {
          const match = reviewError.message.match(/already submitted (\d+) reviews today/)
          const count = match ? match[1] : '4'
          setError(`Maximum of 4 reviews per day reached. You have already submitted ${count} reviews today.`)
        } else if (reviewError.message?.includes('uniq_review_device_business_hour')) {
          setError('You have already reviewed this business. Please wait an hour before submitting another review.')
        } else {
          setError(reviewError.message || 'Failed to submit review. Please try again.')
        }
        setSubmitting(false)
        return
      }

      // Update QR code scan count
      await supabase
        .from('qr_code')
        .update({ scan_count: (qrCode.scan_count || 0) + 1 })
        .eq('id', qrCode.id)

      setSuccess(true)
    } catch (error) {
      console.error('Error submitting review:', error)
      setError('Failed to submit review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error && !business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Business Not Found</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-6">Your review has been submitted successfully.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Leave Another Review
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Business Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          {business.logo_url && (
            <div className="flex justify-center mb-4">
              <Image
                src={business.logo_url}
                alt={business.name}
                width={80}
                height={80}
                className="rounded-full object-cover"
              />
            </div>
          )}
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">{business.name}</h1>
          {business.description && (
            <p className="text-center text-gray-600">{business.description}</p>
          )}
          {business.category && (
            <p className="text-center text-sm text-gray-500 mt-2 capitalize">{business.category}</p>
          )}
        </div>

        {/* Review Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Leave a Review</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Star Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Rating *
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setStars(n)}
                  className="text-4xl focus:outline-none transition-transform hover:scale-110"
                  type="button"
                >
                  <span className={stars >= n ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What stood out? (Select all that apply)
            </label>
            <div className="flex flex-wrap gap-2">
              {defaultTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTags(prev =>
                      prev.includes(tag)
                        ? prev.filter(t => t !== tag)
                        : [...prev, tag]
                    )
                  }}
                  type="button"
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Review (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={500}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Share your experience..."
            />
            <p className="text-sm text-gray-500 mt-1">{comment.length}/500</p>
          </div>

          {/* Photo Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Photos (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {photoPreviews.length > 0 && (
              <div className="mt-4 flex gap-2 flex-wrap">
                {photoPreviews.map((preview, i) => (
                  <div key={i} className="relative">
                    <Image
                      src={preview}
                      alt={`Preview ${i + 1}`}
                      width={80}
                      height={80}
                      className="rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newPhotos = [...photos]
                        const newPreviews = [...photoPreviews]
                        newPhotos.splice(i, 1)
                        newPreviews.splice(i, 1)
                        setPhotos(newPhotos)
                        setPhotoPreviews(newPreviews)
                        URL.revokeObjectURL(preview)
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={stars < 1 || submitting}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  )
}

