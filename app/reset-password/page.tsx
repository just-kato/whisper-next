'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SupabaseService } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [supabase] = useState(() => new SupabaseService())

  useEffect(() => {
    setMounted(true)

    // Check if we have the required URL fragments for password reset
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')

    if (!accessToken || !refreshToken) {
      setError('Invalid or expired reset link. Please request a new password reset.')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)

    try {
      await supabase.updatePassword(password)
      setSuccess(true)

      // Redirect to home after 3 seconds
      setTimeout(() => {
        router.push('/')
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-black border border-white max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-light text-white mb-4">Password Updated!</h1>
            <p className="text-gray-300">
              Your password has been successfully updated. You'll be redirected to the login page shortly.
            </p>
          </div>

          <button
            onClick={() => router.push('/')}
            className="bg-white text-black hover:bg-gray-200 px-6 py-2 font-medium transition-colors"
          >
            Continue to App
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-black border border-white max-w-md w-full p-8">
        <h1 className="text-3xl font-light mb-6 text-center text-white tracking-tight">
          Set New Password
        </h1>

        <p className="text-gray-300 text-center mb-8">
          Enter your new password below to complete the reset process.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2 text-white">
              New Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
              placeholder="Enter new password"
              required
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-white">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
              placeholder="Confirm new password"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-black border border-red-500 text-red-500 px-4 py-2">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full bg-white text-black hover:bg-gray-200 px-6 py-2 font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>

            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full bg-black text-white border border-white hover:bg-gray-900 px-6 py-2 font-medium transition-colors"
            >
              Back to Login
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-gray-900 border border-gray-700 text-sm text-gray-300">
          <p className="font-medium mb-2">Password Requirements:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>At least 6 characters long</li>
            <li>Must match confirmation</li>
          </ul>
        </div>
      </div>
    </div>
  )
}