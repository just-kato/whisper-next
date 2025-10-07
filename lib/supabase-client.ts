'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabaseClient() {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('Missing Supabase environment variables')
    console.log('NEXT_PUBLIC_SUPABASE_URL:', url ? 'SET' : 'MISSING')
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', key ? 'SET' : 'MISSING')
    throw new Error('Missing Supabase environment variables')
  }

  client = createBrowserClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  })

  // Clear any invalid sessions on initialization
  client.auth.getSession().catch(() => {
    client?.auth.signOut()
  })

  return client
}