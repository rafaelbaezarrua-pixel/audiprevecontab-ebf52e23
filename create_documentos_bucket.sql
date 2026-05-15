-- Create the 'documentos' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
<<<<<<< HEAD
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view files
CREATE POLICY "Authenticated users can view" ON storage.objects
  FOR SELECT USING (bucket_id = 'documentos' AND auth.uid() IS NOT NULL);
=======
VALUES ('documentos', 'documentos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access (if public = true isn't enough depending on policies)
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'documentos');
>>>>>>> e7179645278bbf1c41e5c3292f702280e97485ec

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documentos' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'documentos' AND auth.role() = 'authenticated');

-- Allow authenticated users to update files
CREATE POLICY "Authenticated users can update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'documentos' AND auth.role() = 'authenticated');
