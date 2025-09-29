import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Forward the request to the Python Flask server
    const response = await fetch('http://127.0.0.1:3000/transcribe', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json({ error: error.error || 'Transcription failed' }, { status: response.status })
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Transcription error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}