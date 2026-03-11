-- Create the 'documentos' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access (if public = true isn't enough depending on policies)
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'documentos');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documentos' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'documentos' AND auth.role() = 'authenticated');

-- Allow authenticated users to update files
CREATE POLICY "Authenticated users can update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'documentos' AND auth.role() = 'authenticated');
