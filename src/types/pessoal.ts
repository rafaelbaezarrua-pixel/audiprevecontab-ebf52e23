import { Database } from "@/integrations/supabase/types";

export type GuiaStatus = Database["public"]["Enums"]["guia_status"];

export interface PessoalRecord {
  id: string;
  empresa_id: string;
  competencia: string;
  qtd_funcionarios: number | null;
  qtd_pro_labore: number | null;
  qtd_recibos: number | null;
  dctf_web_gerada: boolean | null;
  fgts_status: GuiaStatus | null;
  fgts_data_envio: string | null;
  inss_status: GuiaStatus | null;
  inss_data_envio: string | null;
  forma_envio: string | null;
  possui_recibos: boolean | null;
  possui_va: boolean | null;
  va_status: string | null;
  va_data_envio: string | null;
  possui_vc: boolean | null;
  vc_status: string | null;
  vc_data_envio: string | null;
  possui_vt: boolean | null;
  vt_status: string | null;
  vt_data_envio: string | null;
  created_at?: string | null;
}
