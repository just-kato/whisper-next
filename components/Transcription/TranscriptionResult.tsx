'use client'

import { useState } from 'react'
import { SupabaseService, Transcription } from '@/lib/supabase'

interface TranscriptionResultProps {
  text: string
  language: string
  model: string
  fileName?: string
  youtubeUrl?: string
  onSaveComplete: () => void
}

export default function TranscriptionResult({
  text,
  language,
  model,
  fileName,
  youtubeUrl,
  onSaveComplete,
}: TranscriptionResultProps) {
  const [name, setName] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [supabase] = useState(() => new SupabaseService())

  const formatText = (text: string): string => {
    // Remove extra whitespace and normalize
    let formatted = text.trim()

    // Add proper spacing after punctuation
    formatted = formatted.replace(/([.!?])\s*/g, '$1 ')

    // Capitalize first letter of sentences
    formatted = formatted.replace(/(^|\.\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase())

    // Remove multiple spaces
    formatted = formatted.replace(/\s+/g, ' ')

    // Add paragraph breaks for better readability (every 3-4 sentences)
    const sentences = formatted.match(/[^.!?]+[.!?]+/g) || [formatted]
    let paragraphs: string[] = []
    let currentParagraph: string[] = []

    sentences.forEach((sentence, index) => {
      currentParagraph.push(sentence.trim())
      if ((index + 1) % 3 === 0 || index === sentences.length - 1) {
        paragraphs.push(currentParagraph.join(' '))
        currentParagraph = []
      }
    })

    return paragraphs.join('\n\n')
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
        file_name: youtubeUrl || fileName || null,
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
    <div className="bg-black border border-white p-6">
      <h2 className="text-2xl font-light mb-6 text-white tracking-tight">Transcription Result</h2>

      <div className="mb-4 space-y-2">
        <p className="text-sm text-gray-400">
          Language: <span className="text-white font-medium">{language}</span>
        </p>
        {youtubeUrl && (
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white hover:text-gray-400 underline inline-block"
          >
            Watch original video →
          </a>
        )}
      </div>

      <div className="bg-black border border-white p-4 mb-6 max-h-96 overflow-y-auto">
        <p className="text-white whitespace-pre-wrap">{text}</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-white">Transcription Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name..."
          className="w-full px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
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
          className="w-full px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
        />
      </div>

      {error && (
        <div className="mb-4 bg-black border border-red-500 text-red-500 px-4 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-white text-black hover:bg-gray-200 px-6 py-3 font-medium transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save to Dashboard'}
        </button>
        <button
          onClick={handleDownload}
          className="bg-black text-white border border-white hover:bg-gray-900 px-6 py-3 font-medium transition-colors"
        >
          Download
        </button>
      </div>
    </div>
  )
}