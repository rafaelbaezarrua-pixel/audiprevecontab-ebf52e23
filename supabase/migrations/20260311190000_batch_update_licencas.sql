-- 20260311190000_batch_update_licencas.sql
-- Atualização em lote de licenças municipais (Alvará, Bombeiros, Meio Ambiente, Vigilância Sanitária)

DO $$
DECLARE
    v_item RECORD;
    v_empresa_id UUID;
    v_lic_tipo TEXT;
    v_status TEXT;
    v_vencimento DATE;
BEGIN
    -- 1. Garantir que licencas tenha a estrutura correta (coluna updated_at)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'licencas' AND column_name = 'updated_at') THEN
        ALTER TABLE public.licencas ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;

    -- 2. Garantir que licencas tenha a restrição de unicidade por (empresa_id, tipo_licenca)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'licencas_empresa_tipo_key'
    ) THEN
        -- Remove duplicados (mantendo o mais recente)
        DELETE FROM public.licencas a USING (
          SELECT MIN(ctid) as ctid, empresa_id, tipo_licenca
          FROM public.licencas 
          GROUP BY empresa_id, tipo_licenca HAVING COUNT(*) > 1
        ) b
        WHERE a.empresa_id = b.empresa_id AND a.tipo_licenca = b.tipo_licenca AND a.ctid <> b.ctid;

        ALTER TABLE public.licencas ADD CONSTRAINT licencas_empresa_tipo_key UNIQUE (empresa_id, tipo_licenca);
    END IF;

    -- 3. Lista de dados extraídos da imagem
    CREATE TEMP TABLE tmp_batch_licencas (
        cnpj TEXT,
        alvara TEXT,
        bombeiros TEXT,
        meio_ambiente TEXT,
        vigilancia_sanitaria TEXT
    );

    INSERT INTO tmp_batch_licencas (cnpj, alvara, bombeiros, meio_ambiente, vigilancia_sanitaria) VALUES
    ('62.525.181/0001-27', 'DISPENSADO', 'DISPENSADO', 'DISPENSADO', 'DISPENSADO'),
    ('44.113.639/0001-59', 'DEFINITIVO', '27/01/2026', 'DISPENSADO', 'DISPENSADO'),
    ('08.021.302/0001-58', 'DEFINITIVO', '17/03/2026', 'DISPENSADO', '23/07/2028'),
    ('15.086.618/0001-93', 'DEFINITIVO', 'DISPENSADO', 'DISPENSADO', 'DISPENSADO'),
    ('36.939.600/0001-67', 'DISPENSADO', 'DISPENSADO', 'DISPENSADO', 'DISPENSADO'),
    ('07.230.218/0001-81', '-', '-', '-', '-'),
    ('09.242.904/0001-06', 'DEFINITIVO', 'EM PROCESSO', 'DISPENSADO', 'DISPENSADO'),
    ('13.595.535/0001-02', 'EM PROCESSO', 'EM PROCESSO', 'EM PROCESSO', 'EM PROCESSO'),
    ('42.274.932/0001-72', 'DEFINITIVO', 'DISPENSADO', 'DISPENSADO', 'DISPENSADO'),
    ('10.624.695/0001-36', 'DEFINITIVO', 'DISPENSADO', 'DISPENSADO', '20/01/2026'),
    ('29.250.978/0001-93', 'DEFINITIVO', '27/04/2026', 'DISPENSADO', '22/05/2026'),
    ('62.843.999/0001-98', 'DEFINITIVO', 'DISPENSADO', 'DISPENSADO', 'DISPENSADO'),
    ('34.026.326/0001-00', 'DEFINITIVO', 'DISPENSADO', 'DISPENSADO', 'DISPENSADO'),
    ('15.904.876/0001-90', 'DEFINITIVO', 'DISPENSADO', 'DISPENSADO', 'DISPENSADO'),
    ('41.471.323/0001-40', 'DEFINITIVO', 'DISPENSADO', 'DISPENSADO', '07/04/2026'),
    ('24.281.083/0001-00', 'DEFINITIVO', '05/06/2026', 'DISPENSADO', '11/06/2028'),
    ('23.866.359/0001-02', 'DEFINITIVO', 'DISPENSADO', 'DISPENSADO', '11/06/2026'),
    ('12.096.917/0001-10', 'DEFINITIVO', '05/06/2026', 'DEFINITIVO', 'DISPENSADO'),
    ('28.158.529/0001-57', 'DEFINITIVO', '05/06/2026', 'DISPENSADO', '22/05/2026'),
    ('44.361.884/0001-85', 'DEFINITIVO', '23/03/2025', 'DISPENSADO', '19/02/2028'),
    ('11.233.384/0001-13', 'DEFINITIVO', '05/06/2026', 'DISPENSADO', '16/04/2027'),
    ('33.866.113/0001-23', 'DEFINITIVO', 'DISPENSADO', 'DISPENSADO', 'DISPENSADO'),
    ('57.993.397/0001-30', '03/10/2026', '16/08/2027', 'DEFINITIVO', '03/10/2026'),
    ('40.812.071/0001-03', 'DEFINITIVO', '05/06/2026', 'DISPENSADO', 'DISPENSADO'),
    ('58.403.024/0001-71', 'EM PROCESSO', 'EM PROCESSO', 'EM PROCESSO', 'EM PROCESSO'),
    ('10.547.606/0001-03', 'DEFINITIVO', '04/04/2026', 'DISPENSADO', 'DISPENSADO'),
    ('08.109.609/0001-05', 'DEFINITIVO', '06/06/2026', 'DISPENSADO', 'DISPENSADO'),
    ('31.382.888/0001-06', 'DEFINITIVO', 'DISPENSADO', 'DISPENSADO', 'DISPENSADO'),
    ('14.559.291/0001-67', 'EM PROCESSO', 'EM PROCESSO', 'EM PROCESSO', 'EM PROCESSO'),
    ('60.747.147/0001-71', 'DEFINITIVO', '29/09/2026', 'DISPENSADO', '09/10/2026'),
    ('07.994.220/0001-27', 'DEFINITIVO', '06/06/2026', '25/09/2025', 'DISPENSADO'),
    ('47.890.896/0001-95', 'DEFINITIVO', 'DISPENSADO', 'DISPENSADO', 'DISPENSADO'),
    ('11.310.110/0001-76', 'DISPENSADO', '06/06/2026', 'DISPENSADO', 'DISPENSADO'),
    ('27.755.840/0001-10', 'DEFINITIVO', '13/08/2025', 'DISPENSADO', '30/12/2026'),
    ('47.272.234/0001-51', 'EM PROCESSO', '27/06/2026', '02/10/2028', 'DISPENSADO'),
    ('14.546.721/0001-06', 'DEFINITIVO', '13/03/2026', '26/11/2028', 'DISPENSADO'),
    ('23.774.075/0001-25', 'DEFINITIVO', '05/06/2026', 'DISPENSADO', 'DISPENSADO'),
    ('08.653.947/0001-03', 'DEFINITIVO', '25/04/2026', '08/03/2026', '19/04/2026'),
    ('49.914.160/0001-35', 'DEFINITIVO', 'EM PROCESSO', 'EM PROCESSO', 'EM PROCESSO'),
    ('12.098.647/0001-87', 'DEFINITIVO', '05/06/2026', 'DISPENSADO', 'DISPENSADO'),
    ('39.338.968/0001-68', 'DEFINITIVO', 'DISPENSADO', '18/07/2028', '22/04/2027'),
    ('50.048.882/0001-33', 'DEFINITIVO', 'DISPENSADO', 'DISPENSADO', 'SOLICITAR'),
    ('51.138.495/0001-50', '31/12/2025', '18/08/2026', 'EM PROCESSO', '-'),
    ('62.954.127/0001-05', 'EM PROCESSO', 'EM PROCESSO', 'EM PROCESSO', 'EM PROCESSO'),
    ('26.530.573/0001-10', 'DEFINITIVO', 'DISPENSADO', 'DISPENSADO', 'EM PROCESSO'),
    ('11.436.531/0001-48', 'DEFINITIVO', 'DISPENSADO', 'DISPENSADO', 'DISPENSADO'),
    ('41.012.747/0001-47', 'DEFINITIVO', 'SOLICITAR', 'DISPENSADO', 'DISPENSADO'),
    ('06.960.906/0001-34', 'DEFINITIVO', '-', '-', '-'),
    ('56.160.881/0001-62', 'EM PROCESSO', 'EM PROCESSO', 'EM PROCESSO', 'EM PROCESSO'),
    ('25.325.009/0001-01', 'DEFINITIVO', 'DISPENSADO', 'DISPENSADO', 'DISPENSADO'),
    ('05.328.296/0001-98', 'EM PROCESSO', '05/06/2026', 'EM PROCESSO', 'EM PROCESSO'),
    ('57.429.175/0001-36', 'DEFINITIVO', 'DISPENSADO', 'DISPENSADO', 'DISPENSADO'),
    ('34.470.700/0001-61', 'DEFINITIVO', '05/06/2026', 'DISPENSADO', 'DISPENSADO'),
    ('20.442.063/0001-92', 'DEFINITIVO', '06/06/2026', 'DISPENSADO', 'DISPENSADO'),
    ('40.123.247/0001-10', 'DEFINITIVO', '23/05/2026', 'DISPENSADO', '23/05/2027'),
    ('58.358.306/0001-02', '13/10/2026', 'EM PROCESSO', 'EM PROCESSO', 'EM PROCESSO'),
    ('24.107.752/0001-14', 'DEFINITIVO', '05/06/2026', '-', 'EM PROCESSO'),
    ('47.074.258/0001-04', 'DEFINITIVO', 'SOLICITAR', 'DISPENSADO', 'DISPENSADO'),
    ('32.787.295/0001-84', 'DEFINITIVO', 'DISPENSADO', 'DISPENSADO', '17/10/2027'),
    ('62.350.821/0001-35', 'DEFINITIVO', '26/08/2026', '30/09/2028', '24/09/2028'),
    ('40.319.403/0001-12', 'DEFINITIVO', '15/06/2024', 'DISPENSADO', 'DISPENSADO'),
    ('55.158.139/0001-50', '03/10/2026', '25/11/2027', 'DEFINITIVO', '03/10/2026'),
    ('57.924.951/0001-74', '03/10/2026', '08/11/2027', 'DEFINITIVO', '03/10/2026'),
    ('53.605.672/0001-97', 'DEFINITIVO', '09/10/2028', 'DEFINITIVO', '03/10/2026'),
    ('53.170.087/0001-01', 'DEFINITIVO', 'DISPENSADO', 'DISPENSADO', 'EM PROCESSO'),
    ('11.592.059/0001-07', 'EM PROCESSO', 'DISPENSADO', 'DISPENSADO', 'DISPENSADO');

    -- 4. Processamento
    FOR v_item IN (SELECT * FROM tmp_batch_licencas) LOOP
        SELECT id INTO v_empresa_id FROM public.empresas WHERE regexp_replace(cnpj, '\D', '', 'g') = regexp_replace(v_item.cnpj, '\D', '', 'g') LIMIT 1;
        
        IF v_empresa_id IS NOT NULL THEN
            FOREACH v_lic_tipo IN ARRAY ARRAY['alvara', 'corpo_bombeiros', 'meio_ambiente', 'vigilancia_sanitaria'] LOOP
                CASE v_lic_tipo
                    WHEN 'alvara' THEN v_status := v_item.alvara;
                    WHEN 'corpo_bombeiros' THEN v_status := v_item.bombeiros;
                    WHEN 'meio_ambiente' THEN v_status := v_item.meio_ambiente;
                    WHEN 'vigilancia_sanitaria' THEN v_status := v_item.vigilancia_sanitaria;
                END CASE;

                IF v_status IS NULL OR v_status = '-' OR v_status = '' THEN
                    CONTINUE;
                END IF;

                v_vencimento := NULL;
                IF v_status ~ '^\d{2}/\d{2}/\d{4}$' THEN
                    v_vencimento := to_date(v_status, 'DD/MM/YYYY');
                    v_status := 'com_vencimento';
                ELSIF v_status = 'DEFINITIVO' THEN
                    v_status := 'definitiva';
                ELSIF v_status = 'DISPENSADO' THEN
                    v_status := 'dispensada';
                ELSIF v_status = 'EM PROCESSO' THEN
                    v_status := 'em_processo';
                ELSIF v_status = 'SOLICITAR' THEN
                    -- Mapeado para 'em_processo' para evitar erro de enum em transação única
                    v_status := 'em_processo';
                ELSE
                    v_status := 'em_processo';
                END IF;

                INSERT INTO public.licencas (empresa_id, tipo_licenca, status, vencimento)
                VALUES (v_empresa_id, v_lic_tipo, v_status::public.licenca_tipo, v_vencimento)
                ON CONFLICT (empresa_id, tipo_licenca) DO UPDATE
                SET status = EXCLUDED.status,
                    vencimento = EXCLUDED.vencimento,
                    updated_at = now();
            END LOOP;
        END IF;
    END LOOP;

    DROP TABLE tmp_batch_licencas;
END $$;
