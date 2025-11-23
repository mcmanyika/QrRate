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
      if (user && searchParams.get('complete') === 'true') {
        setCompletingProfile(true)
        setEmail(user.email || '')
        // Try to get existing transporter data if any
        const { data: transporter } = await supabase
          .from('transporter')
          .select('*')
          .eq('user_id', user.id)
          .single()
        if (transporter) {
          setName(transporter.name || '')
          setPhone(transporter.phone || '')
        }
      }
    }
    checkUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (completingProfile) {
        // User is already logged in, just create transporter profile
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Please log in first')
          setLoading(false)
          return
        }

        const { error: transporterError } = await supabase
          .from('transporter')
          .insert({
            user_id: user.id,
            name,
            email: user.email || email,
            phone: phone || null,
          })

        if (transporterError) {
          setError(transporterError.message)
          setLoading(false)
          return
        }

        window.location.href = '/dashboard'
      } else {
        // New signup - create user and transporter
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
        window.location.href = '/dashboard'
      }
    } catch (err) {
      setError('An unexpected error occurred')
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

