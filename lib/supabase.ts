import { getSupabaseClient } from './supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { YoutubeChannel, YoutubeVideo } from './youtube'

export function createClient() {
  if (typeof window === 'undefined') {
    // Return a dummy client for SSR
    return null as any
  }
  return getSupabaseClient()
}

export interface Transcription {
  id: string
  name: string
  original_text: string
  formatted_text: string
  language: string | null
  model_used: string | null
  file_name: string | null
  duration_seconds: number | null
  tags: string[] | null
  user_id: string | null
  created_at: string
  updated_at: string
}

export class SupabaseService {
  private supabase: SupabaseClient

  constructor() {
    this.supabase = createClient()
  }

  async signUp(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
    return data.user
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data.user
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut()
    if (error) throw error
  }

  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  async updatePassword(password: string) {
    const { error } = await this.supabase.auth.updateUser({
      password: password
    })
    if (error) throw error
  }

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser()
      if (error) {
        // Clear invalid session
        await this.supabase.auth.signOut()
        return null
      }
      return user
    } catch (err) {
      console.error('Error getting current user:', err)
      return null
    }
  }

  onAuthStateChange(callback: (user: any) => void) {
    return this.supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null)
    })
  }

  async saveTranscription(transcription: Omit<Transcription, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await this.supabase
      .from('transcriptions')
      .insert([transcription])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getTranscriptions() {
    const { data, error } = await this.supabase
      .from('transcriptions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Transcription[]
  }

  async deleteTranscription(id: string) {
    const { error } = await this.supabase
      .from('transcriptions')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  async updateTranscriptionTags(id: string, tags: string[] | null) {
    const { error } = await this.supabase
      .from('transcriptions')
      .update({ tags })
      .eq('id', id)

    if (error) throw error
  }

  // YouTube Channel methods
  async saveChannel(channel: Omit<YoutubeChannel, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await this.supabase
      .from('youtube_channels')
      .upsert([channel], { onConflict: 'channel_id' })
      .select()
      .single()

    if (error) throw error
    return data as YoutubeChannel
  }

  async getChannels() {
    const { data, error } = await this.supabase
      .from('youtube_channels')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as YoutubeChannel[]
  }

  async getChannelById(id: string) {
    const { data, error } = await this.supabase
      .from('youtube_channels')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as YoutubeChannel
  }

  async getChannelByChannelId(channelId: string) {
    const { data, error } = await this.supabase
      .from('youtube_channels')
      .select('*')
      .eq('channel_id', channelId)
      .single()

    if (error) return null
    return data as YoutubeChannel
  }

  async deleteChannel(id: string) {
    const { error } = await this.supabase
      .from('youtube_channels')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // YouTube Video methods
  async saveVideos(videos: Omit<YoutubeVideo, 'id' | 'created_at' | 'updated_at'>[]) {
    const { data, error } = await this.supabase
      .from('youtube_videos')
      .upsert(videos, { onConflict: 'video_id' })
      .select()

    if (error) throw error
    return data as YoutubeVideo[]
  }

  async getVideosByChannelId(channelId: string, limit?: number, offset: number = 0) {
    let query = this.supabase
      .from('youtube_videos')
      .select('*')
      .eq('channel_id', channelId)
      .order('published_at', { ascending: false })

    if (limit) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data, error} = await query

    if (error) throw error
    return data as YoutubeVideo[]
  }

  async getAllVideosByChannelId(channelId: string) {
    const { data, error } = await this.supabase
      .from('youtube_videos')
      .select('*')
      .eq('channel_id', channelId)
      .order('published_at', { ascending: false })

    if (error) throw error
    return data as YoutubeVideo[]
  }

  async getVideoCount(channelId: string) {
    const { count, error } = await this.supabase
      .from('youtube_videos')
      .select('*', { count: 'exact', head: true })
      .eq('channel_id', channelId)

    if (error) throw error
    return count || 0
  }

  async deleteVideosByChannelId(channelId: string) {
    const { error } = await this.supabase
      .from('youtube_videos')
      .delete()
      .eq('channel_id', channelId)

    if (error) throw error
  }
}