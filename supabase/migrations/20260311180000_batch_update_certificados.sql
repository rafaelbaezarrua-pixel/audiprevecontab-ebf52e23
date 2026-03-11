-- 20260311180000_batch_update_certificados.sql
-- Atualização em lote de datas de vencimento de certificados digitais baseada em CNPJ

DO $$
DECLARE
    v_item RECORD;
    v_empresa_id UUID;
BEGIN
    -- 1. Garantir que certificados_digitais tenha a estrutura correta
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certificados_digitais' AND column_name = 'updated_at') THEN
        ALTER TABLE public.certificados_digitais ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'certificados_digitais_empresa_id_key'
    ) THEN
        -- Tenta remover duplicados antes de adicionar a constraint (mantendo o mais recente)
        DELETE FROM public.certificados_digitais a USING (
          SELECT MIN(ctid) as ctid, empresa_id
          FROM public.certificados_digitais 
          GROUP BY empresa_id HAVING COUNT(*) > 1
        ) b
        WHERE a.empresa_id = b.empresa_id AND a.ctid <> b.ctid;

        ALTER TABLE public.certificados_digitais ADD CONSTRAINT certificados_digitais_empresa_id_key UNIQUE (empresa_id);
    END IF;

    -- 2. Lista de dados extraídos da imagem (CNPJ, Data de Vencimento)
    FOR v_item IN (
        SELECT * FROM (VALUES
            ('44.113.639/0001-59', '2026-10-10'),
            ('17.243.875/0001-17', '2025-11-06'),
            ('08.021.302/0001-58', '2026-11-07'),
            ('15.086.618/0001-93', '2026-11-14'),
            ('36.939.600/0001-67', '2026-10-01'),
            ('07.230.218/0001-81', '2026-07-23'),
            ('09.242.904/0001-06', '2027-01-23'),
            ('42.274.932/0001-72', '2026-01-30'),
            ('10.624.695/0001-36', '2027-01-09'),
            ('29.250.978/0001-93', '2026-06-18'),
            ('11.917.048/0001-85', '2025-07-24'),
            ('62.843.999/0001-98', '2026-09-29'),
            ('34.026.326/0001-00', '2026-08-05'),
            ('36.258.120/0001-30', '2025-09-05'),
            ('41.471.323/0001-40', '2026-10-28'),
            ('24.281.083/0001-00', '2026-05-20'),
            ('28.158.529/0001-57', '2026-12-10'),
            ('12.096.917/0001-10', '2026-03-13'),
            ('44.361.884/0001-85', '2026-05-16'),
            ('23.925.680/0001-50', '2025-02-19'),
            ('57.993.597/0001-30', '2026-12-02'),
            ('40.812.071/0001-03', '2026-05-20'),
            ('58.403.024/0001-71', '2026-01-15'),
            ('10.547.606/0001-03', '2026-05-11'),
            ('08.109.609/0001-05', '2026-09-02'),
            ('14.559.291/0001-67', '2026-04-23'),
            ('60.747.147/0001-71', '2026-10-09'),
            ('07.994.220/0001-27', '2027-02-04'),
            ('07.890.896/0001-95', '2024-10-26'),
            ('11.310.110/0001-76', '2026-12-10'),
            ('33.016.785/0001-40', '2025-03-19'),
            ('00.003.357/0759-97', '2026-06-24'),
            ('27.755.840/0001-10', '2026-07-11'),
            ('47.272.234/0001-51', '2026-04-30'),
            ('14.546.721/0001-06', '2026-03-14'),
            ('27.816.310/0001-35', '2025-09-20'),
            ('36.262.274/0001-04', '2024-09-14'),
            ('23.774.075/0001-25', '2026-11-06'),
            ('08.653.947/0001-03', '2027-02-11'),
            ('13.595.535/0001-02', '2025-08-20'),
            ('18.801.284/0001-80', '2024-06-20'),
            ('49.914.160/0001-35', '2026-04-28'),
            ('16.695.810/0001-40', '2025-04-15'),
            ('12.098.647/0001-87', '2026-11-07'),
            ('39.338.968/0001-68', '2026-10-28'),
            ('36.785.506/0001-09', '2025-12-04'),
            ('50.048.882/0001-33', '2027-02-13'),
            ('51.138.495/0001-50', '2026-04-07'),
            ('62.954.127/0001-05', '2026-10-01'),
            ('26.530.573/0001-10', '2027-01-16'),
            ('42.309.136/0001-28', '2026-08-08'),
            ('32.787.295/0001-84', '2026-04-07'),
            ('11.436.531/0001-48', '2026-12-08'),
            ('41.012.747/0001-47', '2027-01-03'),
            ('06.960.906/0001-34', '2026-04-04'),
            ('56.160.881/0001-62', '2025-08-12'),
            ('25.325.009/0001-01', '2026-07-22'),
            ('05.328.296/0001-98', '2026-12-12'),
            ('57.429.175/0001-36', '2025-09-27'),
            ('34.470.700/0001-61', '2026-08-08'),
            ('20.442.063/0001-92', '2026-03-03'),
            ('40.123.247/0001-10', '2026-03-27'),
            ('24.107.752/0001-14', '2027-01-13'),
            ('47.074.258/0001-04', '2026-07-09'),
            ('32.787.295/0001-84', '2027-01-22'),
            ('40.319.403/0001-12', '2026-06-23'),
            ('50.397.106/0001-49', '2024-04-28'),
            ('55.158.139/0001-50', '2026-05-06'),
            ('57.924.951/0001-74', '2026-11-19'),
            ('53.605.672/0001-97', '2027-01-27'),
            ('53.170.087/0001-01', '2025-01-12')
        ) AS t(cnpj, vencimento)
    ) LOOP
        -- Busca empresa pelo CNPJ limpo
        SELECT id INTO v_empresa_id 
        FROM public.empresas 
        WHERE regexp_replace(cnpj, '\D', '', 'g') = regexp_replace(v_item.cnpj, '\D', '', 'g')
        LIMIT 1;

        IF v_empresa_id IS NOT NULL THEN
            INSERT INTO public.certificados_digitais (empresa_id, data_vencimento, observacao)
            VALUES (v_empresa_id, v_item.vencimento::DATE, 'Importação em lote via Excel/Imagem')
            ON CONFLICT (empresa_id) DO UPDATE 
            SET data_vencimento = EXCLUDED.data_vencimento,
                updated_at = now();
        END IF;
    END LOOP;
END $$;
