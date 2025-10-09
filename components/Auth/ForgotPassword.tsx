'use client'

import { useState } from 'react'
import { SupabaseService } from '@/lib/supabase'

interface ForgotPasswordProps {
  onBack: () => void
}

export default function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [supabase] = useState(() => new SupabaseService())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await supabase.resetPassword(email)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
        <div className="bg-black border border-white max-w-md w-full p-8">
          <h2 className="text-3xl font-light mb-6 text-center text-white tracking-tight">
            Check Your Email
          </h2>

          <div className="mb-6 text-center">
            <p className="text-white mb-4">
              We've sent a password reset link to:
            </p>
            <p className="text-green-400 font-medium">{email}</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 p-4 mb-6 text-sm text-gray-300">
            <p className="mb-2">
              <strong>Next steps:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the reset link in the email</li>
              <li>Enter your new password</li>
            </ol>
          </div>

          <button
            onClick={onBack}
            className="w-full bg-white text-black hover:bg-gray-200 px-6 py-2 font-medium transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-white max-w-md w-full p-8">
        <h2 className="text-3xl font-light mb-6 text-center text-white tracking-tight">
          Reset Password
        </h2>

        <p className="text-gray-300 text-center mb-6">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2 text-white">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
              placeholder="Enter your email"
              required
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
              disabled={loading}
              className="w-full bg-white text-black hover:bg-gray-200 px-6 py-2 font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full bg-black text-white border border-white hover:bg-gray-900 px-6 py-2 font-medium transition-colors"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}