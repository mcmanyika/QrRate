'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SignupForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [completingProfile, setCompletingProfile] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    // Check if user is already logged in and just needs to complete profile
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && searchParams?.get('complete') === 'true') {
        setCompletingProfile(true)
        setEmail(user.email || '')
        // Try to get existing business data if any
        const { data: business } = await supabase
          .from('business')
          .select('*')
          .eq('owner_id', user.id)
          .limit(1)
          .maybeSingle()
        if (business) {
          setName(business.name || '')
          setPhone(business.phone || '')
        }
      }
    }
    checkUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (completingProfile) {
        // User is already logged in, just create business profile
        console.log('Starting profile completion...')
        
        if (!name || name.trim() === '') {
          setError('Please enter your name')
          setLoading(false)
          return
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('Error getting user:', userError)
          setError('Please log in first')
          setLoading(false)
          return
        }

        if (!user) {
          setError('Please log in first')
          setLoading(false)
          return
        }

        console.log('User authenticated:', user.id)

        // Check if business already exists (user might have multiple businesses)
        const { data: existingBusinesses, error: checkError } = await supabase
          .from('business')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1)

        if (checkError) {
          console.error('Error checking existing business:', checkError)
        }

        if (existingBusinesses && existingBusinesses.length > 0) {
          // Business already exists, just redirect
          console.log('Business already exists, redirecting...')
          setLoading(false)
          window.location.href = '/dashboard'
          return
        }

        console.log('Creating new business with data:', {
          owner_id: user.id,
          name,
          email: user.email || email,
          phone: phone || null,
          category: 'other',
        })

        // Create new business
        const { data: newBusiness, error: businessError } = await supabase
          .from('business')
          .insert({
            owner_id: user.id,
            name: name.trim(),
            email: user.email || email,
            phone: phone?.trim() || null,
            category: 'other',
          })
          .select()
          .single()

        if (businessError) {
          console.error('Business creation error:', businessError)
          console.error('Error details:', JSON.stringify(businessError, null, 2))
          setError(businessError.message || 'Failed to create business profile. Please try again.')
          setLoading(false)
          return
        }

        if (!newBusiness) {
          console.error('No business returned from insert')
          setError('Failed to create business profile. Please try again.')
          setLoading(false)
          return
        }

        console.log('Business created successfully:', newBusiness)
        // Successfully created business, redirect to dashboard immediately
        // Don't set loading to false here - let the redirect happen
        window.location.href = '/dashboard'
        return
      } else {
        // New signup - create user and business
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            name,
            phone: phone || null,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Failed to create account')
          setLoading(false)
          return
        }

        // Sign in the user after successful signup
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          setError('Account created but failed to sign in. Please try logging in.')
          setLoading(false)
          return
        }

        // Wait a bit for session to be established, then redirect
        await new Promise(resolve => setTimeout(resolve, 100))
        router.push('/dashboard')
      }
    } catch (err) {
      console.error('Unexpected error in handleSubmit:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Full Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={completingProfile}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number (Optional)
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {!completingProfile && (
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading 
          ? (completingProfile ? 'Completing profile...' : 'Creating account...') 
          : (completingProfile ? 'Complete Profile' : 'Sign Up')}
      </button>
    </form>
  )
}

