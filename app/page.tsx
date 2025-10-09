'use client'

import { useState, useEffect } from 'react'
import AuthModal from '@/components/Auth/AuthModal'
import TranscriptionForm from '@/components/Transcription/TranscriptionForm'
import TranscriptionResult from '@/components/Transcription/TranscriptionResult'
import Dashboard from '@/components/Dashboard/Dashboard'
import YouTubeInsights from '@/components/YouTube/YouTubeInsights'
import { SupabaseService } from '@/lib/supabase'
import type { TranscriptionResult as TResult } from '@/components/Transcription/TranscriptionForm'

type TabType = 'transcription' | 'youtube'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('transcription')
  const [transcriptionResult, setTranscriptionResult] = useState<TResult | null>(null)
  const [currentModel, setCurrentModel] = useState('base')
  const [currentFileName, setCurrentFileName] = useState<string>()
  const [currentYoutubeUrl, setCurrentYoutubeUrl] = useState<string>()
  const [refreshDashboard, setRefreshDashboard] = useState(0)
  const [supabase, setSupabase] = useState<SupabaseService | null>(null)

  useEffect(() => {
    setMounted(true)
    const service = new SupabaseService()
    setSupabase(service)

    // Check URL params for tab
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab === 'youtube') {
      setActiveTab('youtube')
    }

    checkUser(service)

    const { data: authListener } = service.onAuthStateChange((user) => {
      setUser(user)
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  const checkUser = async (service: SupabaseService) => {
    try {
      const currentUser = await service.getCurrentUser()
      setUser(currentUser)
    } catch (err) {
      console.log('No user logged in')
    } finally {
      setLoading(false)
    }
  }

  const handleAuthSuccess = () => {
    if (supabase) {
      checkUser(supabase)
    }
  }

  const handleTranscriptionComplete = (result: TResult) => {
    setTranscriptionResult(result)
    setCurrentYoutubeUrl(result.youtubeUrl)
  }

  const handleSaveComplete = () => {
    setTranscriptionResult(null)
    setRefreshDashboard((prev) => prev + 1)
  }

  const handleLogout = async () => {
    if (!supabase) return
    try {
      await supabase.signOut()
      setUser(null)
      setTranscriptionResult(null)
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return <AuthModal onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8 border-b border-white pb-6">
          <h1 className="text-4xl font-light tracking-tight">Youtube Researcher 3000</h1>
          <button
            onClick={handleLogout}
            className="bg-white text-black hover:bg-gray-200 px-6 py-2 font-medium transition-colors"
          >
            Logout
          </button>
        </header>

        {/* Tab Navigation */}
        <div className="mb-8 border-b border-white">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('transcription')}
              className={`pb-4 font-medium transition-colors ${
                activeTab === 'transcription'
                  ? 'text-white border-b-2 border-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Transcription
            </button>
            <button
              onClick={() => setActiveTab('youtube')}
              className={`pb-4 font-medium transition-colors ${
                activeTab === 'youtube'
                  ? 'text-white border-b-2 border-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              YouTube Insights
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'transcription' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <TranscriptionForm onTranscriptionComplete={handleTranscriptionComplete} />

              {transcriptionResult && (
                <TranscriptionResult
                  text={transcriptionResult.text}
                  language={transcriptionResult.language}
                  model={currentModel}
                  fileName={currentFileName}
                  youtubeUrl={currentYoutubeUrl}
                  onSaveComplete={handleSaveComplete}
                />
              )}
            </div>

            <Dashboard key={refreshDashboard} />
          </>
        )}

        {activeTab === 'youtube' && <YouTubeInsights />}
      </div>
    </div>
  )
}
