'use client'

import { useEffect, useState } from 'react'
import { SupabaseService, Transcription } from '@/lib/supabase'

export default function Dashboard() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = new SupabaseService()

  useEffect(() => {
    loadTranscriptions()
  }, [])

  const loadTranscriptions = async () => {
    try {
      const data = await supabase.getTranscriptions()
      setTranscriptions(data)
    } catch (err) {
      console.error('Failed to load transcriptions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transcription?')) return

    try {
      await supabase.deleteTranscription(id)
      setTranscriptions(transcriptions.filter((t) => t.id !== id))
    } catch (err) {
      console.error('Failed to delete transcription:', err)
    }
  }

  const handleDownload = (transcription: Transcription) => {
    const blob = new Blob([transcription.formatted_text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${transcription.name}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-white">Your Transcriptions</h2>
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-white">Your Transcriptions</h2>

      {transcriptions.length === 0 ? (
        <p className="text-gray-400">No transcriptions yet. Upload a file to get started!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {transcriptions.map((t) => (
            <div
              key={t.id}
              className="bg-gray-900 rounded-lg p-6 hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <h3 className="text-xl font-semibold mb-3 text-white">{t.name}</h3>

              <div className="text-sm text-gray-400 space-y-1 mb-4">
                <p>Language: {t.language || 'Unknown'}</p>
                <p>Model: {t.model_used || 'Unknown'}</p>
                <p>Date: {new Date(t.created_at).toLocaleDateString()}</p>
              </div>

              {t.tags && t.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {t.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="bg-gray-800 rounded p-3 mb-4 max-h-32 overflow-y-auto">
                <p className="text-gray-300 text-sm line-clamp-4">{t.formatted_text}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(t)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-semibold transition-colors"
                >
                  Download
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-semibold transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}