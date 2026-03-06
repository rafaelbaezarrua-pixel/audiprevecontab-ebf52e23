-- Create storage bucket for system configurations (logos, etc)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('config', 'config', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for 'config' bucket
-- Allow public read access
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Public Access to Config'
    ) THEN
        CREATE POLICY "Public Access to Config"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'config');
    END IF;

    -- Allow authenticated users to upload/update/delete config files
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated Manage Config'
    ) THEN
        CREATE POLICY "Authenticated Manage Config"
        ON storage.objects FOR ALL
        TO authenticated
        USING (bucket_id = 'config')
        WITH CHECK (bucket_id = 'config');
    END IF;
END $$;
