import PhoneOTPForm from '@/components/auth/PhoneOTPForm'
import Link from 'next/link'

export default function VerifyPhonePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in with Phone Number
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
              sign in with email
            </Link>
          </p>
        </div>
        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <PhoneOTPForm />
        </div>
      </div>
    </div>
  )
}

