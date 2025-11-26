'use client'

import { useEffect, useState } from 'react'
import PackageCard from '@/components/dashboard/PackageCard'
import LoadingSpinner from '@/components/LoadingSpinner'
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

interface CurrentSubscription {
  plan_id: string
  plan_name: string
  status: string
}

export default function PackagesPage() {
  const [plans, setPlans] = useState<PackagePlan[]>([])
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlans()
    fetchCurrentSubscription()
  }, [])

  async function fetchPlans() {
    try {
      const response = await fetch('/api/transporter/subscription/plans')
      if (response.ok) {
        const data = await response.json()
        setPlans(data)
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCurrentSubscription() {
    try {
      const response = await fetch('/api/transporter/subscription')
      if (response.ok) {
        const data = await response.json()
        setCurrentSubscription(data)
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    }
  }

  const handleSelectPlan = (planName: string) => {
    // For now, just show an alert. In the future, this will integrate with Stripe
    alert(`Subscription selection coming soon! You selected the ${planName} plan.`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const featureComparison = [
    { name: 'Max Vehicles', free: '3', pro: '20', enterprise: 'Unlimited' },
    { name: 'Max Staff', free: '10', pro: '100', enterprise: 'Unlimited' },
    { name: 'Max Expenses/Month', free: '100', pro: '1,000', enterprise: 'Unlimited' },
    { name: 'Advanced Analytics', free: false, pro: true, enterprise: true },
    { name: 'API Access', free: false, pro: false, enterprise: true },
    { name: 'White-label Options', free: false, pro: false, enterprise: true },
    { name: 'Priority Support', free: false, pro: true, enterprise: true },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Subscription Packages
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Choose the plan that best fits your fleet management needs
        </p>
      </div>

      {/* Current Subscription Status */}
      {currentSubscription && (
        <div className="mb-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Current Plan: {currentSubscription.plan_name.charAt(0).toUpperCase() + currentSubscription.plan_name.slice(1)}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Status: <span className="font-medium capitalize">{currentSubscription.status}</span>
              </p>
            </div>
            <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg font-semibold">
              Active
            </div>
          </div>
        </div>
      )}

      {/* Package Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {plans.map((plan) => (
          <PackageCard
            key={plan.id}
            plan={plan}
            isCurrent={currentSubscription?.plan_name === plan.name}
            onSelect={() => handleSelectPlan(plan.display_name)}
          />
        ))}
      </div>

      {/* Feature Comparison Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Feature Comparison
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Compare features across all plans
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Feature
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Free
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Pro
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Enterprise
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {featureComparison.map((feature, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {feature.name}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {typeof feature.free === 'boolean' ? (
                      feature.free ? (
                        <FaCheck className="w-5 h-5 text-gray-600 dark:text-gray-400 mx-auto" />
                      ) : (
                        <FaTimes className="w-5 h-5 text-gray-400 dark:text-gray-600 mx-auto" />
                      )
                    ) : (
                      <span className="text-sm text-gray-700 dark:text-gray-300">{feature.free}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {typeof feature.pro === 'boolean' ? (
                      feature.pro ? (
                        <FaCheck className="w-5 h-5 text-gray-600 dark:text-gray-400 mx-auto" />
                      ) : (
                        <FaTimes className="w-5 h-5 text-gray-400 dark:text-gray-600 mx-auto" />
                      )
                    ) : (
                      <span className="text-sm text-gray-700 dark:text-gray-300">{feature.pro}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {typeof feature.enterprise === 'boolean' ? (
                      feature.enterprise ? (
                        <FaCheck className="w-5 h-5 text-gray-600 dark:text-gray-400 mx-auto" />
                      ) : (
                        <FaTimes className="w-5 h-5 text-gray-400 dark:text-gray-600 mx-auto" />
                      )
                    ) : (
                      <span className="text-sm text-gray-700 dark:text-gray-300">{feature.enterprise}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <strong>Note:</strong> Subscription management and payment processing will be available soon. For now, all transporters are on the Free plan.
        </p>
      </div>
    </div>
  )
}

