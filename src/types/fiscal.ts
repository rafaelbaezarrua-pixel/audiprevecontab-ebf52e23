import { Database } from "@/integrations/supabase/types";

export type GuiaStatus = Database["public"]["Enums"]["guia_status"];

export interface FiscalRecord {
  id: string;
  empresa_id: string;
  competencia: string;
  tipo_nota: string | null;
  recebimento_arquivos: string | null;
  forma_envio: string | null;
  ramo_empresarial: string | null;
  aliquota: number | null;
  status_guia: GuiaStatus | null;
  data_envio: string | null;
  
  aliquota_irpj: number | null;
  aliquota_csll: number | null;
  irpj_csll_status: GuiaStatus | null;
  irpj_csll_data_envio: string | null;
  
  aliquota_pis: number | null;
  aliquota_cofins: number | null;
  pis_cofins_status: GuiaStatus | null;
  pis_cofins_data_envio: string | null;
  
  aliquota_icms: number | null;
  icms_status: GuiaStatus | null;
  icms_data_envio: string | null;
  
  aliquota_iss: number | null;
  iss_status: GuiaStatus | null;
  iss_data_envio: string | null;
  
  aliquota_cbs: number | null;
  cbs_status: GuiaStatus | null;
  cbs_data_envio: string | null;
  
  aliquota_ibs: number | null;
  ibs_status: GuiaStatus | null;
  ibs_data_envio: string | null;
  
  observacoes: any; // Using Json type from Supabase or any for now until structure is clear
  created_at?: string | null;
}
