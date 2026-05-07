-- Remove password field from User model (auth managed by Supabase Auth)
ALTER TABLE "User" DROP COLUMN IF EXISTS "password";
