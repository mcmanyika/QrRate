'use client'

import { useEffect, useState } from 'react'
import Pagination from '@/components/dashboard/Pagination'

interface Tip {
  id: string
  amount_cents: number
  operator_amount_cents: number
  created_at: string
  vehicle?: {
    reg_number: string
  } | null
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function TipsPage() {
  const [tips, setTips] = useState<Tip[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 4,
    total: 0,
    totalPages: 0,
  })
  const [totalEarnings, setTotalEarnings] = useState(0)

  useEffect(() => {
    async function fetchTips() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '4',
        })
        const response = await fetch(`/api/transporter/tips?${params}`)
        if (response.ok) {
          const result = await response.json()
          const tipsData = result.data || []
          setTips(tipsData)
          setPagination(result.pagination || pagination)
          setTotalEarnings(result.totalEarnings || 0)
        }
      } catch (error) {
        console.error('Failed to fetch tips:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTips()
  }, [currentPage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Tips</h1>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2 dark:text-gray-100">Total Earnings</h2>
        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
          ${(totalEarnings / 100).toFixed(2)}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {pagination.total} tip{pagination.total !== 1 ? 's' : ''} received
        </p>
      </div>

      {tips.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No tips received yet</p>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {tips.map((tip) => (
              <div key={tip.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      ${((tip.operator_amount_cents || 0) / 100).toFixed(2)}
                    </p>
                    {tip.vehicle && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Vehicle: {tip.vehicle.reg_number}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(tip.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
          />
        </>
      )}
    </div>
  )
}

