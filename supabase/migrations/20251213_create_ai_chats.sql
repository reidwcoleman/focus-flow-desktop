-- Create ai_chats table for storing AI conversation history
CREATE TABLE IF NOT EXISTS ai_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS ai_chats_user_id_idx ON ai_chats(user_id);
CREATE INDEX IF NOT EXISTS ai_chats_created_at_idx ON ai_chats(created_at DESC);

-- Enable Row Level Security
ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own chats"
  ON ai_chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chats"
  ON ai_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
  ON ai_chats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats"
  ON ai_chats FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_chats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER ai_chats_updated_at
  BEFORE UPDATE ON ai_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_chats_updated_at();
