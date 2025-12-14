'use client'

import { FaFilter, FaTimes } from 'react-icons/fa'

interface Filters {
  rating: number | null
  campaign: string | null
  dateRange: '7d' | '30d' | '90d' | 'custom' | null
  customDateStart: string | null
  customDateEnd: string | null
  search: string
}

interface ReviewFiltersProps {
  filters: Filters
  campaigns: Array<{ id: string; name: string }>
  onFiltersChange: (filters: Filters) => void
}

export default function ReviewFilters({ filters, campaigns, onFiltersChange }: ReviewFiltersProps) {
  const activeFilterCount = [
    filters.rating !== null,
    filters.campaign !== null,
    filters.dateRange !== null,
    filters.search.trim() !== '',
  ].filter(Boolean).length

  const handleFilterChange = (key: keyof Filters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({
      rating: null,
      campaign: null,
      dateRange: null,
      customDateStart: null,
      customDateEnd: null,
      search: '',
    })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FaFilter className="text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1"
          >
            <FaTimes className="w-3 h-3" />
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rating Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Rating
          </label>
          <select
            value={filters.rating !== null ? filters.rating : ''}
            onChange={(e) => handleFilterChange('rating', e.target.value === '' ? null : parseInt(e.target.value))}
            className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>

        {/* Campaign Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Campaign
          </label>
          <select
            value={filters.campaign || ''}
            onChange={(e) => handleFilterChange('campaign', e.target.value === '' ? null : e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
          >
            <option value="">All Campaigns</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date Range
          </label>
          <select
            value={filters.dateRange || ''}
            onChange={(e) => {
              const value = e.target.value === '' ? null : e.target.value as '7d' | '30d' | '90d' | 'custom'
              handleFilterChange('dateRange', value)
              if (value !== 'custom') {
                handleFilterChange('customDateStart', null)
                handleFilterChange('customDateEnd', null)
              }
            }}
            className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
          >
            <option value="">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Search Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Search comments..."
            className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
          />
        </div>
      </div>

      {/* Custom Date Range Inputs */}
      {filters.dateRange === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.customDateStart || ''}
              onChange={(e) => handleFilterChange('customDateStart', e.target.value || null)}
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.customDateEnd || ''}
              onChange={(e) => handleFilterChange('customDateEnd', e.target.value || null)}
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
