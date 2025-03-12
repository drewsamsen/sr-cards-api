-- Change deck slug to be unique per user instead of globally unique
DO $$
BEGIN
    -- Drop the global uniqueness constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'decks_slug_key' AND conrelid = 'public.decks'::regclass
    ) THEN
        ALTER TABLE public.decks DROP CONSTRAINT decks_slug_key;
    END IF;
    
    -- Drop the index if it exists
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'decks_slug_idx'
    ) THEN
        DROP INDEX IF EXISTS decks_slug_idx;
    END IF;
    
    -- Add composite unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'decks_user_id_slug_key' AND conrelid = 'public.decks'::regclass
    ) THEN
        ALTER TABLE public.decks ADD CONSTRAINT decks_user_id_slug_key UNIQUE (user_id, slug);
    END IF;
END
$$;

-- Add composite index for efficient lookups
CREATE INDEX IF NOT EXISTS decks_user_id_slug_idx ON public.decks (user_id, slug);

-- First drop the existing function
DROP FUNCTION IF EXISTS public.generate_slug(TEXT, UUID);

-- Update the generate_slug function to check uniqueness per user
CREATE FUNCTION public.generate_slug(name TEXT, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special characters
  base_slug := lower(regexp_replace(name, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  
  -- Initial attempt with the base slug
  final_slug := base_slug;
  
  -- Check if slug exists for this user and append counter if needed
  WHILE EXISTS (SELECT 1 FROM public.decks WHERE slug = final_slug AND user_id = p_user_id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Update the set_deck_slug trigger function to pass user_id
CREATE OR REPLACE FUNCTION public.set_deck_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate a slug if one wasn't provided
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_slug(NEW.name, NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'set_deck_slug_trigger' AND tgrelid = 'public.decks'::regclass
    ) THEN
        CREATE TRIGGER set_deck_slug_trigger
        BEFORE INSERT ON public.decks
        FOR EACH ROW
        EXECUTE FUNCTION public.set_deck_slug();
    END IF;
END
$$;
