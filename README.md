# Youtube Researcher 3000 App

A Next.js application for transcribing audio and video files using OpenAI's Whisper model. Features include user authentication, YouTube video support, tag management, and transcription history.

## Features

- **Audio/Video Transcription**: Upload files or provide YouTube URLs for transcription
- **User Authentication**: Secure login and signup with Supabase
- **Dashboard**: View, download, and manage your transcriptions
- **Tags**: Organize transcriptions with custom tags
- **Multiple Models**: Choose from tiny, base, small, medium, or large Whisper models
- **Language Support**: Auto-detect or specify the language
- **Translation**: Translate audio to English

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+ with Flask and Whisper
- Supabase account
- yt-dlp (for YouTube support)

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd whisper-next
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Set up Supabase database

Run the migrations in your Supabase dashboard:

1. Go to the SQL editor
2. Run the migration from `supabase/migrations/20250929_create_transcriptions.sql`
3. Run the migration from `supabase/migrations/20250929_add_tags_and_user.sql`

### 5. Start the Python backend

Make sure you have the Flask server running on port 3000:

```bash
cd /path/to/whisper
python3 server.py
```

### 6. Start the Next.js development server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Deployment to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

**Note**: The Python backend for Whisper transcription needs to be hosted separately. You can:
- Deploy it to a service like Railway, Render, or AWS
- Update the API route in `app/api/transcribe/route.ts` with your backend URL

## Technologies

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Supabase**: Authentication and database
- **Whisper**: OpenAI's speech-to-text model
- **yt-dlp**: YouTube audio extraction
