-- Create blocking_sessions table for Focus Mode app blocking
CREATE TABLE IF NOT EXISTS blocking_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_apps JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS blocking_sessions_user_id_idx ON blocking_sessions(user_id);
CREATE INDEX IF NOT EXISTS blocking_sessions_is_active_idx ON blocking_sessions(is_active);
CREATE INDEX IF NOT EXISTS blocking_sessions_end_time_idx ON blocking_sessions(end_time);

-- Enable Row Level Security
ALTER TABLE blocking_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own sessions"
  ON blocking_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON blocking_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON blocking_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON blocking_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blocking_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER blocking_sessions_updated_at
  BEFORE UPDATE ON blocking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_blocking_sessions_updated_at();
