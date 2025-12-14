'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { FaCheck, FaQrcode, FaChartLine, FaUsers, FaHeadset, FaArrowLeft } from 'react-icons/fa'
import PaymentModal from '@/components/stripe/PaymentModal'

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      '1 Campaign',
      'Unlimited QR Codes',
      'Basic Analytics',
      'Email Support',
    ],
    cta: 'Get Started',
    ctaLink: '/auth/signup',
    popular: false,
    priceId: null,
    amount: 0,
  },
  {
    name: 'Pro',
    price: '$29',
    period: 'month',
    description: 'For growing businesses',
    features: [
      'Unlimited Campaigns',
      'Unlimited QR Codes',
      'Advanced Analytics',
      'Custom Questions',
      'Priority Support',
      'Export Reviews',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/auth/signup',
    popular: true,
    priceId: null,
    amount: 29, // Monthly amount in USD
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    features: [
      'Everything in Pro',
      'Dedicated Account Manager',
      'Custom Integrations',
      'SLA Guarantee',
      'Onboarding Support',
      'Custom Branding',
    ],
    cta: 'Contact Sales',
    ctaLink: '/contact',
    popular: false,
    priceId: null,
    amount: 0,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<typeof pricingPlans[0] | null>(null)

  useEffect(() => {
    async function fetchUser() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Failed to fetch user:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()

    // Listen for auth changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function handleCheckout(plan: typeof pricingPlans[0]) {
    // Free plan - redirect to dashboard or signup
    if (plan.name === 'Free') {
      if (user) {
        window.location.href = '/dashboard/events'
      } else {
        window.location.href = plan.ctaLink
      }
      return
    }

    // Enterprise - redirect to contact
    if (plan.name === 'Enterprise') {
      window.location.href = plan.ctaLink
      return
    }

    // Pro plan - show payment modal
    if (plan.name === 'Pro') {
      if (!user) {
        // Redirect to signup first
        window.location.href = '/auth/signup'
        return
      }

      setSelectedPlan(plan)
      setShowPaymentModal(true)
      return
    }
  }

  function handlePaymentSuccess() {
    setShowPaymentModal(false)
    setSelectedPlan(null)
    // Redirect to dashboard with success message
    window.location.href = '/dashboard?subscription=success'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
        >
          <FaArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Choose the perfect plan for your business. All plans include our core features.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-10">
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 relative ${
                plan.popular
                  ? 'border-2 border-blue-500 transform scale-105'
                  : 'border border-gray-200 dark:border-gray-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-blue-500 text-white px-3 py-0.5 rounded-full text-xs font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center mb-3">
                  <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-gray-600 dark:text-gray-400 ml-1 text-sm">
                      /{plan.period}
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <FaCheck className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan)}
                disabled={processing === plan.name}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {processing === plan.name
                  ? 'Processing...'
                  : plan.name === 'Enterprise'
                  ? plan.cta
                  : user && plan.name === 'Free'
                  ? 'Go to Dashboard'
                  : plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Features Section */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-8">
            All Plans Include
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <FaQrcode className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                QR Code Generation
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Generate unlimited QR codes for your campaigns with custom branding.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <FaChartLine className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Real-time Analytics
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Track reviews, ratings, and engagement in real-time with detailed insights.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <FaUsers className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Team Collaboration
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Invite team members and manage access with role-based permissions.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <FaHeadset className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Customer Support
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Get help when you need it with our responsive customer support team.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-5">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Can I change plans later?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                We accept all major credit cards and PayPal. Enterprise plans can be invoiced.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes! All paid plans come with a 14-day free trial. No credit card required.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {selectedPlan && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedPlan(null)
          }}
          amount={selectedPlan.amount || 0}
          planName={selectedPlan.name}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}

