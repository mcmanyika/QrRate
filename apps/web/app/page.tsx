'use client'

import { useCallback, useState, useEffect } from 'react'
import { FaStore, FaStar, FaChartBar, FaQrcode, FaCamera, FaChartLine, FaAward, FaImages } from 'react-icons/fa'
import { createClient } from '@/lib/supabase/client'

// Android APK download URL
const ANDROID_DOWNLOAD_URL = 'https://expo.dev/artifacts/eas/gui5qGWGoSptoNxBcgJ7UF.apk';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSubmitting, setEmailSubmitting] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  // Check if user is logged in
  useEffect(() => {
    const supabase = createClient()
    
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
    }
    
    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Track download and then redirect to download URL
  const trackDownload = useCallback(async (platform: 'ios' | 'android', downloadUrl: string) => {
    // Track download via API route (captures IP address)
    fetch('/api/track-download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ platform }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const error = await response.json();
          console.error('Failed to track download:', error);
        } else {
          const data = await response.json();
          console.log('Download tracked successfully:', data);
        }
      })
      .catch((error) => {
        // Log error but don't block download
        console.error('Failed to track download:', error);
      });

    // Immediately redirect to download URL
    if (platform === 'android') {
      window.location.href = downloadUrl;
    } else {
      // iOS download - placeholder for now
      // Replace with actual App Store URL when available
      window.open('#', '_blank');
    }
  }, []);

  const handleIOSDownload = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    trackDownload('ios', '#');
  }, [trackDownload]);

  const handleAndroidDownload = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    trackDownload('android', ANDROID_DOWNLOAD_URL);
  }, [trackDownload]);
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden transition-colors duration-200">
      {/* Animated background elements */}
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-10 md:py-14 relative z-10">
        <div className="text-center max-w-4xl mx-auto animate-fade-in">
          <div className="text-6xl md:text-8xl mb-2 animate-float inline-block text-gray-700 dark:text-gray-300">
            <FaQrcode className="w-24 h-24 md:w-32 md:h-32 mx-auto" />
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-2 gradient-text animate-slide-up tracking-tight">
            QrRate
          </h1>
          <p className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2 animate-slide-up tracking-tight" style={{ animationDelay: '0.2s' }}>
            Review businesses instantly
          </p>
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 mb-3 max-w-2xl mx-auto leading-tight tracking-tight animate-slide-up" style={{ animationDelay: '0.4s' }}>
            Scan QR codes to instantly review any business, product or event. Help others support and make informed decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center items-center animate-scale-in mt-6" style={{ animationDelay: '0.6s' }}>
            <a
              href="#"
              onClick={handleIOSDownload}
              className="group relative px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-base hover:from-blue-700 hover:to-blue-800 transition-all duration-300 hover:scale-105 transform tracking-tight"
            >
              <span className="relative z-10 flex items-center gap-3">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Download for iOS
              </span>
            </a>
            <a
              href={ANDROID_DOWNLOAD_URL}
              onClick={handleAndroidDownload}
              className="group relative px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold text-base hover:from-green-700 hover:to-emerald-700 transition-all duration-300 hover:scale-105 transform tracking-tight"
            >
              <span className="relative z-10 flex items-center gap-3">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L6.05,21.34L14.54,12.85L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                Download for Android
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-10 md:py-14 relative z-10">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-1 gradient-text tracking-tight">
          Key Features
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-4 text-base tracking-tight leading-tight">Everything you need for instant business reviews</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 max-w-7xl mx-auto">
          <div className="group relative text-center p-4 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="mb-2 transform group-hover:scale-110 transition-transform duration-300 text-blue-600 dark:text-blue-400">
                <FaQrcode className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1 tracking-tight">
                QR Code Scanning
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-tight tracking-tight">
                Scan QR codes to review instantly
              </p>
            </div>
          </div>
          <div className="group relative text-center p-4 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="mb-2 transform group-hover:scale-110 transition-transform duration-300 text-yellow-500 dark:text-yellow-400">
                <FaAward className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1 tracking-tight">
                Rating System
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-tight tracking-tight">
                Rate businesses with stars and tags
              </p>
            </div>
          </div>
          <div className="group relative text-center p-4 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="mb-2 transform group-hover:scale-110 transition-transform duration-300 text-blue-600 dark:text-blue-400">
                <FaChartLine className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1 tracking-tight">
                View Stats
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-tight tracking-tight">
                See ratings and reviews before you visit
              </p>
            </div>
          </div>
          <div className="group relative text-center p-4 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:border-yellow-300 dark:hover:border-yellow-600 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="mb-2 transform group-hover:scale-110 transition-transform duration-300 text-pink-500 dark:text-pink-400">
                <FaImages className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1 tracking-tight">
                Photo Reviews
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-tight tracking-tight">
                Upload photos with your reviews
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 pt-10 md:pt-14 pb-16 md:pb-20 relative z-10 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-1 gradient-text dark:text-gray-100 tracking-tight">
          How It Works
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-4 text-base tracking-tight leading-tight">Get started in three simple steps</p>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="group relative text-center">
              <div className="relative mb-2">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto group-hover:scale-110 transition-transform duration-300">
                  1
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 tracking-tight">
                Scan or Search
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-tight tracking-tight">
                Scan the QR code at the business or enter the business code
              </p>
            </div>
            <div className="group relative text-center">
              <div className="relative mb-2">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto group-hover:scale-110 transition-transform duration-300">
                  2
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 tracking-tight">
                Rate Your Experience
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-tight tracking-tight">
                Rate the business with stars, tags, and optional comments
              </p>
            </div>
            <div className="group relative text-center">
              <div className="relative mb-2">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-red-500 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-pink-600 to-pink-700 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto group-hover:scale-110 transition-transform duration-300">
                  3
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 tracking-tight">
                Share & Support
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-tight tracking-tight">
                Help others support and make informed decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Email Subscription Section */}
      <section className="container mx-auto px-4 py-10 md:py-14 relative z-10">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
              Stay Updated
            </h3>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6 text-sm">
              Subscribe to get the latest updates, tips, and exclusive offers
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!email.trim()) {
                  setEmailError('Please enter a valid email address')
                  return
                }

                setEmailSubmitting(true)
                setEmailError(null)

                try {
                  // TODO: Replace with your email subscription API endpoint
                  const response = await fetch('/api/subscribe', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email: email.trim() }),
                  })

                  if (!response.ok) {
                    throw new Error('Failed to subscribe')
                  }

                  setEmailSuccess(true)
                  setEmail('')
                  setTimeout(() => setEmailSuccess(false), 5000)
                } catch (error) {
                  console.error('Subscription error:', error)
                  setEmailError('Something went wrong. Please try again.')
                } finally {
                  setEmailSubmitting(false)
                }
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setEmailError(null)
                }}
                placeholder="Enter your email address"
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={emailSubmitting}
              />
              <button
                type="submit"
                disabled={emailSubmitting || emailSuccess}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
              >
                {emailSubmitting ? 'Subscribing...' : emailSuccess ? 'Subscribed!' : 'Subscribe'}
              </button>
            </form>
            {emailError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 text-center">{emailError}</p>
            )}
            {emailSuccess && (
              <p className="mt-2 text-sm text-green-600 dark:text-green-400 text-center">
                Thank you for subscribing! Check your email for confirmation.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* App Download Section */}
      <section className="container mx-auto px-4 py-10 md:py-14 relative z-10">
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-2xl blur-3xl"></div>
          <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-gray-200 dark:border-gray-700">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-1 gradient-text dark:text-gray-100 tracking-tight">
              Download the App
            </h2>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 mb-3 max-w-2xl mx-auto leading-tight tracking-tight">
              Get started today and help build a better review experience for everyone
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
              <a
                href="#"
                onClick={handleIOSDownload}
                className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-900 to-black text-white rounded-xl font-semibold text-base hover:from-gray-800 hover:to-gray-900 transition-all duration-300 hover:scale-105 transform tracking-tight"
              >
                <svg className="w-8 h-8 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs opacity-80">Download on the</div>
                  <div className="text-lg font-bold">App Store</div>
                </div>
              </a>
              <a
                href={ANDROID_DOWNLOAD_URL}
                onClick={handleAndroidDownload}
                className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-900 to-black text-white rounded-xl font-semibold text-base hover:from-gray-800 hover:to-gray-900 transition-all duration-300 hover:scale-105 transform tracking-tight"
              >
                <svg className="w-8 h-8 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L6.05,21.34L14.54,12.85L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs opacity-80">Get it on</div>
                  <div className="text-lg font-bold">Google Play</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-4 relative z-10 border-t border-gray-700/50">
        <div className="container mx-auto px-4 text-center">
          <div className="text-3xl mb-2 text-gray-700 dark:text-gray-300">
            <FaStore className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-2xl font-bold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 tracking-tight">
            QrRate
          </p>
          <p className="text-gray-400 text-sm mb-3">
            © {new Date().getFullYear()} QrRate. All rights reserved.
          </p>
          <div className="mt-2">
            <a
              href={isLoggedIn ? "/dashboard" : "/auth/login"}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              {isLoggedIn ? "Business Dashboard" : "Business Login"}
            </a>
          </div>
        </div>
      </footer>
    </main>
  )
}

