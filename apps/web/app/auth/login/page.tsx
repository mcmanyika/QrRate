import LoginForm from '@/components/auth/LoginForm'
import Link from 'next/link'
import { FaBus } from 'react-icons/fa'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-6 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-md w-full space-y-5 relative z-10">
        {/* Logo/Brand Section */}
        <Link href="/" className="block text-center cursor-pointer group">
          <div className="text-6xl md:text-7xl mb-3 animate-float inline-block text-gray-700 dark:text-gray-300 group-hover:scale-105 transition-transform duration-200">
            <FaBus className="w-24 h-24 md:w-28 md:h-28 mx-auto" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-1 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-gray-200 dark:to-gray-100 bg-clip-text text-transparent tracking-tight group-hover:opacity-80 transition-opacity">
            RateMyRide
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Sign in to your account to continue
          </p>
        </Link>

        {/* Login Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl py-6 px-6 shadow-2xl rounded-2xl border border-white/20 dark:border-gray-700/50">
          <LoginForm />

          {/* Sign up link */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

