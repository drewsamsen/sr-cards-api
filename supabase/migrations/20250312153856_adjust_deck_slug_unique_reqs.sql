-- Change deck slug to be unique per user instead of globally unique
ALTER TABLE public.decks DROP CONSTRAINT IF EXISTS decks_slug_key;
DROP INDEX IF EXISTS decks_slug_idx;

-- Add composite unique constraint for user_id and slug
ALTER TABLE public.decks ADD CONSTRAINT decks_user_id_slug_key UNIQUE (user_id, slug);

-- Add composite index for efficient lookups
CREATE INDEX IF NOT EXISTS decks_user_id_slug_idx ON public.decks (user_id, slug);

-- Update the generate_slug function to check uniqueness per user
CREATE OR REPLACE FUNCTION public.generate_slug(name TEXT, user_id UUID)
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
  WHILE EXISTS (SELECT 1 FROM public.decks WHERE slug = final_slug AND user_id = user_id) LOOP
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
