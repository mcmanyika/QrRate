'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface ExpenseBreakdownData {
  category: string
  amount: number
}

interface ExpenseBreakdownChartProps {
  data: ExpenseBreakdownData[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1']

function getCategoryLabel(category: string): string {
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

export default function ExpenseBreakdownChart({ data }: ExpenseBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No expense data available
      </div>
    )
  }

  const chartData = data.map((item) => ({
    name: getCategoryLabel(item.category),
    value: item.amount,
  }))

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const percentage = ((data.value / total) * 100).toFixed(1)
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg" style={{ backgroundColor: 'white' }}>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ${data.value.toFixed(2)} ({percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
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
      </PieChart>
    </ResponsiveContainer>
  )
}

