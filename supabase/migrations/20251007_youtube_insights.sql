-- Create youtube_channels table
CREATE TABLE IF NOT EXISTS youtube_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  subscriber_count BIGINT,
  video_count INTEGER,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create youtube_videos table
CREATE TABLE IF NOT EXISTS youtube_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT UNIQUE NOT NULL,
  channel_id UUID REFERENCES youtube_channels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  thumbnail_url TEXT,
  duration TEXT,
  view_count BIGINT DEFAULT 0,
  like_count BIGINT,
  comment_count BIGINT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_youtube_channels_user_id ON youtube_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_channels_channel_id ON youtube_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_channel_id ON youtube_videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_video_id ON youtube_videos(video_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_published_at ON youtube_videos(published_at DESC);

-- Enable Row Level Security
ALTER TABLE youtube_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own channels" ON youtube_channels;
DROP POLICY IF EXISTS "Users can insert own channels" ON youtube_channels;
DROP POLICY IF EXISTS "Users can update own channels" ON youtube_channels;
DROP POLICY IF EXISTS "Users can delete own channels" ON youtube_channels;
DROP POLICY IF EXISTS "Users can view videos from own channels" ON youtube_videos;
DROP POLICY IF EXISTS "Users can insert videos to own channels" ON youtube_videos;
DROP POLICY IF EXISTS "Users can update videos from own channels" ON youtube_videos;
DROP POLICY IF EXISTS "Users can delete videos from own channels" ON youtube_videos;

-- RLS Policies for youtube_channels
CREATE POLICY "Users can view own channels"
ON youtube_channels FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert own channels"
ON youtube_channels FOR INSERT
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update own channels"
ON youtube_channels FOR UPDATE
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can delete own channels"
ON youtube_channels FOR DELETE
USING (user_id = auth.uid() OR user_id IS NULL);

-- RLS Policies for youtube_videos
CREATE POLICY "Users can view videos from own channels"
ON youtube_videos FOR SELECT
USING (
  channel_id IN (
    SELECT id FROM youtube_channels WHERE user_id = auth.uid() OR user_id IS NULL
  )
);

CREATE POLICY "Users can insert videos to own channels"
ON youtube_videos FOR INSERT
WITH CHECK (
  channel_id IN (
    SELECT id FROM youtube_channels WHERE user_id = auth.uid() OR user_id IS NULL
  )
);

CREATE POLICY "Users can update videos from own channels"
ON youtube_videos FOR UPDATE
USING (
  channel_id IN (
    SELECT id FROM youtube_channels WHERE user_id = auth.uid() OR user_id IS NULL
  )
);

CREATE POLICY "Users can delete videos from own channels"
ON youtube_videos FOR DELETE
USING (
  channel_id IN (
    SELECT id FROM youtube_channels WHERE user_id = auth.uid() OR user_id IS NULL
  )
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_youtube_channels_updated_at ON youtube_channels;
CREATE TRIGGER update_youtube_channels_updated_at
  BEFORE UPDATE ON youtube_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_youtube_videos_updated_at ON youtube_videos;
CREATE TRIGGER update_youtube_videos_updated_at
  BEFORE UPDATE ON youtube_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
