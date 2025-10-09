import { google, youtube_v3 } from 'googleapis'

export interface YoutubeChannel {
  id?: string
  channel_id: string
  url: string
  title: string
  description?: string
  thumbnail_url?: string
  subscriber_count?: number
  video_count?: number
  user_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface YoutubeVideo {
  id?: string
  video_id: string
  channel_id: string
  title: string
  description?: string
  published_at: string
  thumbnail_url?: string
  duration?: string
  view_count?: number
  like_count?: number | null
  comment_count?: number
  tags?: string[]
  created_at?: string
  updated_at?: string
}

export interface YouTubeApiResponse {
  channel: YoutubeChannel
  videos: YoutubeVideo[]
  nextPageToken?: string
  totalVideos?: number
}

class YouTubeService {
  private youtube: youtube_v3.Youtube

  constructor() {
    const apiKey = process.env.YOUTUBE_DATA_V3_API_KEY
    if (!apiKey) {
      throw new Error('YOUTUBE_DATA_V3_API_KEY is not set')
    }

    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey,
    })
  }

  /**
   * Extract channel ID from various YouTube URL formats
   */
  extractChannelId(url: string): string | null {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname

      // Handle /channel/CHANNEL_ID
      if (pathname.includes('/channel/')) {
        return pathname.split('/channel/')[1].split('/')[0]
      }

      // Handle /@username
      if (pathname.startsWith('/@')) {
        return pathname.substring(2).split('/')[0]
      }

      // Handle /c/username or /user/username
      if (pathname.includes('/c/') || pathname.includes('/user/')) {
        return pathname.split('/').filter(Boolean)[1]
      }

      // If just channel ID provided
      if (!pathname.includes('/')) {
        return url.trim()
      }

      return null
    } catch (error) {
      return url.trim()
    }
  }

  /**
   * Get channel ID from username or custom URL
   */
  async resolveChannelId(input: string): Promise<string> {
    try {
      const extracted = this.extractChannelId(input)
      if (!extracted) {
        throw new Error('Invalid YouTube channel URL')
      }

      // If it looks like a channel ID (starts with UC), return it
      if (extracted.startsWith('UC') && extracted.length === 24) {
        return extracted
      }

      // Otherwise, search for the channel by username
      const response = await this.youtube.channels.list({
        part: ['id'],
        forHandle: extracted,
        maxResults: 1,
      })

      if (response.data.items && response.data.items.length > 0) {
        return response.data.items[0].id!
      }

      // Try searching by custom URL
      const searchResponse = await this.youtube.search.list({
        part: ['id'],
        q: extracted,
        type: ['channel'],
        maxResults: 1,
      })

      if (searchResponse.data.items && searchResponse.data.items.length > 0) {
        return searchResponse.data.items[0].id!.channelId!
      }

      throw new Error('Channel not found')
    } catch (error: any) {
      throw new Error(`Failed to resolve channel: ${error.message}`)
    }
  }

  /**
   * Get channel metadata
   */
  async getChannelInfo(channelId: string): Promise<YoutubeChannel> {
    try {
      const response = await this.youtube.channels.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: [channelId],
      })

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Channel not found')
      }

      const channel = response.data.items[0]
      const snippet = channel.snippet!
      const statistics = channel.statistics!

      return {
        channel_id: channelId,
        url: `https://www.youtube.com/channel/${channelId}`,
        title: snippet.title!,
        description: snippet.description,
        thumbnail_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
        subscriber_count: parseInt(statistics.subscriberCount || '0'),
        video_count: parseInt(statistics.videoCount || '0'),
      }
    } catch (error: any) {
      throw new Error(`Failed to get channel info: ${error.message}`)
    }
  }

  /**
   * Parse ISO 8601 duration to readable format (MM:SS or HH:MM:SS)
   */
  parseDuration(isoDuration: string): string {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return '0:00'

    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    const seconds = parseInt(match[3] || '0')

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  /**
   * Get all videos from a channel
   */
  async getChannelVideos(
    channelId: string,
    pageToken?: string,
    maxResults: number = 20
  ): Promise<{ videos: YoutubeVideo[]; nextPageToken?: string; totalResults: number }> {
    try {
      // Get channel's uploads playlist ID
      const channelResponse = await this.youtube.channels.list({
        part: ['contentDetails'],
        id: [channelId],
      })

      if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
        throw new Error('Channel not found')
      }

      const uploadsPlaylistId = channelResponse.data.items[0].contentDetails!.relatedPlaylists!.uploads!

      // Get videos from uploads playlist
      const playlistResponse = await this.youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults,
        pageToken: pageToken || undefined,
      })

      const videoIds = playlistResponse.data.items
        ?.map((item) => item.contentDetails!.videoId!)
        .filter(Boolean) || []

      if (videoIds.length === 0) {
        return { videos: [], totalResults: 0 }
      }

      // Get detailed video information
      const videosResponse = await this.youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: videoIds,
      })

      const videos: YoutubeVideo[] = videosResponse.data.items?.map((video) => {
        const snippet = video.snippet!
        const contentDetails = video.contentDetails!
        const statistics = video.statistics!

        return {
          video_id: video.id!,
          channel_id: channelId,
          title: snippet.title!,
          description: snippet.description,
          published_at: snippet.publishedAt!,
          thumbnail_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
          duration: this.parseDuration(contentDetails.duration!),
          view_count: parseInt(statistics.viewCount || '0'),
          like_count: statistics.likeCount ? parseInt(statistics.likeCount) : null,
          comment_count: parseInt(statistics.commentCount || '0'),
          tags: snippet.tags || [],
        }
      }) || []

      return {
        videos,
        nextPageToken: playlistResponse.data.nextPageToken || undefined,
        totalResults: playlistResponse.data.pageInfo?.totalResults || 0,
      }
    } catch (error: any) {
      throw new Error(`Failed to get channel videos: ${error.message}`)
    }
  }

  /**
   * Fetch all videos from a channel with pagination (no limit)
   */
  async fetchAllChannelVideos(
    channelId: string,
    maxVideos: number = 10000 // Safety limit to prevent infinite loops
  ): Promise<YoutubeVideo[]> {
    const allVideos: YoutubeVideo[] = []
    let pageToken: string | undefined = undefined
    let fetched = 0

    console.log(`Fetching all videos for channel ${channelId}...`)

    while (fetched < maxVideos) {
      const { videos, nextPageToken } = await this.getChannelVideos(
        channelId,
        pageToken,
        50 // YouTube max is 50 per request
      )

      allVideos.push(...videos)
      fetched += videos.length

      console.log(`Fetched ${fetched} videos so far...`)

      if (!nextPageToken || videos.length === 0) {
        console.log(`Finished fetching. Total videos: ${fetched}`)
        break
      }

      pageToken = nextPageToken
    }

    return allVideos
  }

  /**
   * Get basic video list (ID, title, thumbnail only) - much faster
   */
  async getBasicVideoList(
    channelId: string
  ): Promise<{ video_id: string; title: string; thumbnail_url: string }[]> {
    const allVideos: { video_id: string; title: string; thumbnail_url: string }[] = []
    let pageToken: string | undefined = undefined

    try {
      // Get channel's uploads playlist ID
      const channelResponse = await this.youtube.channels.list({
        part: ['contentDetails'],
        id: [channelId],
      })

      if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
        throw new Error('Channel not found')
      }

      const uploadsPlaylistId = channelResponse.data.items[0].contentDetails!.relatedPlaylists!.uploads!

      // Fetch all videos from playlist (only basic info)
      while (true) {
        const playlistResponse = await this.youtube.playlistItems.list({
          part: ['snippet'],
          playlistId: uploadsPlaylistId,
          maxResults: 50,
          pageToken: pageToken || undefined,
        })

        const items = playlistResponse.data.items || []

        for (const item of items) {
          const snippet = item.snippet!
          allVideos.push({
            video_id: snippet.resourceId!.videoId!,
            title: snippet.title!,
            thumbnail_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
          })
        }

        console.log(`Fetched ${allVideos.length} video titles so far...`)

        if (!playlistResponse.data.nextPageToken) {
          break
        }

        pageToken = playlistResponse.data.nextPageToken
      }

      console.log(`Total videos found: ${allVideos.length}`)
      return allVideos
    } catch (error: any) {
      throw new Error(`Failed to get video list: ${error.message}`)
    }
  }

  /**
   * Get detailed stats for specific videos
   */
  async getVideoDetails(videoIds: string[]): Promise<YoutubeVideo[]> {
    if (videoIds.length === 0) return []

    try {
      const videosResponse = await this.youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: videoIds,
      })

      const videos: YoutubeVideo[] = videosResponse.data.items?.map((video) => {
        const snippet = video.snippet!
        const contentDetails = video.contentDetails!
        const statistics = video.statistics!

        return {
          video_id: video.id!,
          channel_id: snippet.channelId!,
          title: snippet.title!,
          description: snippet.description,
          published_at: snippet.publishedAt!,
          thumbnail_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
          duration: this.parseDuration(contentDetails.duration!),
          view_count: parseInt(statistics.viewCount || '0'),
          like_count: statistics.likeCount ? parseInt(statistics.likeCount) : null,
          comment_count: parseInt(statistics.commentCount || '0'),
          tags: snippet.tags || [],
        }
      }) || []

      return videos
    } catch (error: any) {
      throw new Error(`Failed to get video details: ${error.message}`)
    }
  }
}

export const youtubeService = new YouTubeService()
