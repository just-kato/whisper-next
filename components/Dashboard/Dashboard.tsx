'use client'

import { useEffect, useState } from 'react'
import { SupabaseService, Transcription } from '@/lib/supabase'

export default function Dashboard() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTranscription, setSelectedTranscription] = useState<Transcription | null>(null)
  const [editingTags, setEditingTags] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [supabase] = useState(() => new SupabaseService())

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

  const handleAddTag = async (transcriptionId: string, currentTags: string[] | null) => {
    if (!tagInput.trim()) {
      console.log('Tag input is empty')
      return
    }

    const newTag = tagInput.trim()
    const updatedTags = currentTags ? [...currentTags, newTag] : [newTag]

    console.log('Adding tag:', newTag, 'to transcription:', transcriptionId)

    try {
      await supabase.updateTranscriptionTags(transcriptionId, updatedTags)
      setTranscriptions(transcriptions.map(t =>
        t.id === transcriptionId ? { ...t, tags: updatedTags } : t
      ))
      setTagInput('')
      setEditingTags(null)
      console.log('Tag added successfully')
    } catch (err) {
      console.error('Failed to add tag:', err)
      alert('Failed to add tag: ' + (err as Error).message)
    }
  }

  const handleRemoveTag = async (transcriptionId: string, tagToRemove: string, currentTags: string[] | null) => {
    if (!currentTags) return

    const updatedTags = currentTags.filter(tag => tag !== tagToRemove)

    try {
      await supabase.updateTranscriptionTags(transcriptionId, updatedTags.length > 0 ? updatedTags : null)
      setTranscriptions(transcriptions.map(t =>
        t.id === transcriptionId ? { ...t, tags: updatedTags.length > 0 ? updatedTags : null } : t
      ))
    } catch (err) {
      console.error('Failed to remove tag:', err)
    }
  }

  if (loading) {
    return (
      <div className="bg-black border border-white p-6">
        <h2 className="text-2xl font-light mb-6 text-white tracking-tight">Your Transcriptions</h2>
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-black border border-white p-6">
        <h2 className="text-2xl font-light mb-6 text-white tracking-tight">Your Transcriptions</h2>

        {transcriptions.length === 0 ? (
          <p className="text-gray-400">No transcriptions yet. Upload a file to get started!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {transcriptions.map((t) => (
              <div
                key={t.id}
                className="bg-black border border-white p-6 hover:border-gray-400 transition-all duration-200 cursor-pointer"
                onClick={() => setSelectedTranscription(t)}
              >
                <h3 className="text-xl font-semibold mb-3 text-white">{t.name}</h3>

                <div className="text-sm text-gray-400 space-y-1 mb-4">
                  <p>Language: {t.language || 'Unknown'}</p>
                  <p>Model: {t.model_used || 'Unknown'}</p>
                  <p>Date: {new Date(t.created_at).toLocaleDateString()}</p>
                  {t.user_id && <p className="text-xs truncate">User: {t.user_id.substring(0, 8)}...</p>}
                </div>

                <div className="mb-4">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {t.tags && t.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-white text-black text-xs px-3 py-1 flex items-center gap-1 font-medium"
                      >
                        {tag}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveTag(t.id, tag, t.tags)
                          }}
                          className="hover:text-red-300"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  {editingTags === t.id ? (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddTag(t.id, t.tags)
                          } else if (e.key === 'Escape') {
                            setEditingTags(null)
                            setTagInput('')
                          }
                        }}
                        placeholder="Add tag..."
                        className="flex-1 px-2 py-1 text-xs bg-black text-white border border-white focus:border-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleAddTag(t.id, t.tags)}
                        className="text-xs bg-white text-black hover:bg-gray-200 px-2 py-1 font-medium"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setEditingTags(null)
                          setTagInput('')
                        }}
                        className="text-xs bg-black text-white border border-white hover:bg-gray-900 px-2 py-1 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingTags(t.id)
                        setTagInput('')
                      }}
                      className="text-xs text-white hover:text-gray-400 font-medium"
                    >
                      + Add tag
                    </button>
                  )}
                </div>

                <div className="bg-black border border-white p-3 mb-4 max-h-32 overflow-y-auto">
                  <p className="text-gray-300 text-sm line-clamp-4">{t.formatted_text}</p>
                </div>

                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDownload(t)}
                    className="flex-1 bg-white text-black hover:bg-gray-200 px-4 py-2 text-sm font-medium transition-colors"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="bg-black text-white border border-white hover:bg-gray-900 px-4 py-2 text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transcription Detail Modal */}
      {selectedTranscription && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTranscription(null)}
        >
          <div
            className="bg-black border border-white max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{selectedTranscription.name}</h2>
                <div className="text-sm text-gray-400 space-y-1">
                  <p>Language: {selectedTranscription.language || 'Unknown'}</p>
                  <p>Model: {selectedTranscription.model_used || 'Unknown'}</p>
                  <p>Date: {new Date(selectedTranscription.created_at).toLocaleString()}</p>
                  {selectedTranscription.user_id && (
                    <p className="font-mono">User ID: {selectedTranscription.user_id}</p>
                  )}
                  {selectedTranscription.file_name && (
                    selectedTranscription.file_name.startsWith('http') ? (
                      <a
                        href={selectedTranscription.file_name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-gray-400 underline inline-block"
                      >
                        Watch original video →
                      </a>
                    ) : (
                      <p>File: {selectedTranscription.file_name}</p>
                    )
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedTranscription(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {selectedTranscription.tags && selectedTranscription.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedTranscription.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-white text-black text-sm px-4 py-2 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="bg-black border border-white mb-6 h-96 overflow-hidden flex flex-col">
              <h3 className="text-xl font-light text-white bg-black p-6 border-b border-white tracking-tight">Transcription</h3>
              <div className="overflow-y-auto flex-1 p-6">
                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {selectedTranscription.formatted_text}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => handleDownload(selectedTranscription)}
                className="flex-1 bg-white text-black hover:bg-gray-200 px-6 py-3 font-medium transition-colors"
              >
                Download
              </button>
              <button
                onClick={() => {
                  handleDelete(selectedTranscription.id)
                  setSelectedTranscription(null)
                }}
                className="bg-black text-white border border-white hover:bg-gray-900 px-6 py-3 font-medium transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedTranscription(null)}
                className="bg-black text-white border border-white hover:bg-gray-900 px-6 py-3 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}