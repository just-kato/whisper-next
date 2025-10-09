'use client'

import { useState, useEffect } from 'react'
import { SupabaseService } from '@/lib/supabase'
import type { YoutubeChannel } from '@/lib/youtube'
import Link from 'next/link'

export default function YouTubeInsights() {
  const [channels, setChannels] = useState<YoutubeChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [channelUrl, setChannelUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [supabase] = useState(() => new SupabaseService())

  useEffect(() => {
    loadChannels()
  }, [])

  const loadChannels = async () => {
    try {
      const data = await supabase.getChannels()
      setChannels(data)
    } catch (err) {
      console.error('Failed to load channels:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFetchChannel = async () => {
    if (!channelUrl.trim()) {
      setError('Please enter a YouTube channel URL')
      return
    }

    setError('')
    setSuccessMessage('')
    setFetching(true)

    try {
      const response = await fetch('/api/youtube/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl: channelUrl.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch channel')
      }

      setSuccessMessage(data.message)
      setChannelUrl('')
      await loadChannels()
    } catch (err: any) {
      setError(err.message || 'Failed to fetch channel')
    } finally {
      setFetching(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete ${title}?`)) return

    try {
      await supabase.deleteChannel(id)
      setChannels(channels.filter((c) => c.id !== id))
    } catch (err) {
      console.error('Failed to delete channel:', err)
      setError('Failed to delete channel')
    }
  }

  if (loading) {
    return (
      <div className="bg-black border border-white p-6">
        <h2 className="text-2xl font-light mb-6 text-white tracking-tight">YouTube Insights</h2>
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="bg-black border border-white p-6">
      <h2 className="text-2xl font-light mb-6 text-white tracking-tight">YouTube Insights</h2>

      {/* Add Channel Form */}
      <div className="mb-8 bg-black border border-white p-6">
        <h3 className="text-xl font-medium mb-4 text-white">Add YouTube Channel</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
            placeholder="https://www.youtube.com/@channelname or channel URL"
            className="flex-1 px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
            disabled={fetching}
          />
          <button
            onClick={handleFetchChannel}
            disabled={fetching || !channelUrl.trim()}
            className="bg-white text-black hover:bg-gray-200 px-6 py-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {fetching ? 'Fetching...' : 'Add Channel'}
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-black border border-red-500 text-red-500 px-4 py-2">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mt-4 bg-black border border-white text-white px-4 py-2">
            ✓ {successMessage}
          </div>
        )}

        {fetching && (
          <div className="mt-4 bg-black border border-white p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium">Fetching channel data...</span>
              <span className="text-gray-400 text-sm">This may take a minute</span>
            </div>
            <div className="w-full bg-gray-900 h-2 overflow-hidden">
              <div className="h-full bg-white animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        )}
      </div>

      {/* Channels List */}
      {channels.length === 0 ? (
        <p className="text-gray-400">No channels added yet. Add a YouTube channel above to get started!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((channel) => (
            <Link
              key={channel.id}
              href={`/youtube/${channel.id}`}
              className="bg-black border border-white p-6 hover:border-gray-400 transition-all duration-200 block"
            >
              <div className="flex items-start gap-4">
                {channel.thumbnail_url && (
                  <img
                    src={channel.thumbnail_url}
                    alt={channel.title}
                    className="w-16 h-16 border border-white object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold mb-2 text-white truncate">{channel.title}</h3>
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>{channel.subscriber_count?.toLocaleString() || 0} subscribers</p>
                    <p>{channel.video_count?.toLocaleString() || 0} videos</p>
                    <p className="text-xs">Added {new Date(channel.created_at!).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    handleDelete(channel.id!, channel.title)
                  }}
                  className="bg-black text-white border border-white hover:bg-gray-900 px-4 py-2 text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
