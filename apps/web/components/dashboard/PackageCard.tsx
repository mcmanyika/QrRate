'use client'

import { FaCheck, FaTimes } from 'react-icons/fa'

interface PackagePlan {
  id: string
  name: string
  display_name: string
  price_monthly_cents: number
  price_yearly_cents: number
  features: string[]
  max_vehicles: number | null
  max_staff: number | null
  max_expenses_per_month: number | null
  has_advanced_analytics: boolean
  has_api_access: boolean
  has_white_label: boolean
  has_priority_support: boolean
}

interface PackageCardProps {
  plan: PackagePlan
  isCurrent?: boolean
  onSelect?: () => void
}

export default function PackageCard({ plan, isCurrent = false, onSelect }: PackageCardProps) {
  const monthlyPrice = plan.price_monthly_cents / 100

  return (
    <div
      className={`relative bg-white dark:bg-gray-800 border-2 ${
        isCurrent ? 'border-gray-900 dark:border-gray-300' : 'border-gray-200 dark:border-gray-700'
      } rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col h-full ${
        isCurrent ? 'ring-1 ring-gray-900 dark:ring-gray-300' : ''
      }`}
    >
      {isCurrent && (
        <div className="absolute top-4 right-4">
          <span className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-semibold px-3 py-1 rounded-full">
            Current Plan
          </span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 p-6 text-center">
        <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">{plan.display_name}</h3>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">
            {monthlyPrice === 0 ? 'Free' : `$${monthlyPrice}`}
          </span>
          {monthlyPrice > 0 && <span className="text-lg text-gray-600 dark:text-gray-400">/month</span>}
        </div>
      </div>

      {/* Features */}
      <div className="p-6 flex flex-col flex-grow">
        <ul className="space-y-3 mb-6">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <FaCheck className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
            </li>
          ))}
        </ul>

        {/* Limits */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6 space-y-2">
          {plan.max_vehicles !== null && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Max Vehicles:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {plan.max_vehicles}
              </span>
            </div>
          )}
          {plan.max_vehicles === null && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Max Vehicles:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">Unlimited</span>
            </div>
          )}
          {plan.max_staff !== null && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Max Staff:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{plan.max_staff}</span>
            </div>
          )}
          {plan.max_staff === null && plan.name !== 'free' && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Max Staff:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">Unlimited</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-auto">
          <button
            onClick={onSelect}
            disabled={isCurrent}
            className="w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-3 px-4 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-900 dark:disabled:hover:bg-gray-100"
          >
            {isCurrent ? 'Current Plan' : plan.name === 'free' ? 'Select Plan' : 'Upgrade'}
          </button>
        </div>
      </div>
    </div>
  )
}

