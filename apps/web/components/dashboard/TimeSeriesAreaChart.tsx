'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TimeSeriesData {
  date: string
  reviewCount: number
  avgRating: number
  responseRate: number
}

interface TimeSeriesAreaChartProps {
  data: TimeSeriesData[]
}

export default function TimeSeriesAreaChart({ data }: TimeSeriesAreaChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No time series data available
      </div>
    )
  }

  // Format dates for display
  const chartData = data.map(item => {
    const date = new Date(item.date)
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: item.date,
      reviews: item.reviewCount,
      rating: Number(item.avgRating.toFixed(1)),
      responseRate: Number(item.responseRate.toFixed(1)),
    }
  })

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {new Date(data.fullDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs text-gray-600 dark:text-gray-400">
              <span style={{ color: entry.color }}>{entry.name}:</span>{' '}
              <span className="font-semibold">{entry.value}{entry.dataKey === 'rating' ? '★' : entry.dataKey === 'responseRate' ? '%' : ''}</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 40 }}>
        <defs>
          <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4b5563" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#4b5563" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6b7280" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#6b7280" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorResponseRate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#9ca3af" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          className="dark:stroke-gray-400"
          tick={{ fill: '#6b7280', fontSize: 11 }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          yAxisId="left"
          stroke="#6b7280"
          className="dark:stroke-gray-400"
          tick={{ fill: '#6b7280', fontSize: 11 }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#6b7280"
          className="dark:stroke-gray-400"
          tick={{ fill: '#6b7280', fontSize: 11 }}
          domain={[0, 100]}
        />
        <Tooltip 
          content={<CustomTooltip />} 
          contentStyle={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}
        />
        <Legend 
          wrapperStyle={{ fontSize: '11px' }}
          formatter={(value) => <span className="text-gray-700 dark:text-gray-300">{value}</span>}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="reviews"
          stroke="#4b5563"
          fillOpacity={1}
          fill="url(#colorReviews)"
          name="Review Count"
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="rating"
          stroke="#6b7280"
          fillOpacity={1}
          fill="url(#colorRating)"
          name="Avg Rating"
        />
        <Area
          yAxisId="right"
          type="monotone"
          dataKey="responseRate"
          stroke="#9ca3af"
          fillOpacity={1}
          fill="url(#colorResponseRate)"
          name="Response Rate %"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

