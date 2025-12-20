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
  const [campaign, setCampaign] = useState<any>(null)
  const [campaignQuestions, setCampaignQuestions] = useState<any[]>([])
  const [campaignAnswers, setCampaignAnswers] = useState<Record<string, any>>({})
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

  // Default tags fallback
  const defaultTags = ['Friendly', 'Fast', 'Great value', 'Clean', 'Professional', 'Helpful']
  const [campaignTags, setCampaignTags] = useState<string[]>([])

  useEffect(() => {
    async function loadQRCode() {
      try {
        setError(null)
        // Find QR code by code - can be linked to campaign or business
        const { data: qrData, error: qrError } = await supabase
          .from('qr_code')
          .select('*, business:business_id(*), campaign:campaign_id(*)')
          .eq('code', code)
          .eq('is_active', true)
          .single()

        if (qrError || !qrData) {
          setError('QR code not found or invalid')
          setLoading(false)
          return
        }

        setQrCode(qrData)

        // Check if QR code is linked to a campaign directly
        if (qrData.campaign_id && qrData.campaign) {
          setCampaign(qrData.campaign)
          
          // Set campaign tags
          setCampaignTags(
            qrData.campaign.tags && qrData.campaign.tags.length > 0
              ? qrData.campaign.tags
              : defaultTags
          )

          // Load campaign questions
          const { data: questions } = await supabase
            .from('campaign_question')
            .select('*')
            .eq('campaign_id', qrData.campaign_id)
            .order('order_index', { ascending: true })

          if (questions) {
            setCampaignQuestions(questions)
          }
        } 
        // Otherwise, check if it's a business QR code that's part of a campaign
        else if (qrData.business) {
          setBusiness(qrData.business)

          const { data: eventBusiness } = await supabase
            .from('event_business')
            .select('*, event:event_id(*)')
            .eq('business_id', qrData.business.id)
            .eq('event.is_active', true)
            .order('event.created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (eventBusiness?.event) {
            setCampaign(eventBusiness.event)
            
            // Set campaign tags
            setCampaignTags(
              eventBusiness.event.tags && eventBusiness.event.tags.length > 0
                ? eventBusiness.event.tags
                : defaultTags
            )

            // Load campaign questions
            const { data: questions } = await supabase
              .from('campaign_question')
              .select('*')
              .eq('campaign_id', eventBusiness.event.id)
              .order('order_index', { ascending: true })

            if (questions) {
              setCampaignQuestions(questions)
            }
          }

          // Load business settings for custom tags
          const { data: settings } = await supabase
            .from('business_settings')
            .select('custom_tags')
            .eq('business_id', qrData.business.id)
            .single()

          if (settings?.custom_tags && settings.custom_tags.length > 0) {
            // Use custom tags if available, otherwise use defaults
            setCampaignTags(settings.custom_tags)
          } else if (!eventBusiness?.event) {
            // Only set default tags if there's no campaign
            setCampaignTags(defaultTags)
          }
        }
      } catch (error) {
        console.error('Error loading QR code:', error)
        setError('Failed to load QR code information')
      } finally {
        setLoading(false)
      }
    }

    if (code) {
      loadQRCode()
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

  // Check if all required campaign questions are answered (for button state)
  function areCampaignAnswersValid(): boolean {
    for (const question of campaignQuestions) {
      if (question.is_required) {
        const answer = campaignAnswers[question.id]
        if (answer === undefined || answer === null || answer === '' || (question.question_type === 'text' && !String(answer).trim())) {
          return false
        }
        if (question.question_type === 'rating' && (!answer || answer < question.min_rating || answer > question.max_rating)) {
          return false
        }
      }
    }
    return true
  }

  // Validate campaign questions (with error messages)
  function validateCampaignAnswers(): boolean {
    for (const question of campaignQuestions) {
      if (question.is_required) {
        const answer = campaignAnswers[question.id]
        if (!answer || (question.question_type === 'text' && !String(answer).trim())) {
          setError(`Please answer the required question: "${question.question_text}"`)
          return false
        }
        if (question.question_type === 'rating' && (!answer || answer < question.min_rating || answer > question.max_rating)) {
          setError(`Please provide a valid rating for: "${question.question_text}"`)
          return false
        }
      }
    }
    return true
  }

  // Check if form is valid for submission
  function isFormValid(): boolean {
    // If campaign questions exist, check if all required ones are answered
    if (campaignQuestions.length > 0) {
      return areCampaignAnswersValid()
    }
    // Otherwise, require stars
    return stars >= 1
  }

  async function handleSubmit() {
    if (!qrCode) {
      setError('QR code information not loaded')
      return
    }

    // Must have either business or campaign
    if (!business && !campaign) {
      setError('QR code is not linked to a business or campaign')
      return
    }

    // If campaign questions exist, validate them
    if (campaignQuestions.length > 0 && !validateCampaignAnswers()) {
      return
    }

    // If no campaign questions, require stars
    if (campaignQuestions.length === 0 && stars < 1) {
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
      const { data: reviewData, error: reviewError } = await supabase
        .from('review')
        .insert({
          business_id: business?.id || null, // May be null for campaign-only reviews
          campaign_id: campaign?.id || null, // May be null for business-only reviews
          qr_code_id: qrCode.id,
          stars: stars || null, // Stars may be null if using campaign questions only
          tags: selectedTags.length > 0 ? selectedTags : null,
          comment: comment.trim() || null,
          photo_urls: photoUrls.length > 0 ? photoUrls : null,
          device_hash: deviceHash,
        })
        .select()
        .single()

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

      // Save campaign answers if any
      if (reviewData && campaignQuestions.length > 0) {
        const answersToInsert = campaignQuestions
          .filter(q => campaignAnswers[q.id] !== undefined && campaignAnswers[q.id] !== null && campaignAnswers[q.id] !== '')
          .map(question => {
            const answer = campaignAnswers[question.id]
            const answerData: any = {
              review_id: reviewData.id,
              question_id: question.id,
            }

            if (question.question_type === 'rating') {
              answerData.answer_rating = parseInt(answer)
            } else if (question.question_type === 'yes_no') {
              answerData.answer_boolean = answer === true || answer === 'yes' || answer === 'Yes'
            } else {
              answerData.answer_text = String(answer)
            }

            return answerData
          })

        if (answersToInsert.length > 0) {
          const { error: answersError } = await supabase
            .from('campaign_review_answer')
            .insert(answersToInsert)

          if (answersError) {
            console.error('Error saving campaign answers:', answersError)
            // Don't fail the review if answers fail to save
          }
        }
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
        <div className="text-center max-w-md mx-auto p-4">
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
        <div className="text-center max-w-md mx-auto p-4">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-4 text-sm">Your review has been submitted successfully.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Leave Another Review
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-4 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Campaign/Business Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          {campaign && (
            <>
              <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">{campaign.name}</h1>
              {campaign.description && (
                <p className="text-center text-gray-600 text-sm">{campaign.description}</p>
              )}
              {campaign.campaign_type && (
                <p className="text-center text-xs text-gray-500 mt-1 capitalize">{campaign.campaign_type}</p>
              )}
            </>
          )}
          {business && (
            <>
              {business.logo_url && (
                <div className="flex justify-center mb-2">
                  <Image
                    src={business.logo_url}
                    alt={business.name}
                    width={60}
                    height={60}
                    className="rounded-full object-cover"
                  />
                </div>
              )}
              <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">{business.name}</h1>
              {business.description && (
                <p className="text-center text-gray-600 text-sm">{business.description}</p>
              )}
              {business.category && (
                <p className="text-center text-xs text-gray-500 mt-1 capitalize">{business.category}</p>
              )}
            </>
          )}
        </div>

        {/* Review Form */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Leave a Review</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}


          {/* Campaign Questions */}
          {campaignQuestions.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Questions</h3>
              <div className="space-y-3">
                {campaignQuestions.map((question) => (
                  <div key={question.id} className="border-b border-gray-200 pb-4 last:border-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {question.question_text}
                      {question.is_required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {question.question_type === 'rating' && (
                      <div className="flex gap-2 items-center">
                        <span className="text-sm text-gray-500 mr-2">{question.min_rating}</span>
                        {Array.from({ length: question.max_rating - question.min_rating + 1 }, (_, i) => i + question.min_rating).map((n) => (
                          <button
                            key={n}
                            onClick={() => setCampaignAnswers({ ...campaignAnswers, [question.id]: n })}
                            className="text-3xl focus:outline-none transition-transform hover:scale-110"
                            type="button"
                          >
                            <span className={campaignAnswers[question.id] >= n ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                          </button>
                        ))}
                        <span className="text-sm text-gray-500 ml-2">{question.max_rating}</span>
                      </div>
                    )}

                    {question.question_type === 'text' && (
                      <textarea
                        value={campaignAnswers[question.id] || ''}
                        onChange={(e) => setCampaignAnswers({ ...campaignAnswers, [question.id]: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Your answer..."
                      />
                    )}

                    {question.question_type === 'multiple_choice' && question.options && (
                      <div className="space-y-2">
                        {(Array.isArray(question.options) ? question.options : typeof question.options === 'string' ? JSON.parse(question.options) : []).map((option: string, idx: number) => (
                          <label key={idx} className="flex items-center">
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              value={option}
                              checked={campaignAnswers[question.id] === option}
                              onChange={(e) => setCampaignAnswers({ ...campaignAnswers, [question.id]: e.target.value })}
                              className="mr-2"
                            />
                            <span className="text-gray-700">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {question.question_type === 'yes_no' && (
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value="yes"
                            checked={campaignAnswers[question.id] === 'yes' || campaignAnswers[question.id] === true}
                            onChange={() => setCampaignAnswers({ ...campaignAnswers, [question.id]: true })}
                            className="mr-2"
                          />
                          <span className="text-gray-700">Yes</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value="no"
                            checked={campaignAnswers[question.id] === 'no' || campaignAnswers[question.id] === false}
                            onChange={() => setCampaignAnswers({ ...campaignAnswers, [question.id]: false })}
                            className="mr-2"
                          />
                          <span className="text-gray-700">No</span>
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Star Rating (only show if no campaign questions) */}
          {campaignQuestions.length === 0 && (
            <div className="mb-4">
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
          )}

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
            disabled={!isFormValid() || submitting}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  )
}

