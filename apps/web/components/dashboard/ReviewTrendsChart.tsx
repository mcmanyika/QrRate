'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { FaCalendar, FaCalendarAlt } from 'react-icons/fa'

interface ReviewTrendData {
  date: string // ISO date string
  count: number
  avgRating?: number // Optional
}

interface ReviewTrendsChartProps {
  data: ReviewTrendData[]
  timeframe?: 'daily' | 'weekly' | 'monthly'
  onTimeframeChange?: (timeframe: 'daily' | 'weekly' | 'monthly') => void
}

export default function ReviewTrendsChart({ data, timeframe = 'daily', onTimeframeChange }: ReviewTrendsChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'daily' | 'weekly' | 'monthly'>(timeframe)

  const handleTimeframeChange = (newTimeframe: 'daily' | 'weekly' | 'monthly') => {
    setSelectedTimeframe(newTimeframe)
    if (onTimeframeChange) {
      onTimeframeChange(newTimeframe)
    }
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No review data available
      </div>
    )
  }

  // Format dates for display based on timeframe
  const chartData = data.map((item) => {
    const date = new Date(item.date)
    let formattedDate: string
    
    if (selectedTimeframe === 'daily') {
      formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else if (selectedTimeframe === 'weekly') {
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      formattedDate = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else {
      formattedDate = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }

    return {
      date: formattedDate,
      fullDate: item.date,
      count: item.count,
      avgRating: item.avgRating ? Number(item.avgRating.toFixed(1)) : undefined,
    }
  })

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {new Date(data.fullDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Reviews: <span className="font-semibold">{data.count}</span>
          </p>
          {data.avgRating !== undefined && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Avg Rating: <span className="font-semibold">{data.avgRating}</span>
            </p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div>
      {/* Timeframe Toggle */}
      <div className="flex justify-end mb-4 gap-2">
        <button
          onClick={() => handleTimeframeChange('daily')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            selectedTimeframe === 'daily'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <FaCalendar className="w-3 h-3" />
          Daily
        </button>
        <button
          onClick={() => handleTimeframeChange('weekly')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            selectedTimeframe === 'weekly'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <FaCalendar className="w-3 h-3" />
          Weekly
        </button>
        <button
          onClick={() => handleTimeframeChange('monthly')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            selectedTimeframe === 'monthly'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <FaCalendarAlt className="w-3 h-3" />
          Monthly
        </button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            className="dark:stroke-gray-400"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="#6b7280"
            className="dark:stroke-gray-400"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            label={{ value: 'Review Count', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
          />
          <Tooltip 
            content={<CustomTooltip />} 
            contentStyle={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}
            wrapperStyle={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}
            itemStyle={{ backgroundColor: 'transparent' }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(value) => <span className="text-gray-700 dark:text-gray-300">{value}</span>}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#6b7280"
            strokeWidth={2}
            dot={{ fill: '#6b7280', r: 4 }}
            activeDot={{ r: 6, fill: '#4b5563' }}
            name="Review Count"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
