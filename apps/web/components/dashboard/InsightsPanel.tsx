'use client'

import { FaExclamationTriangle, FaLightbulb, FaCheckCircle } from 'react-icons/fa'

interface Insight {
  type: 'highlight' | 'alert' | 'recommendation'
  title: string
  message: string
  priority: 'high' | 'medium' | 'low'
}

interface InsightsPanelProps {
  insights: Insight[]
}

export default function InsightsPanel({ insights }: InsightsPanelProps) {
  if (!insights || insights.length === 0) {
    return null
  }

  const getIcon = (type: Insight['type']) => {
    switch (type) {
      case 'highlight':
        return <FaCheckCircle className="w-4 h-4" />
      case 'alert':
        return <FaExclamationTriangle className="w-4 h-4" />
      case 'recommendation':
        return <FaLightbulb className="w-4 h-4" />
      default:
        return null
    }
  }

  const getColorClasses = (type: Insight['type'], priority: Insight['priority']) => {
    if (type === 'highlight') {
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        icon: 'text-green-600 dark:text-green-400',
        title: 'text-green-900 dark:text-green-100',
      }
    }
    if (type === 'alert') {
      const isHigh = priority === 'high'
      return {
        bg: isHigh ? 'bg-red-50 dark:bg-red-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20',
        border: isHigh ? 'border-red-200 dark:border-red-800' : 'border-yellow-200 dark:border-yellow-800',
        icon: isHigh ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400',
        title: isHigh ? 'text-red-900 dark:text-red-100' : 'text-yellow-900 dark:text-yellow-100',
      }
    }
    // recommendation
    return {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      title: 'text-blue-900 dark:text-blue-100',
    }
  }

  // Sort insights by priority and type
  const sortedInsights = [...insights].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    const typeOrder = { alert: 0, recommendation: 1, highlight: 2 }
    
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    return typeOrder[a.type] - typeOrder[b.type]
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3">
      <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">Insights & Recommendations</h2>
      <div className="space-y-2">
        {sortedInsights.map((insight, index) => {
          const colors = getColorClasses(insight.type, insight.priority)
          return (
            <div
              key={index}
              className={`${colors.bg} ${colors.border} border rounded-lg p-2.5 flex gap-2`}
            >
              <div className={`${colors.icon} flex-shrink-0 mt-0.5`}>
                {getIcon(insight.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`${colors.title} font-semibold text-sm mb-0.5`}>
                  {insight.title}
                </h3>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  {insight.message}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

