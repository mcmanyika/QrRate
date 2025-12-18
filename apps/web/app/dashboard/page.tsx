'use client'

import { useEffect, useState } from 'react'
import StatsCard from '@/components/dashboard/StatsCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import ReviewFilters from '@/components/dashboard/ReviewFilters'
import ReviewTrendsChart from '@/components/dashboard/ReviewTrendsChart'
import RatingDistributionChart from '@/components/dashboard/RatingDistributionChart'
import QuickCreateCampaignModal from '@/components/dashboard/QuickCreateCampaignModal'
import { createClient } from '@/lib/supabase/client'
import { FaQrcode, FaStar, FaComments, FaChartBar, FaCalendar, FaPlus, FaDownload, FaFilePdf, FaFileCsv, FaChevronDown } from 'react-icons/fa'
import Link from 'next/link'
import jsPDF from 'jspdf'

interface CampaignStats {
  total_campaigns: number
  total_reviews: number
  average_rating: number
  total_qr_codes: number
  recent_reviews: any[]
  campaigns: any[]
  review_trends: Array<{ date: string; count: number; avgRating?: number }>
  rating_distribution: Array<{ rating: number; count: number; percentage: number }>
}

interface Filters {
  rating: number | null // null = all, 1-5 = specific rating
  campaign: string | null // null = all, uuid = specific campaign
  dateRange: '7d' | '30d' | '90d' | 'custom' | null
  customDateStart: string | null
  customDateEnd: string | null
  search: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>({
    rating: null,
    campaign: null,
    dateRange: null,
    customDateStart: null,
    customDateEnd: null,
    search: '',
  })
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false)
  const [showExportDropdown, setShowExportDropdown] = useState(false)

  // Shared function to fetch filtered reviews
  const fetchFilteredReviews = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Please log in to export reviews')
    }

    // Fetch campaigns
    const { data: campaigns } = await supabase
      .from('event')
      .select('id, name')
      .eq('organizer_id', user.id)
      .eq('is_active', true)

    const campaignIds = campaigns?.map((c) => c.id) || []
    if (campaignIds.length === 0) {
      throw new Error('No campaigns found')
    }

    // Build query with filters (same as fetchStats)
    let reviewQuery = supabase
      .from('review')
      .select('*, campaign:campaign_id(name)')
      .in('campaign_id', campaignIds)
      .eq('is_public', true)

    if (filters.campaign) {
      reviewQuery = reviewQuery.eq('campaign_id', filters.campaign)
    }

    if (filters.rating !== null) {
      reviewQuery = reviewQuery.eq('stars', filters.rating)
    }

    if (filters.dateRange) {
      const now = new Date()
      let startDate: Date

      if (filters.dateRange === '7d') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else if (filters.dateRange === '30d') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      } else if (filters.dateRange === '90d') {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      } else if (filters.dateRange === 'custom' && filters.customDateStart) {
        startDate = new Date(filters.customDateStart)
      } else {
        startDate = new Date(0)
      }

      if (filters.dateRange === 'custom' && filters.customDateEnd) {
        const endDate = new Date(filters.customDateEnd)
        endDate.setHours(23, 59, 59, 999)
        reviewQuery = reviewQuery
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      } else {
        reviewQuery = reviewQuery.gte('created_at', startDate.toISOString())
      }
    }

    const { data: reviews } = await reviewQuery

    // Apply search filter
    let filteredReviews = reviews || []
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase()
      filteredReviews = filteredReviews.filter((r) =>
        r.comment?.toLowerCase().includes(searchTerm)
      )
    }

    // Fetch rating answers from campaign questions for reviews without stars
    const reviewIds = filteredReviews.map(r => r.id).filter(Boolean)
    let ratingAnswersMap: Record<string, number> = {}

    if (reviewIds.length > 0) {
      // Fetch all rating-type questions for these campaigns
      const { data: ratingQuestions } = await supabase
        .from('campaign_question')
        .select('id, campaign_id')
        .in('campaign_id', campaignIds)
        .eq('question_type', 'rating')

      if (ratingQuestions && ratingQuestions.length > 0) {
        // Fetch answers for rating-type questions
        const { data: ratingAnswers } = await supabase
          .from('campaign_review_answer')
          .select('answer_rating, review_id')
          .in('review_id', reviewIds)
          .in('question_id', ratingQuestions.map(q => q.id))
          .not('answer_rating', 'is', null)

        if (ratingAnswers && ratingAnswers.length > 0) {
          // Create a map of review_id to rating (use first rating answer found)
          ratingAnswers.forEach((answer) => {
            if (answer.answer_rating && answer.review_id && !ratingAnswersMap[answer.review_id]) {
              ratingAnswersMap[answer.review_id] = answer.answer_rating
            }
          })
        }
      }
    }

    // Add rating from campaign questions to reviews
    const reviewsWithRatings = filteredReviews.map(review => ({
      ...review,
      effectiveRating: review.stars || ratingAnswersMap[review.id] || null
    }))

    return reviewsWithRatings
  }

  const handleExportReviews = async (format: 'csv' | 'pdf') => {
    try {
      const filteredReviews = await fetchFilteredReviews()

      if (format === 'csv') {
        // Generate CSV
        const headers = ['Date', 'Campaign', 'Rating', 'Comment', 'Tags', 'Reviewer Name']
        const rows = filteredReviews.map((review: any) => {
          const date = review.created_at
            ? new Date(review.created_at).toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })
            : ''
          const campaign = review.campaign?.name || 'Unknown'
          const rating = review.effectiveRating || ''
          const comment = (review.comment || '').replace(/"/g, '""') // Escape quotes
          const tags = Array.isArray(review.tags) ? review.tags.join(', ') : ''
          const reviewer = review.reviewer_name || 'Anonymous'

          return [date, campaign, rating, comment, tags, reviewer]
        })

        // Escape CSV values
        const escapeCSV = (value: string) => {
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }

        const csvContent = [
          headers.join(','),
          ...rows.map((row) => row.map((cell) => escapeCSV(String(cell))).join(',')),
        ].join('\n')

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `reviews-${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else if (format === 'pdf') {
        // Generate PDF
        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const margin = 15
        const lineHeight = 7
        let yPos = margin

        // Title
        doc.setFontSize(18)
        doc.text('Reviews Export', margin, yPos)
        yPos += lineHeight * 2

        // Date range info
        doc.setFontSize(10)
        const exportDate = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        doc.text(`Exported on: ${exportDate}`, margin, yPos)
        yPos += lineHeight * 1.5
        doc.text(`Total Reviews: ${filteredReviews.length}`, margin, yPos)
        yPos += lineHeight * 2

        // Table headers
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        const colWidths = [35, 40, 20, 60, 30]
        const headers = ['Date', 'Campaign', 'Rating', 'Comment', 'Tags']
        let xPos = margin

        headers.forEach((header, index) => {
          doc.text(header, xPos, yPos)
          xPos += colWidths[index]
        })

        yPos += lineHeight
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)

        // Table rows
        filteredReviews.forEach((review, index) => {
          // Check if we need a new page
          if (yPos > pageHeight - margin - lineHeight * 3) {
            doc.addPage()
            yPos = margin
          }

          const date = review.created_at
            ? new Date(review.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'N/A'
          const campaign = (review.campaign?.name || 'Unknown').substring(0, 25)
          const rating = review.effectiveRating ? `${review.effectiveRating}★` : 'N/A'
          const comment = (review.comment || '').substring(0, 50)
          const tags = Array.isArray(review.tags) ? review.tags.join(', ').substring(0, 20) : ''

          xPos = margin
          const rowData = [date, campaign, rating, comment, tags]

          rowData.forEach((cell, cellIndex) => {
            doc.text(cell, xPos, yPos)
            xPos += colWidths[cellIndex]
          })

          yPos += lineHeight * 1.2

          // Add separator line
          if (index < filteredReviews.length - 1) {
            doc.setDrawColor(200, 200, 200)
            doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2)
          }
        })

        // Download PDF
        doc.save(`reviews-${new Date().toISOString().split('T')[0]}.pdf`)
      }

      setShowExportDropdown(false)
    } catch (error: any) {
      console.error('Error exporting reviews:', error)
      alert(error.message || 'Failed to export reviews')
    }
  }

  useEffect(() => {
    async function fetchStats() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setLoading(false)
          return
        }

        // Fetch campaigns organized by user
        const { data: campaigns } = await supabase
          .from('event')
          .select('id, name')
          .eq('organizer_id', user.id)
          .eq('is_active', true)

        const campaignIds = campaigns?.map(c => c.id) || []

        if (campaignIds.length === 0) {
          setStats({
            total_campaigns: 0,
            total_reviews: 0,
            average_rating: 0,
            total_qr_codes: 0,
            recent_reviews: [],
            campaigns: [],
            review_trends: [],
            rating_distribution: [],
          })
          setLoading(false)
          return
        }

        // Build review query with filters
        let reviewQuery = supabase
          .from('review')
          .select('id, stars, created_at, campaign_id, comment, tags, reviewer_name')
          .in('campaign_id', campaignIds)
          .eq('is_public', true)

        // Apply campaign filter
        if (filters.campaign) {
          reviewQuery = reviewQuery.eq('campaign_id', filters.campaign)
        }

        // Apply rating filter
        if (filters.rating !== null) {
          reviewQuery = reviewQuery.eq('stars', filters.rating)
        }

        // Apply date range filter
        if (filters.dateRange) {
          const now = new Date()
          let startDate: Date
          
          if (filters.dateRange === '7d') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          } else if (filters.dateRange === '30d') {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          } else if (filters.dateRange === '90d') {
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          } else if (filters.dateRange === 'custom' && filters.customDateStart) {
            startDate = new Date(filters.customDateStart)
          } else {
            startDate = new Date(0) // All time
          }

          if (filters.dateRange === 'custom' && filters.customDateEnd) {
            const endDate = new Date(filters.customDateEnd)
            endDate.setHours(23, 59, 59, 999) // End of day
            reviewQuery = reviewQuery
              .gte('created_at', startDate.toISOString())
              .lte('created_at', endDate.toISOString())
          } else {
            reviewQuery = reviewQuery.gte('created_at', startDate.toISOString())
          }
        }

        // Fetch all reviews (for filtering and stats)
        const { data: allReviews } = await reviewQuery

        // Apply search filter client-side (since Supabase text search requires full-text search setup)
        let filteredReviews = allReviews || []
        if (filters.search.trim()) {
          const searchTerm = filters.search.toLowerCase()
          filteredReviews = filteredReviews.filter((r) =>
            r.comment?.toLowerCase().includes(searchTerm)
          )
        }

        const totalReviews = filteredReviews.length
        
        // Calculate average rating from campaign question answers (preferred) or star ratings (fallback)
        const reviewIds = filteredReviews.map(r => r.id).filter(Boolean)
        let averageRating = 0
        let ratingAnswers: any[] = []
        
        if (reviewIds.length > 0) {
          // Fetch all rating-type questions for these campaigns
          const { data: ratingQuestions } = await supabase
            .from('campaign_question')
            .select('id, campaign_id')
            .in('campaign_id', campaignIds)
            .eq('question_type', 'rating')

          if (ratingQuestions && ratingQuestions.length > 0) {
            // Fetch answers for rating-type questions
            const { data: answers } = await supabase
              .from('campaign_review_answer')
              .select('answer_rating, review_id')
              .in('review_id', reviewIds)
              .in('question_id', ratingQuestions.map(q => q.id))
              .not('answer_rating', 'is', null)

            if (answers && answers.length > 0) {
              ratingAnswers = answers
              // Calculate average from campaign question answers
              const validRatings = answers
                .map(a => a.answer_rating)
                .filter((r): r is number => r !== null && r >= 1 && r <= 5)
              
              if (validRatings.length > 0) {
                averageRating = validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length
              }
            }
          }
        }

        // Fallback to star ratings if no campaign question answers found
        if (ratingAnswers.length === 0) {
          const reviewsWithStars = filteredReviews.filter((r) => r.stars)
          if (reviewsWithStars.length > 0) {
            averageRating = reviewsWithStars.reduce((sum, r) => sum + (r.stars || 0), 0) / reviewsWithStars.length
          }
        }

        // Calculate rating distribution from campaign question answers (preferred) or star ratings (fallback)
        const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        let ratingDistribution: Array<{ rating: number; count: number; percentage: number }> = []
        
        if (ratingAnswers.length > 0) {
          // Calculate distribution from campaign question answers
          ratingAnswers.forEach((answer) => {
            if (answer.answer_rating && answer.answer_rating >= 1 && answer.answer_rating <= 5) {
              ratingCounts[answer.answer_rating]++
            }
          })

          const totalAnswers = ratingAnswers.length
          ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
            rating,
            count: ratingCounts[rating],
            percentage: totalAnswers > 0 ? (ratingCounts[rating] / totalAnswers) * 100 : 0,
          }))
        }

        // Fallback to star ratings if no campaign question answers found
        if (ratingDistribution.length === 0 || ratingDistribution.every(r => r.count === 0)) {
          // Reset counts for star ratings
          const starRatingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
          const reviewsWithStars = filteredReviews.filter((r) => r.stars && r.stars >= 1 && r.stars <= 5)
          
          reviewsWithStars.forEach((r) => {
            if (r.stars && r.stars >= 1 && r.stars <= 5) {
              starRatingCounts[r.stars]++
            }
          })

          ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
            rating,
            count: starRatingCounts[rating],
            percentage: reviewsWithStars.length > 0 ? (starRatingCounts[rating] / reviewsWithStars.length) * 100 : 0,
          }))
        }

        // Calculate review trends based on timeframe
        const trendsMap: Record<string, { count: number; totalRating: number; ratingCount: number }> = {}
        
        filteredReviews.forEach((review) => {
          if (!review.created_at) return
          
          const date = new Date(review.created_at)
          let key = ''
          
          if (timeframe === 'daily') {
            key = date.toISOString().split('T')[0] // YYYY-MM-DD
          } else if (timeframe === 'weekly') {
            // Get week start (Sunday)
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay())
            key = weekStart.toISOString().split('T')[0]
          } else {
            // Monthly
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          }
          
          if (!trendsMap[key]) {
            trendsMap[key] = { count: 0, totalRating: 0, ratingCount: 0 }
          }
          
          trendsMap[key].count++
          if (review.stars) {
            trendsMap[key].totalRating += review.stars
            trendsMap[key].ratingCount++
          }
        })

        const reviewTrends = Object.entries(trendsMap)
          .map(([date, data]) => ({
            date,
            count: data.count,
            avgRating: data.ratingCount > 0 ? data.totalRating / data.ratingCount : undefined,
          }))
          .sort((a, b) => a.date.localeCompare(b.date))

        // Fetch total QR codes across all campaigns
        const { data: qrCodes } = await supabase
          .from('qr_code')
          .select('id')
          .in('campaign_id', campaignIds)
          .eq('is_active', true)

        // Get recent campaign reviews with campaign info (apply filters)
        let recentReviewsQuery = supabase
          .from('review')
          .select('*, campaign:campaign_id(name, campaign_type)')
          .in('campaign_id', campaignIds)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(10)

        if (filters.campaign) {
          recentReviewsQuery = recentReviewsQuery.eq('campaign_id', filters.campaign)
        }
        if (filters.rating !== null) {
          recentReviewsQuery = recentReviewsQuery.eq('stars', filters.rating)
        }

        const { data: recentReviews } = await recentReviewsQuery
        let finalRecentReviews = recentReviews || []
        
        // Apply search and date filters to recent reviews
        if (filters.search.trim()) {
          const searchTerm = filters.search.toLowerCase()
          finalRecentReviews = finalRecentReviews.filter((r) =>
            r.comment?.toLowerCase().includes(searchTerm)
          )
        }

        if (filters.dateRange) {
          const now = new Date()
          let startDate: Date
          
          if (filters.dateRange === '7d') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          } else if (filters.dateRange === '30d') {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          } else if (filters.dateRange === '90d') {
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          } else if (filters.dateRange === 'custom' && filters.customDateStart) {
            startDate = new Date(filters.customDateStart)
          } else {
            startDate = new Date(0)
          }

          finalRecentReviews = finalRecentReviews.filter((r) => {
            if (!r.created_at) return false
            const reviewDate = new Date(r.created_at)
            if (filters.dateRange === 'custom' && filters.customDateEnd) {
              const endDate = new Date(filters.customDateEnd)
              endDate.setHours(23, 59, 59, 999)
              return reviewDate >= startDate && reviewDate <= endDate
            }
            return reviewDate >= startDate
          })
        }

        setStats({
          total_campaigns: campaignIds.length,
          total_reviews: totalReviews,
          average_rating: averageRating,
          total_qr_codes: qrCodes?.length || 0,
          recent_reviews: finalRecentReviews.slice(0, 10),
          campaigns: campaigns || [],
          review_trends: reviewTrends,
          rating_distribution: ratingDistribution,
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [filters, timeframe])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!stats) {
    return <div>Failed to load dashboard</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Campaign Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 text-xs">Overview of all your campaigns and reviews</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowQuickCreateModal(true)}
            className="px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5 text-xs"
          >
            <FaPlus />
            Quick Create
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="px-2 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1.5 text-xs"
            >
              <FaDownload />
              Export Reviews
              <FaChevronDown className="w-2.5 h-2.5" />
            </button>
            {showExportDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExportDropdown(false)}
                />
                <div className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                  <button
                    onClick={() => handleExportReviews('csv')}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1.5 rounded-t-lg"
                  >
                    <FaFileCsv />
                    Export as CSV
                  </button>
                  <button
                    onClick={() => handleExportReviews('pdf')}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1.5 rounded-b-lg"
                  >
                    <FaFilePdf />
                    Export as PDF
                  </button>
                </div>
              </>
            )}
          </div>
          <Link
            href="/dashboard/events"
            className="px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-xs"
          >
            <FaCalendar />
            Manage Campaigns
          </Link>
        </div>
      </div>

      {/* Review Filters */}
      {stats.campaigns && stats.campaigns.length > 0 && (
        <ReviewFilters
          filters={filters}
          campaigns={stats.campaigns}
          onFiltersChange={setFilters}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 mb-3">
        <StatsCard
          title="Total Campaigns"
          value={stats.total_campaigns}
          icon={<FaCalendar className="w-6 h-6" />}
          href="/dashboard/events"
        />
        <StatsCard
          title="Total Reviews"
          value={stats.total_reviews}
          icon={<FaComments className="w-6 h-6" />}
        />
        <StatsCard
          title="Average Rating"
          value={stats.average_rating.toFixed(1)}
          icon={<FaStar className="w-6 h-6" />}
          subtitle="/ 5.0"
        />
        <StatsCard
          title="QR Codes"
          value={stats.total_qr_codes}
          icon={<FaQrcode className="w-6 h-6" />}
        />
      </div>

      {/* Charts Section */}
      {stats.total_reviews > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">Review Trends</h2>
            <ReviewTrendsChart
              data={stats.review_trends}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
            />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">Rating Distribution</h2>
            {stats.rating_distribution && stats.rating_distribution.some(r => r.count > 0) ? (
              <RatingDistributionChart data={stats.rating_distribution} />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
                <p className="mb-1 text-sm">No star ratings available</p>
                <p className="text-xs text-center">Reviews for this campaign use custom questions instead of star ratings.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        {/* Recent Campaign Reviews */}
        {stats.recent_reviews && stats.recent_reviews.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Recent Reviews</h2>
              <Link
                href="/dashboard/events"
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                View All
              </Link>
            </div>
            <div className="space-y-2">
              {stats.recent_reviews.slice(0, 5).map((review: any) => (
                <div
                  key={review.id}
                  className="border-b dark:border-gray-700 pb-2 last:border-0"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {review.campaign?.name || 'Campaign'}
                      </span>
                      {review.campaign?.campaign_type && (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded capitalize">
                          {review.campaign.campaign_type}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {review.stars && (
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span
                              key={n}
                              className={`text-xs ${review.stars >= n ? 'text-yellow-400' : 'text-gray-300'}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-gray-700 dark:text-gray-300 text-xs line-clamp-2">{review.comment}</p>
                  )}
                  {review.tags && review.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1.5">
                      {review.tags.map((tag: string, i: number) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaigns List */}
        {stats.campaigns && stats.campaigns.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Your Campaigns</h2>
              <Link
                href="/dashboard/events"
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                View All
              </Link>
            </div>
            <div className="space-y-1.5">
              {stats.campaigns.slice(0, 5).map((campaign: any) => (
                <Link
                  key={campaign.id}
                  href={`/dashboard/events/${campaign.id}`}
                  className="block p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{campaign.name}</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">→</span>
                  </div>
                </Link>
              ))}
            </div>
            {stats.campaigns.length > 5 && (
              <Link
                href="/dashboard/events"
                className="block text-center mt-3 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                View {stats.campaigns.length - 5} more campaigns
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Empty State */}
      {stats.total_campaigns === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
          <FaCalendar className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">No Campaigns Yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-3 text-xs">
            Create your first campaign to start collecting reviews
          </p>
          <Link
            href="/dashboard/events"
            className="inline-block px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs"
          >
            Create Campaign
          </Link>
        </div>
      )}

      {/* Quick Create Campaign Modal */}
      <QuickCreateCampaignModal
        isOpen={showQuickCreateModal}
        onClose={() => setShowQuickCreateModal(false)}
        onSuccess={() => {
          setShowQuickCreateModal(false)
          // Refresh stats by re-fetching
          setLoading(true)
          // Trigger useEffect to refetch
          setFilters({ ...filters })
        }}
      />
    </div>
  )
}

