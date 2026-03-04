INSERT INTO storage.buckets (id, name, public) VALUES ('certidoes', 'certidoes', true);

CREATE POLICY "Authenticated users upload certidoes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'certidoes');

CREATE POLICY "Authenticated users read certidoes"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'certidoes');

CREATE POLICY "Authenticated users delete certidoes"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'certidoes');

CREATE POLICY "Public read certidoes"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'certidoes');