-- Create user_settings table for storing user preferences and settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster lookups by user_id
CREATE INDEX user_settings_user_id_idx ON user_settings(user_id);

-- Add RLS policies
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Users can only see their own settings
CREATE POLICY user_settings_select_policy ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own settings
CREATE POLICY user_settings_insert_policy ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own settings
CREATE POLICY user_settings_update_policy ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION update_user_settings_updated_at();

-- Note: Default settings are now handled at the application level
-- in the userSettingsService.createDefaultSettings method
