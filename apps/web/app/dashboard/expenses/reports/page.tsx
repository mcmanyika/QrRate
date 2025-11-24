'use client'

import { useEffect, useState } from 'react'

interface Vehicle {
  id: string
  reg_number: string
}

interface ReportData {
  group_by: string
  data: any
  summary: {
    total: number
    count: number
  }
}

export default function ExpenseReportsPage() {
  const [loading, setLoading] = useState(false)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    vehicle_id: '',
    category: '',
    group_by: 'none' as 'none' | 'vehicle' | 'category' | 'month',
  })

  useEffect(() => {
    fetchVehicles()
  }, [])

  async function fetchVehicles() {
    try {
      const response = await fetch('/api/transporter/vehicles?limit=1000')
      if (response.ok) {
        const result = await response.json()
        setVehicles(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch vehicles:', error)
    }
  }

  async function generateReport() {
    if (!filters.date_from || !filters.date_to) {
      alert('Please select date range')
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        date_from: filters.date_from,
        date_to: filters.date_to,
        group_by: filters.group_by,
      })
      if (filters.vehicle_id) params.append('vehicle_id', filters.vehicle_id)
      if (filters.category) params.append('category', filters.category)

      const response = await fetch(`/api/transporter/expenses/reports?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to generate report')
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
      alert('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  function exportToCSV() {
    if (!reportData) return

    let csv = ''
    if (filters.group_by === 'vehicle') {
      csv = 'Vehicle,Total Amount,Count\n'
      ;(reportData.data as any[]).forEach((item: any) => {
        csv += `${item.vehicle_reg_number || 'Unknown'},${item.total},${item.count}\n`
      })
    } else if (filters.group_by === 'category') {
      csv = 'Category,Total Amount,Count\n'
      ;(reportData.data as any[]).forEach((item: any) => {
        csv += `${item.category},${item.total},${item.count}\n`
      })
    } else if (filters.group_by === 'month') {
      csv = 'Month,Total Amount,Count\n'
      ;(reportData.data as any[]).forEach((item: any) => {
        csv += `${item.month_name},${item.total},${item.count}\n`
      })
    } else {
      csv = 'Total Expenses,Count\n'
      csv += `${reportData.summary.total},${reportData.summary.count}\n`
    }

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expense-report-${filters.date_from}-to-${filters.date_to}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  function getCategoryLabel(category: string) {
    const labels: Record<string, string> = {
      fuel: 'Fuel',
      maintenance: 'Maintenance',
      insurance: 'Insurance',
      staff_payment: 'Staff Payment',
      service_provider_payment: 'Service Provider Payment',
      other: 'Other',
    }
    return labels[category] || category
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Expense Reports</h1>
        {reportData && (
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
          >
            Export to CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Report Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date From *
            </label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date To *
            </label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Group By
            </label>
            <select
              value={filters.group_by}
              onChange={(e) => setFilters({ ...filters, group_by: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="none">No Grouping</option>
              <option value="vehicle">By Vehicle</option>
              <option value="category">By Category</option>
              <option value="month">By Month</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Vehicle (Optional)
            </label>
            <select
              value={filters.vehicle_id}
              onChange={(e) => setFilters({ ...filters, vehicle_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.reg_number}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category (Optional)
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">All Categories</option>
              <option value="fuel">Fuel</option>
              <option value="maintenance">Maintenance</option>
              <option value="insurance">Insurance</option>
              <option value="staff_payment">Staff Payment</option>
              <option value="service_provider_payment">Service Provider Payment</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={generateReport}
            disabled={loading || !filters.date_from || !filters.date_to}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Report Results */}
      {reportData && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Report Results</h3>
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Expenses: </span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  ${reportData.summary.total.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Count: </span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {reportData.summary.count}
                </span>
              </div>
            </div>
          </div>

          {Array.isArray(reportData.data) && reportData.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {filters.group_by === 'vehicle' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Vehicle
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Total Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Count
                        </th>
                      </>
                    )}
                    {filters.group_by === 'category' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Total Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Count
                        </th>
                      </>
                    )}
                    {filters.group_by === 'month' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Month
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Total Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Count
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {reportData.data.map((item: any, index: number) => (
                    <tr key={index}>
                      {filters.group_by === 'vehicle' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                            {item.vehicle_reg_number || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            ${item.total.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {item.count}
                          </td>
                        </>
                      )}
                      {filters.group_by === 'category' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                            {getCategoryLabel(item.category)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            ${item.total.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {item.count}
                          </td>
                        </>
                      )}
                      {filters.group_by === 'month' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                            {item.month_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            ${item.total.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {item.count}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : filters.group_by === 'none' ? (
            <p className="text-gray-500 dark:text-gray-400">No expenses found for the selected period.</p>
          ) : null}
        </div>
      )}
    </div>
  )
}

