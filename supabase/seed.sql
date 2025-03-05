-- seed.sql
-- This file contains seed data for the local Supabase database

-- NOTE: For creating test users and decks, use the JavaScript scripts instead of SQL:
--   1. node create-test-user.js     - Creates a test user
--   2. login-test-user.js      - Tests logging in with the test user
--   3. node create-sample-decks.js  - Creates sample decks for the test user

-- This seed file is only for non-user, non-deck data that needs to be initialized
-- in the database. For example, you might add reference data, settings, or other
-- data that doesn't depend on user accounts.

-- Example of how to add reference data:
/*
INSERT INTO public.categories (name, description)
VALUES
  ('Programming', 'Programming and software development topics'),
  ('Languages', 'Human language learning topics'),
  ('Mathematics', 'Math concepts and formulas'),
  ('Science', 'Scientific concepts and theories')
ON CONFLICT (name) DO NOTHING;
*/

-- Add your non-user seed data below this line 