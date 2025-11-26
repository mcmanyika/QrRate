'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ExpensesVsTipsChartProps {
  expenses: number
  tips: number
}

export default function ExpensesVsTipsChart({ expenses, tips }: ExpensesVsTipsChartProps) {
  const data = [
    {
      name: 'Monthly',
      Expenses: expenses,
      Tips: tips,
    },
  ]

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg" style={{ backgroundColor: 'white' }}>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-semibold">{entry.name}:</span> ${entry.value.toFixed(2)}
            </p>
          ))}
          <p className="text-sm mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="font-semibold text-gray-900 dark:text-gray-100">Net:</span>{' '}
            <span className={tips - expenses >= 0 ? 'text-green-600' : 'text-red-600'}>
              ${(tips - expenses).toFixed(2)}
            </span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
        <XAxis
          dataKey="name"
          stroke="#6b7280"
          className="dark:stroke-gray-400"
          tick={{ fill: '#6b7280' }}
          style={{ fill: '#6b7280' }}
        />
        <YAxis
          stroke="#6b7280"
          className="dark:stroke-gray-400"
          tick={{ fill: '#6b7280' }}
          tickFormatter={(value) => `$${value.toFixed(0)}`}
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
        <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Tips" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

