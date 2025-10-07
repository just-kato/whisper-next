import { getSupabaseClient } from './supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

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
}