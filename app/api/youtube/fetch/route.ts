import { NextRequest, NextResponse } from 'next/server'
import { youtubeService } from '@/lib/youtube'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300 // 5 minutes

// Create server-side Supabase client
function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    const { channelUrl } = await request.json()

    if (!channelUrl) {
      return NextResponse.json(
        { error: 'Channel URL is required' },
        { status: 400 }
      )
    }

    // Initialize Supabase client (server-side)
    const supabase = getServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    // Step 1: Resolve the channel ID from the URL
    console.log('Resolving channel ID from URL:', channelUrl)
    const channelId = await youtubeService.resolveChannelId(channelUrl)

    // Step 2: Check if channel already exists in database
    const { data: existingChannel } = await supabase
      .from('youtube_channels')
      .select('*')
      .eq('channel_id', channelId)
      .single()

    if (existingChannel) {
      console.log('Channel already exists:', existingChannel.title)
      return NextResponse.json({
        channel: existingChannel,
        message: 'Channel already exists. Use refresh to update data.',
      })
    }

    // Step 3: Fetch channel info from YouTube
    console.log('Fetching channel info from YouTube...')
    const channelInfo = await youtubeService.getChannelInfo(channelId)
    channelInfo.user_id = user?.id || null

    // Step 4: Save channel to database
    console.log('Saving channel to database:', channelInfo.title)
    const { data: savedChannel, error: saveError } = await supabase
      .from('youtube_channels')
      .upsert([channelInfo], { onConflict: 'channel_id' })
      .select()
      .single()

    if (saveError) throw saveError

    // Step 5: Fetch ALL video titles and thumbnails (fast!)
    console.log('Fetching all video titles and thumbnails from YouTube...')
    const basicVideos = await youtubeService.getBasicVideoList(channelId)

    // Step 6: Save to simplified video list table
    if (basicVideos.length > 0) {
      console.log(`Saving ${basicVideos.length} video titles to database...`)
      const videoListData = basicVideos.map(video => ({
        video_id: video.video_id,
        title: video.title,
        thumbnail_url: video.thumbnail_url,
        channel_id: savedChannel.id!,
      }))

      const { error: listError } = await supabase
        .from('youtube_video_list')
        .upsert(videoListData, { onConflict: 'video_id' })

      if (listError) throw listError
    }

    // Step 7: Fetch full details for 500 most recent videos
    console.log('Fetching full details for 500 most recent videos...')
    const allVideos = await youtubeService.fetchAllChannelVideos(channelId, 500)

    // Step 8: Save full video details
    if (allVideos.length > 0) {
      console.log(`Saving ${allVideos.length} videos with full details...`)
      const videosWithChannelId = allVideos.map(video => ({
        ...video,
        channel_id: savedChannel.id!,
      }))

      // Insert in batches of 100 to avoid payload limits
      for (let i = 0; i < videosWithChannelId.length; i += 100) {
        const batch = videosWithChannelId.slice(i, i + 100)
        const { error: videosError } = await supabase
          .from('youtube_videos')
          .upsert(batch, { onConflict: 'video_id' })

        if (videosError) {
          console.error(`Error saving batch ${i}-${i + batch.length}:`, videosError)
          throw videosError
        }
        console.log(`Saved batch ${i}-${i + batch.length}`)
      }
    }

    return NextResponse.json({
      channel: savedChannel,
      videoCount: allVideos.length,
      message: `Successfully fetched ${allVideos.length} videos from ${channelInfo.title}`,
    })
  } catch (error: any) {
    console.error('YouTube fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch YouTube channel data' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { channelId } = await request.json()

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabase = getServerSupabase()

    // Get channel from database
    const { data: channel, error: channelError } = await supabase
      .from('youtube_channels')
      .select('*')
      .eq('id', channelId)
      .single()

    if (channelError || !channel) {
      return NextResponse.json(
        { error: 'Channel not found in database' },
        { status: 404 }
      )
    }

    // Refresh channel info
    console.log('Refreshing channel info:', channel.title)
    const updatedChannelInfo = await youtubeService.getChannelInfo(channel.channel_id)
    updatedChannelInfo.user_id = channel.user_id

    const { data: savedChannel, error: saveError } = await supabase
      .from('youtube_channels')
      .upsert([updatedChannelInfo], { onConflict: 'channel_id' })
      .select()
      .single()

    if (saveError) throw saveError

    // Delete existing videos
    console.log('Deleting old videos...')
    await supabase
      .from('youtube_videos')
      .delete()
      .eq('channel_id', channelId)

    // Fetch fresh videos (500 most recent)
    console.log('Fetching 500 most recent videos...')
    const videos = await youtubeService.fetchAllChannelVideos(channel.channel_id, 500)

    if (videos.length > 0) {
      console.log(`Saving ${videos.length} videos...`)
      const videosWithChannelId = videos.map(video => ({
        ...video,
        channel_id: channelId,
      }))

      const { error: videosError } = await supabase
        .from('youtube_videos')
        .upsert(videosWithChannelId, { onConflict: 'video_id' })

      if (videosError) throw videosError
    }

    return NextResponse.json({
      channel: savedChannel,
      videoCount: videos.length,
      message: `Refreshed ${videos.length} videos from ${channel.title}`,
    })
  } catch (error: any) {
    console.error('YouTube refresh error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to refresh YouTube channel data' },
      { status: 500 }
    )
  }
}
