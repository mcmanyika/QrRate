'use client'

import { useCallback } from 'react'

// Supabase storage URL for Android APK
// Update BUCKET_NAME and FILE_PATH with your actual bucket name and file path
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ghinjhboerdgpnugraks.supabase.co';
const APK_BUCKET_NAME = process.env.NEXT_PUBLIC_APK_BUCKET_NAME || 'apps';
const APK_FILE_PATH = process.env.NEXT_PUBLIC_APK_FILE_PATH || 'RateMyRide';
const ANDROID_DOWNLOAD_URL = `${SUPABASE_URL}/storage/v1/object/public/${APK_BUCKET_NAME}/${APK_FILE_PATH}`;

export default function Home() {
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
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-32 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-16 relative z-10">
        <div className="text-center max-w-4xl mx-auto animate-fade-in">
          <div className="text-7xl md:text-9xl mb-8 animate-float inline-block">🚐</div>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 gradient-text animate-slide-up tracking-tight">
            RateMyRide
          </h1>
          <p className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6 animate-slide-up tracking-tight" style={{ animationDelay: '0.2s' }}>
            Rate your ride experience
          </p>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-tight tracking-tight animate-slide-up" style={{ animationDelay: '0.4s' }}>
            Scan QR codes in vehicles to instantly rate your ride. Help others make informed decisions and support drivers.
          </p>
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center animate-scale-in" style={{ animationDelay: '0.6s' }}>
            <a
              href="#"
              onClick={handleIOSDownload}
              className="group relative px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-semibold text-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transform tracking-tight"
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
              className="group relative px-10 py-5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-2xl hover:shadow-green-500/50 hover:scale-105 transform tracking-tight"
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
      <section className="container mx-auto px-4 py-12 md:py-16 relative z-10">
        <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-4 gradient-text tracking-tight">
          Key Features
        </h2>
        <p className="text-center text-gray-600 mb-10 text-lg tracking-tight leading-tight">Everything you need for a better ride experience</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          <div className="group relative text-center p-8 rounded-3xl bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-300">📷</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">
                QR Code Scanning
              </h3>
              <p className="text-gray-600 leading-tight tracking-tight">
                Scan QR codes in vehicles to rate instantly
              </p>
            </div>
          </div>
          <div className="group relative text-center p-8 rounded-3xl bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-green-300 hover:shadow-2xl hover:shadow-green-500/20 transition-all duration-300 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-300">⭐</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">
                Rating System
              </h3>
              <p className="text-gray-600 leading-tight tracking-tight">
                Rate cleanliness, safety, friendliness, and punctuality
              </p>
            </div>
          </div>
          <div className="group relative text-center p-8 rounded-3xl bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-purple-300 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-300">📊</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">
                View Stats
              </h3>
              <p className="text-gray-600 leading-tight tracking-tight">
                See ratings and reviews before you ride
              </p>
            </div>
          </div>
          <div className="group relative text-center p-8 rounded-3xl bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-yellow-300 hover:shadow-2xl hover:shadow-yellow-500/20 transition-all duration-300 hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative">
              <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-300">💝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">
                Tipping
              </h3>
              <p className="text-gray-600 leading-tight tracking-tight">
                Support drivers with tips
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-12 md:py-16 relative z-10 bg-gradient-to-b from-white to-gray-50/50">
        <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-4 gradient-text tracking-tight">
          How It Works
        </h2>
        <p className="text-center text-gray-600 mb-10 text-lg tracking-tight leading-tight">Get started in three simple steps</p>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="group relative text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300">
                  1
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                Scan or Search
              </h3>
              <p className="text-gray-600 leading-tight tracking-tight">
                Scan the QR code inside the vehicle or enter the registration number
              </p>
            </div>
            <div className="group relative text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300">
                  2
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                Rate Your Experience
              </h3>
              <p className="text-gray-600 leading-tight tracking-tight">
                Rate cleanliness, safety, friendliness, and punctuality with stars
              </p>
            </div>
            <div className="group relative text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-red-500 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-pink-600 to-pink-700 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300">
                  3
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                Share & Support
              </h3>
              <p className="text-gray-600 leading-tight tracking-tight">
                Your rating helps others, and you can optionally tip the driver
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* App Download Section */}
      <section className="container mx-auto px-4 py-12 md:py-16 relative z-10">
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-3xl blur-3xl"></div>
          <div className="relative bg-white/90 backdrop-blur-md rounded-3xl p-12 md:p-16 border border-gray-200 shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 gradient-text tracking-tight">
              Download the App
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-tight tracking-tight">
              Get started today and help build a better ride experience for everyone
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <a
                href="#"
                onClick={handleIOSDownload}
                className="group flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-gray-900 to-black text-white rounded-2xl font-semibold text-lg hover:from-gray-800 hover:to-gray-900 transition-all duration-300 shadow-2xl hover:shadow-gray-900/50 hover:scale-105 transform tracking-tight"
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
                className="group flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-gray-900 to-black text-white rounded-2xl font-semibold text-lg hover:from-gray-800 hover:to-gray-900 transition-all duration-300 shadow-2xl hover:shadow-gray-900/50 hover:scale-105 transform tracking-tight"
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
      <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-8 relative z-10 border-t border-gray-700/50">
        <div className="container mx-auto px-4 text-center">
          <div className="text-3xl mb-4">🚐</div>
          <p className="text-2xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 tracking-tight">
            RateMyRide
          </p>
          <p className="text-gray-400 text-sm mb-6">
            © {new Date().getFullYear()} RateMyRide. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
}

