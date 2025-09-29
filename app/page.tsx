'use client'

import { useState, useEffect } from 'react'
import AuthModal from '@/components/Auth/AuthModal'
import TranscriptionForm from '@/components/Transcription/TranscriptionForm'
import TranscriptionResult, { TranscriptionResult as TResult } from '@/components/Transcription/TranscriptionResult'
import Dashboard from '@/components/Dashboard/Dashboard'
import { SupabaseService } from '@/lib/supabase'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [transcriptionResult, setTranscriptionResult] = useState<TResult | null>(null)
  const [currentModel, setCurrentModel] = useState('base')
  const [currentFileName, setCurrentFileName] = useState<string>()
  const [refreshDashboard, setRefreshDashboard] = useState(0)
  const supabase = new SupabaseService()

  useEffect(() => {
    checkUser()

    const { data: authListener } = supabase.onAuthStateChange((user) => {
      setUser(user)
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  const checkUser = async () => {
    try {
      const currentUser = await supabase.getCurrentUser()
      setUser(currentUser)
    } catch (err) {
      console.log('No user logged in')
    } finally {
      setLoading(false)
    }
  }

  const handleAuthSuccess = () => {
    checkUser()
  }

  const handleTranscriptionComplete = (result: TResult) => {
    setTranscriptionResult(result)
  }

  const handleSaveComplete = () => {
    setTranscriptionResult(null)
    setRefreshDashboard((prev) => prev + 1)
  }

  const handleLogout = async () => {
    try {
      await supabase.signOut()
      setUser(null)
      setTranscriptionResult(null)
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <AuthModal onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Whisper Transcription</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded font-semibold transition-colors"
          >
            Logout
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <TranscriptionForm onTranscriptionComplete={handleTranscriptionComplete} />

          {transcriptionResult && (
            <TranscriptionResult
              text={transcriptionResult.text}
              language={transcriptionResult.language}
              model={currentModel}
              fileName={currentFileName}
              onSaveComplete={handleSaveComplete}
            />
          )}
        </div>

        <Dashboard key={refreshDashboard} />
      </div>
    </div>
  )
}