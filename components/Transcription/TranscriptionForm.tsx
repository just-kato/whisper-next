'use client'

import { useState, useRef } from 'react'

interface TranscriptionFormProps {
  onTranscriptionComplete: (result: TranscriptionResult) => void
}

export interface TranscriptionResult {
  text: string
  language: string
  segments: any[]
}

export default function TranscriptionForm({ onTranscriptionComplete }: TranscriptionFormProps) {
  const [model, setModel] = useState('base')
  const [language, setLanguage] = useState('auto')
  const [task, setTask] = useState('transcribe')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setYoutubeUrl('')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
      setYoutubeUrl('')
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

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Transcription failed')
      }

      const result = await response.json()
      onTranscriptionComplete(result)
    } catch (err: any) {
      setError(err.message || 'Failed to transcribe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-white">Upload Audio or Video</h2>

      {/* File Drop Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-600 rounded-lg p-12 text-center mb-6 cursor-pointer hover:border-blue-500 transition-colors"
      >
        <svg
          className="mx-auto h-12 w-12 text-gray-500 mb-4"
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
        <p className="text-gray-400 mb-2">
          {file ? file.name : 'Click to upload or drag and drop'}
        </p>
        <p className="text-sm text-gray-500">MP3, WAV, MP4, or other audio/video formats</p>
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
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleYoutubeLoad}
            disabled={!youtubeUrl.trim()}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition-colors disabled:opacity-50"
          >
            Load Video
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-white">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
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
            className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
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
            className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="transcribe">Transcribe</option>
            <option value="translate">Translate to English</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-500 bg-opacity-20 border border-red-500 text-red-500 px-4 py-2 rounded">
          {error}
        </div>
      )}

      {/* Transcribe Button */}
      <button
        onClick={handleTranscribe}
        disabled={loading || (!file && !youtubeUrl.trim())}
        className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded font-semibold transition-colors disabled:opacity-50"
      >
        {loading ? 'Transcribing...' : 'Transcribe'}
      </button>
    </div>
  )
}