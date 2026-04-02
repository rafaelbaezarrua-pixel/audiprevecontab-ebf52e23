-- Migration: Add theme_config to profiles
-- This column will store user-specific theme customizations (colors, etc.)

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS theme_config JSONB DEFAULT NULL;

COMMENT ON COLUMN public.profiles.theme_config IS 'User-specific theme customizations (colors for light/dark modes)';
