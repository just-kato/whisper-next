-- Create a lightweight table for quick video list display
CREATE TABLE IF NOT EXISTS youtube_video_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT UNIQUE NOT NULL,
  channel_id UUID REFERENCES youtube_channels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_youtube_video_list_channel_id ON youtube_video_list(channel_id);
CREATE INDEX IF NOT EXISTS idx_youtube_video_list_video_id ON youtube_video_list(video_id);

-- Enable RLS
ALTER TABLE youtube_video_list ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view video list from own channels" ON youtube_video_list;
CREATE POLICY "Users can view video list from own channels"
ON youtube_video_list FOR SELECT
USING (
  channel_id IN (
    SELECT id FROM youtube_channels WHERE user_id = auth.uid() OR user_id IS NULL
  )
);

DROP POLICY IF EXISTS "Users can insert video list to own channels" ON youtube_video_list;
CREATE POLICY "Users can insert video list to own channels"
ON youtube_video_list FOR INSERT
WITH CHECK (
  channel_id IN (
    SELECT id FROM youtube_channels WHERE user_id = auth.uid() OR user_id IS NULL
  )
);

DROP POLICY IF EXISTS "Users can delete video list from own channels" ON youtube_video_list;
CREATE POLICY "Users can delete video list from own channels"
ON youtube_video_list FOR DELETE
USING (
  channel_id IN (
    SELECT id FROM youtube_channels WHERE user_id = auth.uid() OR user_id IS NULL
  )
);
