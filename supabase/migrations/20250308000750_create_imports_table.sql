-- Create imports table for storing pending CSV imports
CREATE TABLE IF NOT EXISTS public.imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
  csv_data TEXT NOT NULL,
  parsed_data JSONB NOT NULL,
  summary JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes')
);

-- Add indexes for better performance
CREATE INDEX imports_user_id_idx ON public.imports(user_id);
CREATE INDEX imports_status_idx ON public.imports(status);
CREATE INDEX imports_expires_at_idx ON public.imports(expires_at);

-- Add RLS policies
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

-- Users can only view their own imports
CREATE POLICY imports_select_policy ON public.imports
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own imports
CREATE POLICY imports_insert_policy ON public.imports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own imports
CREATE POLICY imports_update_policy ON public.imports
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own imports
CREATE POLICY imports_delete_policy ON public.imports
  FOR DELETE USING (auth.uid() = user_id);

-- Create the set_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at timestamp
CREATE TRIGGER set_imports_updated_at
  BEFORE UPDATE ON public.imports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Create a function to clean up expired imports
CREATE OR REPLACE FUNCTION public.cleanup_expired_imports()
RETURNS void AS $$
BEGIN
  DELETE FROM public.imports
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a cron job to run the cleanup function every hour
-- Note: This requires pg_cron extension to be enabled
-- If pg_cron is not available, you'll need to implement cleanup in your application
-- Comment out this line if pg_cron is not available
-- SELECT cron.schedule('0 * * * *', 'SELECT public.cleanup_expired_imports();'); 