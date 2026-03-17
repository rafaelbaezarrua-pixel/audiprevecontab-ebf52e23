import { Database } from "@/integrations/supabase/types";

export type GuiaStatus = Database["public"]["Enums"]["guia_status"];

export interface RecalculoRecord {
  id: string;
  competencia: string;
  guia: string;
  modulo_origem: string;
  empresa_id: string | null;
  parcelamento_id: string | null;
  data_recalculo: string | null;
  data_envio: string | null;
  forma_envio: string | null;
  status: GuiaStatus | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Joined fields
  empresas?: {
    nome_empresa: string;
    cnpj: string | null;
    regime_tributario: any;
    situacao: any;
  } | null;
  parcelamentos?: {
    nome_pessoa_fisica: string | null;
    cpf_pessoa_fisica: string | null;
    tipo_parcelamento: string | null;
  } | null;
}

export interface ParcelamentoRecord {
  id: string;
  empresa_id: string | null;
  tipo_pessoa: string;
  nome_pessoa_fisica: string | null;
  cpf_pessoa_fisica: string | null;
  tipo_parcelamento: string | null;
  data_inicio: string | null;
  qtd_parcelas: number | null;
  previsao_termino: string | null;
  forma_envio?: string | null;
  metodo_login?: "gov_br" | "codigo_sn" | "procuracao";
  login_gov_br?: string | null;
  senha_gov_br?: string | null;
  codigo_sn?: string | null;
  encerrado?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ParcelamentoMensalRecord {
  id: string;
  parcelamento_id: string;
  competencia: string;
  status: GuiaStatus | null;
  data_envio: string | null;
  observacoes: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CertidaoRecord {
  id: string;
  empresa_id: string;
  tipo_certidao: string;
  vencimento: string | null;
  observacao: string | null;
  arquivo_url: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LicencaTaxaRecord {
  id: string;
  empresa_id: string;
  tipo_licenca: string;
  competencia: string;
  data_vencimento: string | null;
  status: GuiaStatus | null;
  data_envio?: string | null;
  forma_envio?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LicencaRecord {
  id: string;
  empresa_id: string;
  tipo_licenca: string;
  status: string | null;
  vencimento: string | null;
  numero_processo: string | null;
  file_url: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProcuracaoRecord {
  id: string;
  empresa_id: string;
  data_cadastro: string | null;
  data_vencimento: string | null;
  observacao: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SocioRecord {
  id: string;
  nome: string;
  cpf: string | null;
  email?: string | null;
  telefone?: string | null;
  empresa_id: string;
  created_at?: string | null;
  updated_at?: string | null;
}
