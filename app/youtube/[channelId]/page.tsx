'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { SupabaseService } from '@/lib/supabase'
import type { YoutubeChannel, YoutubeVideo } from '@/lib/youtube'
import Link from 'next/link'

type TabType = 'analytics' | 'quick-view'
type SortField = 'view_count' | 'like_count' | 'published_at' | 'title' | 'date_views' | 'date_likes'
type SortOrder = 'asc' | 'desc'
type VideoTypeFilter = 'all' | 'shorts' | 'long-form'

export default function ChannelDetailPage() {
  const params = useParams()
  const router = useRouter()
  const channelId = params.channelId as string

  const [activeTab, setActiveTab] = useState<TabType>('analytics')
  const [channel, setChannel] = useState<YoutubeChannel | null>(null)
  const [videos, setVideos] = useState<YoutubeVideo[]>([])
  const [filteredVideos, setFilteredVideos] = useState<YoutubeVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalVideos, setTotalVideos] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('view_count')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [videosPerPage, setVideosPerPage] = useState(20)
  const [selectedVideo, setSelectedVideo] = useState<YoutubeVideo | null>(null)
  const [videoTypeFilter, setVideoTypeFilter] = useState<VideoTypeFilter>('all')
  const [supabase] = useState(() => new SupabaseService())

  useEffect(() => {
    loadChannelData()
  }, [channelId])

  useEffect(() => {
    // Filter and sort videos when search/sort changes
    if (videos.length > 0) {
      let filtered = [...videos]

      // Apply video type filter (YouTube Shorts are <= 60 seconds)
      if (videoTypeFilter === 'shorts') {
        filtered = filtered.filter(v => {
          if (!v.duration) return false
          const parts = v.duration.split(':')
          if (parts.length === 2) {
            // MM:SS format
            const minutes = parseInt(parts[0])
            const seconds = parseInt(parts[1])
            return minutes === 0 && seconds <= 60
          } else if (parts.length === 3) {
            // HH:MM:SS format - definitely not a short
            return false
          }
          return false
        })
      } else if (videoTypeFilter === 'long-form') {
        filtered = filtered.filter(v => {
          if (!v.duration) return true
          const parts = v.duration.split(':')
          if (parts.length === 2) {
            // MM:SS format
            const minutes = parseInt(parts[0])
            const seconds = parseInt(parts[1])
            return minutes > 0 || seconds > 60
          } else if (parts.length === 3) {
            // HH:MM:SS format - definitely long-form
            return true
          }
          return true
        })
      }

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(v =>
          v.title.toLowerCase().includes(query) ||
          (v.tags && v.tags.some(tag => tag.toLowerCase().includes(query)))
        )
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let aVal, bVal

        switch (sortField) {
          case 'view_count':
            aVal = a.view_count || 0
            bVal = b.view_count || 0
            break
          case 'like_count':
            aVal = a.like_count || 0
            bVal = b.like_count || 0
            break
          case 'published_at':
            aVal = new Date(a.published_at).getTime()
            bVal = new Date(b.published_at).getTime()
            break
          case 'title':
            aVal = a.title.toLowerCase()
            bVal = b.title.toLowerCase()
            break
          case 'date_views':
            // Sort by views first, then by date as tiebreaker
            const viewCompare = (b.view_count || 0) - (a.view_count || 0)
            if (viewCompare !== 0) {
              return sortOrder === 'asc' ? -viewCompare : viewCompare
            }
            return sortOrder === 'asc'
              ? new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
              : new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
          case 'date_likes':
            // Sort by likes first, then by date as tiebreaker
            const likeCompare = (b.like_count || 0) - (a.like_count || 0)
            if (likeCompare !== 0) {
              return sortOrder === 'asc' ? -likeCompare : likeCompare
            }
            return sortOrder === 'asc'
              ? new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
              : new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
          default:
            return 0
        }

        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1
        } else {
          return aVal < bVal ? 1 : -1
        }
      })

      setFilteredVideos(filtered)
    }
  }, [videos, searchQuery, sortField, sortOrder, videoTypeFilter])

  const loadChannelData = async () => {
    try {
      setLoading(true)
      const [channelData, allVideos, count] = await Promise.all([
        supabase.getChannelById(channelId),
        supabase.getAllVideosByChannelId(channelId),
        supabase.getVideoCount(channelId),
      ])

      setChannel(channelData)
      setVideos(allVideos)
      setTotalVideos(count)
    } catch (err: any) {
      console.error('Failed to load channel data:', err)
      setError(err.message || 'Failed to load channel data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (!channel) return

    setRefreshing(true)
    setError('')

    try {
      const response = await fetch('/api/youtube/fetch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: channel.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh channel')
      }

      await loadChannelData()
    } catch (err: any) {
      setError(err.message || 'Failed to refresh channel')
    } finally {
      setRefreshing(false)
    }
  }

  const handleExportCSV = () => {
    const videosToExport = activeTab === 'analytics' || activeTab === 'quick-view' ? filteredVideos : videos

    // CSV header
    const headers = ['Title', 'Video URL', 'Thumbnail URL', 'Views', 'Tags']

    // CSV rows
    const rows = videosToExport.map(video => [
      `"${(video.title || '').replace(/"/g, '""')}"`, // Escape quotes in title
      `https://www.youtube.com/watch?v=${video.video_id}`,
      video.thumbnail_url || '',
      video.view_count || 0,
      `"${(video.tags || []).join(', ').replace(/"/g, '""')}"` // Escape quotes in tags
    ])

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `${channel?.title || 'channel'}_videos_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const displayVideos = activeTab === 'analytics' || activeTab === 'quick-view' ? filteredVideos : videos
  const paginatedVideos = displayVideos.slice(page * videosPerPage, (page + 1) * videosPerPage)
  const totalPages = Math.ceil(displayVideos.length / videosPerPage)

  if (loading && !channel) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    )
  }

  if (error && !channel) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-black border border-red-500 text-red-500 px-6 py-4">
          {error}
        </div>
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white text-xl">Channel not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/?tab=youtube"
            className="text-white hover:text-gray-400 inline-block mb-4 font-medium"
          >
            ← Back to Dashboard
          </Link>

          <div className="bg-black border border-white p-6">
            <div className="flex items-start gap-4 mb-4">
              {channel.thumbnail_url && (
                <img
                  src={channel.thumbnail_url}
                  alt={channel.title}
                  className="w-24 h-24 border border-white object-cover"
                />
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-light text-white mb-2 tracking-tight">{channel.title}</h1>
                <div className="text-sm text-gray-400 space-y-1">
                  <p>{channel.subscriber_count?.toLocaleString() || 0} subscribers</p>
                  <p>{totalVideos} videos in database</p>
                  <p>Last updated: {new Date(channel.updated_at!).toLocaleString()}</p>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-white text-black hover:bg-gray-200 px-6 py-2 font-medium transition-colors disabled:opacity-50"
              >
                {refreshing ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>

            {channel.description && (
              <p className="text-gray-400 text-sm mt-4 line-clamp-3">{channel.description}</p>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-black border border-red-500 text-red-500 px-4 py-2">
            {error}
          </div>
        )}

        {refreshing && (
          <div className="mb-4 bg-black border border-white p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium">Refreshing channel data...</span>
              <span className="text-gray-400 text-sm">This may take a few minutes</span>
            </div>
            <div className="w-full bg-gray-900 h-2 overflow-hidden">
              <div className="h-full bg-white animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-white">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-4 font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'text-white border-b-2 border-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Analytics & Sorting ({videos.length} videos)
            </button>
            <button
              onClick={() => setActiveTab('quick-view')}
              className={`pb-4 font-medium transition-colors ${
                activeTab === 'quick-view'
                  ? 'text-white border-b-2 border-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Quick View
            </button>
          </nav>
        </div>

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="mb-6 bg-black border border-white p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              {/* Video Type Filter */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Video Type</label>
                <select
                  value={videoTypeFilter}
                  onChange={(e) => setVideoTypeFilter(e.target.value as VideoTypeFilter)}
                  className="w-full px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
                >
                  <option value="all">All</option>
                  <option value="shorts">Shorts</option>
                  <option value="long-form">Long-form</option>
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search titles or tags..."
                  className="w-full px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Sort By</label>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="w-full px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
                >
                  <option value="view_count">Views</option>
                  <option value="like_count">Likes</option>
                  <option value="published_at">Published Date</option>
                  <option value="title">Title</option>
                  <option value="date_views">Date → Views</option>
                  <option value="date_likes">Date → Likes</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className="w-full px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
                >
                  <option value="desc">Descending (High to Low)</option>
                  <option value="asc">Ascending (Low to High)</option>
                </select>
              </div>

              {/* Videos Per Page */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Videos Per Page</label>
                <select
                  value={videosPerPage}
                  onChange={(e) => {
                    setVideosPerPage(Number(e.target.value))
                    setPage(0)
                  }}
                  className="w-full px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
                >
                  <option value="20">20</option>
                  <option value="40">40</option>
                  <option value="60">60</option>
                  <option value="80">80</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>

            <p className="text-gray-400 text-sm">
              Showing {filteredVideos.length} of {videos.length} videos
            </p>
          </div>
        )}

        {/* Quick View Tab */}
        {activeTab === 'quick-view' && (
          <div className="mb-6 bg-black border border-white p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Video Type Filter */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Video Type</label>
                <select
                  value={videoTypeFilter}
                  onChange={(e) => setVideoTypeFilter(e.target.value as VideoTypeFilter)}
                  className="w-full px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
                >
                  <option value="all">All</option>
                  <option value="shorts">Shorts</option>
                  <option value="long-form">Long-form</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Sort By</label>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="w-full px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
                >
                  <option value="view_count">Views</option>
                  <option value="like_count">Likes</option>
                  <option value="published_at">Published Date</option>
                  <option value="date_views">Date → Views</option>
                  <option value="date_likes">Date → Likes</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className="w-full px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
                >
                  <option value="desc">Descending (High to Low)</option>
                  <option value="asc">Ascending (Low to High)</option>
                </select>
              </div>

              {/* Videos Per Page */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Videos Per Page</label>
                <select
                  value={videosPerPage}
                  onChange={(e) => {
                    setVideosPerPage(Number(e.target.value))
                    setPage(0)
                  }}
                  className="w-full px-4 py-2 bg-black text-white border border-white focus:border-white focus:outline-none"
                >
                  <option value="20">20</option>
                  <option value="40">40</option>
                  <option value="60">60</option>
                  <option value="80">80</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">
                Showing {displayVideos.length} videos
              </p>
              <button
                onClick={handleExportCSV}
                className="bg-white text-black hover:bg-gray-200 px-4 py-2 font-medium transition-colors"
              >
                Export CSV
              </button>
            </div>
          </div>
        )}

        {/* Videos Table */}
        {activeTab === 'analytics' && (
          <div className="bg-black border border-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white">
                  <th className="px-4 py-3 text-left text-white font-medium">Thumbnail</th>
                  <th className="px-4 py-3 text-left text-white font-medium">Title</th>
                  <th className="px-4 py-3 text-left text-white font-medium">Published</th>
                  <th className="px-4 py-3 text-left text-white font-medium">Duration</th>
                  <th className="px-4 py-3 text-left text-white font-medium">Views</th>
                  <th className="px-4 py-3 text-left text-white font-medium">Likes</th>
                  <th className="px-4 py-3 text-left text-white font-medium">Tags</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVideos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No videos found
                    </td>
                  </tr>
                ) : (
                  paginatedVideos.map((video) => (
                    <tr key={video.id} className="border-b border-white hover:bg-gray-900">
                      <td className="px-4 py-3">
                        {video.thumbnail_url && (
                          <a
                            href={`https://www.youtube.com/watch?v=${video.video_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={video.thumbnail_url}
                              alt={video.title}
                              className="w-32 h-18 border border-white object-cover hover:opacity-80"
                            />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://www.youtube.com/watch?v=${video.video_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-gray-400 font-medium"
                        >
                          {video.title}
                        </a>
                        {video.description && (
                          <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                            {video.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm whitespace-nowrap">
                        {new Date(video.published_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm whitespace-nowrap">
                        {video.duration}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm whitespace-nowrap">
                        {video.view_count?.toLocaleString() || 0}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm whitespace-nowrap">
                        {video.like_count ? video.like_count.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {video.tags && video.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {video.tags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className="bg-white text-black text-xs px-2 py-1 font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                            {video.tags.length > 3 && (
                              <span className="text-gray-400 text-xs px-2 py-1">
                                +{video.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-white p-4 flex items-center justify-between">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="bg-white text-black hover:bg-gray-200 px-4 py-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-white">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="bg-white text-black hover:bg-gray-200 px-4 py-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
        )}

        {/* Quick View Grid */}
        {activeTab === 'quick-view' && (
          <div className="bg-black border border-white">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
              {paginatedVideos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => setSelectedVideo(video)}
                  className="group text-left"
                >
                  <div className="border border-white hover:border-gray-400 transition-colors cursor-pointer">
                    {video.thumbnail_url && (
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full aspect-video object-cover"
                      />
                    )}
                    <div className="p-2">
                      <p className="text-white text-sm font-medium line-clamp-2 group-hover:text-gray-400 transition-colors">
                        {video.title}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {video.view_count?.toLocaleString() || 0} views
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-white p-4 flex items-center justify-between">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="bg-white text-black hover:bg-gray-200 px-4 py-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-white">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="bg-white text-black hover:bg-gray-200 px-4 py-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Video Detail Modal */}
        {selectedVideo && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedVideo(null)}
          >
            <div
              className="bg-black border-2 border-white max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-white p-4 flex items-center justify-between">
                <h2 className="text-xl font-light text-white">Video Details</h2>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="text-white hover:text-gray-400 text-2xl font-light"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Thumbnail */}
                {selectedVideo.thumbnail_url && (
                  <img
                    src={selectedVideo.thumbnail_url}
                    alt={selectedVideo.title}
                    className="w-full border border-white mb-6"
                  />
                )}

                {/* Title */}
                <h3 className="text-2xl font-light text-white mb-4">{selectedVideo.title}</h3>

                {/* Tags */}
                {selectedVideo.tags && selectedVideo.tags.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm font-medium text-white mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedVideo.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="bg-white text-black text-sm px-3 py-1 font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Views</p>
                    <p className="text-white font-medium">{selectedVideo.view_count?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Likes</p>
                    <p className="text-white font-medium">{selectedVideo.like_count?.toLocaleString() || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Duration</p>
                    <p className="text-white font-medium">{selectedVideo.duration}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Published</p>
                    <p className="text-white font-medium">{new Date(selectedVideo.published_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Description */}
                {selectedVideo.description && (
                  <div className="mb-6">
                    <p className="text-sm font-medium text-white mb-2">Description</p>
                    <p className="text-gray-400 text-sm whitespace-pre-wrap">{selectedVideo.description}</p>
                  </div>
                )}

                {/* Watch on YouTube Button */}
                <a
                  href={`https://www.youtube.com/watch?v=${selectedVideo.video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-black hover:bg-gray-200 px-6 py-3 font-medium inline-block transition-colors"
                >
                  Watch on YouTube
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
