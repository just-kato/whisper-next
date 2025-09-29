'use client'

import { useState } from 'react'
import { SupabaseService, Transcription } from '@/lib/supabase'

interface TranscriptionResultProps {
  text: string
  language: string
  model: string
  fileName?: string
  onSaveComplete: () => void
}

export default function TranscriptionResult({
  text,
  language,
  model,
  fileName,
  onSaveComplete,
}: TranscriptionResultProps) {
  const [name, setName] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = new SupabaseService()

  const formatText = (text: string): string => {
    // Remove extra whitespace
    let formatted = text.replace(/\s+/g, ' ').trim()

    // Ensure proper spacing after punctuation
    formatted = formatted.replace(/([.!?])\s*/g, '$1 ')

    // Capitalize first letter of sentences
    formatted = formatted.replace(/(^|[.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase())

    // Add paragraph breaks every 3-4 sentences
    const sentences = formatted.split(/([.!?]\s+)/)
    let result = ''
    let sentenceCount = 0

    for (let i = 0; i < sentences.length; i++) {
      result += sentences[i]
      if (sentences[i].match(/[.!?]\s+$/)) {
        sentenceCount++
        if (sentenceCount >= 3 && Math.random() > 0.3) {
          result += '\n\n'
          sentenceCount = 0
        }
      }
    }

    return result.trim()
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a name for this transcription')
      return
    }

    setError('')
    setSaving(true)

    try {
      const user = await supabase.getCurrentUser()
      const parsedTags = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      const transcriptionData: Omit<Transcription, 'id' | 'created_at' | 'updated_at'> = {
        name: name.trim(),
        original_text: text,
        formatted_text: formatText(text),
        language,
        model_used: model,
        file_name: fileName || null,
        duration_seconds: null,
        tags: parsedTags.length > 0 ? parsedTags : null,
        user_id: user?.id || null,
      }

      await supabase.saveTranscription(transcriptionData)
      onSaveComplete()
    } catch (err: any) {
      setError(err.message || 'Failed to save transcription')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.trim() || 'transcription'}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-white">Transcription Result</h2>

      <div className="mb-4">
        <p className="text-sm text-gray-400">
          Language: <span className="text-white">{language}</span>
        </p>
      </div>

      <div className="bg-gray-900 rounded p-4 mb-6 max-h-96 overflow-y-auto">
        <p className="text-white whitespace-pre-wrap">{text}</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-white">Transcription Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name..."
          className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-white">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g., meeting, work, important"
          className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {error && (
        <div className="mb-4 bg-red-500 bg-opacity-20 border border-red-500 text-red-500 px-4 py-2 rounded">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-green-600 hover:bg-green-700 px-6 py-3 rounded font-semibold transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save to Dashboard'}
        </button>
        <button
          onClick={handleDownload}
          className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded font-semibold transition-colors"
        >
          Download
        </button>
      </div>
    </div>
  )
}