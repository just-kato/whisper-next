'use client'

import { useState } from 'react'
import { SupabaseService } from '@/lib/supabase'
import ForgotPassword from './ForgotPassword'

interface AuthModalProps {
  onAuthSuccess: () => void
}

export default function AuthModal({ onAuthSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [supabase] = useState(() => new SupabaseService())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await supabase.signIn(email, password)
      } else {
        await supabase.signUp(email, password)
      }
      onAuthSuccess()
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-white max-w-md w-full p-8">
        <h2 className="text-3xl font-light mb-8 text-center text-white tracking-tight">Welcome to Whisper</h2>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 px-4 py-2 transition-colors font-medium ${
              isLogin ? 'bg-white text-black' : 'bg-black text-white border border-white'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 px-4 py-2 transition-colors font-medium ${
              !isLogin ? 'bg-white text-black' : 'bg-black text-white border border-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2 text-white">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2 text-white">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
              required
            />
          </div>

          {error && (
            <div className="bg-black border border-red-500 text-red-500 px-4 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black hover:bg-gray-200 px-6 py-2 font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Sign Up'}
          </button>

          {isLogin && (
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-gray-400 hover:text-white transition-colors text-sm underline"
              >
                Forgot your password?
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}