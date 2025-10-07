'use client'

import { useState, useRef } from 'react'

interface TranscriptionFormProps {
  onTranscriptionComplete: (result: TranscriptionResult) => void
}

export interface TranscriptionResult {
  text: string
  language: string
  segments: any[]
  youtubeUrl?: string
}

export default function TranscriptionForm({ onTranscriptionComplete }: TranscriptionFormProps) {
  const [model, setModel] = useState('auto')
  const [language, setLanguage] = useState('auto')
  const [task, setTask] = useState('transcribe')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [youtubeLoaded, setYoutubeLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setYoutubeUrl('')
      setYoutubeLoaded(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
      setYoutubeUrl('')
      setYoutubeLoaded(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleYoutubeLoad = () => {
    if (youtubeUrl.trim()) {
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setYoutubeLoaded(true)
      setError('')
    }
  }

  const handleTranscribe = async () => {
    if (!file && !youtubeUrl.trim()) {
      setError('Please select a file or provide a YouTube URL')
      return
    }

    setError('')
    setLoading(true)

    try {
      const formData = new FormData()
      if (file) {
        formData.append('audio', file)
      }
      if (youtubeUrl.trim()) {
        formData.append('youtube_url', youtubeUrl.trim())
      }
      formData.append('model', model)
      formData.append('language', language)
      formData.append('task', task)

      // Call Flask server directly to avoid Next.js timeout issues
      const response = await fetch('http://127.0.0.1:5001/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Transcription failed')
      }

      const result = await response.json()
      onTranscriptionComplete({
        ...result,
        youtubeUrl: youtubeUrl.trim() || undefined
      })
    } catch (err: any) {
      setError(err.message || 'Failed to transcribe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-black border border-white p-6">
      <h2 className="text-2xl font-light mb-6 text-white tracking-tight">Upload Audio or Video</h2>

      {/* File Drop Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-white p-12 text-center mb-6 cursor-pointer hover:border-gray-400 transition-colors"
      >
        <svg
          className="mx-auto h-12 w-12 text-white mb-4"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-white mb-2 font-medium">
          {file ? file.name : 'Click to upload or drag and drop'}
        </p>
        <p className="text-sm text-gray-400">MP3, WAV, MP4, or other audio/video formats</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* YouTube URL */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-white">
          Or paste a YouTube URL
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => {
              setYoutubeUrl(e.target.value)
              setYoutubeLoaded(false)
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
          />
          <button
            onClick={handleYoutubeLoad}
            disabled={!youtubeUrl.trim()}
            className="bg-white text-black hover:bg-gray-200 px-4 py-2 font-medium transition-colors disabled:opacity-50"
          >
            Load Video
          </button>
        </div>
        {youtubeLoaded && (
          <div className="mt-2 px-4 py-2 bg-black border border-white text-white text-sm">
            ✓ YouTube URL loaded. Ready to transcribe.
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-white">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
          >
            <option value="auto">Auto (recommended)</option>
            <option value="tiny">Tiny (fastest)</option>
            <option value="base">Base</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large (best quality)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-white">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
          >
            <option value="auto">Auto-detect</option>
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ja">Japanese</option>
            <option value="zh">Chinese</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-white">Task</label>
          <select
            value={task}
            onChange={(e) => setTask(e.target.value)}
            className="w-full px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
          >
            <option value="transcribe">Transcribe</option>
            <option value="translate">Translate to English</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-black border border-red-500 text-red-500 px-4 py-2">
          {error}
        </div>
      )}

      {/* Loading Progress */}
      {loading && (
        <div className="mb-4 bg-black border border-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">Transcribing audio...</span>
            <span className="text-gray-400 text-sm">This may take a few minutes</span>
          </div>
          <div className="w-full bg-gray-900 h-2 overflow-hidden">
            <div className="h-full bg-white animate-pulse" style={{ width: '100%' }}></div>
          </div>
        </div>
      )}

      {/* Transcribe Button */}
      <button
        onClick={handleTranscribe}
        disabled={loading || (!file && !youtubeUrl.trim())}
        className="w-full bg-white text-black hover:bg-gray-200 px-6 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Transcribing...' : 'Transcribe'}
      </button>
    </div>
  )
}