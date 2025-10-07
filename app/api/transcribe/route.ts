import { NextRequest, NextResponse } from 'next/server'

// Increase timeout to 30 minutes for large audio files
export const maxDuration = 1800

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Forward the request to the Python Flask server with extended timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 1800000) // 30 minutes

    try {
      const response = await fetch('http://127.0.0.1:5001/transcribe', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        // @ts-ignore - undici specific options
        headersTimeout: 1800000, // 30 minutes
        bodyTimeout: 1800000, // 30 minutes
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json()
        return NextResponse.json({ error: error.error || 'Transcription failed' }, { status: response.status })
      }

      const result = await response.json()
      return NextResponse.json(result)
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({ error: 'Transcription timeout - file may be too large' }, { status: 504 })
      }
      throw fetchError
    }
  } catch (error: any) {
    console.error('Transcription error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}