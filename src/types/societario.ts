
export interface Empresa {
  id: string;
  nome_empresa: string;
  cnpj: string | null;
  regime_tributario: string | null;
  situacao: string | null;
  porte_empresa: string | null;
  natureza_juridica: string | null;
  data_abertura: string | null;
  created_at: string | null;
  socios_count?: number;
  nome_fantasia?: string | null;
  capital_social?: number | null;
  cnae_fiscal?: number | null;
  cnae_fiscal_descricao?: string | null;
  email_rfb?: string | null;
  telefone_rfb?: string | null;
  qsa?: any[] | null;
  info_rfb_completa?: any | null;
}

export interface DetalhesPasso {
  enviado_por?: string;
  observacoes?: string;
}

export interface HistoricoProcesso {
  id: string;
  processo_id: string;
  usuario_id: string;
  acao: string;
  detalhes: string | null;
  created_at: string;
}

export interface Processo {
  id: string;
  tipo: string;
  nome_empresa: string | null;
  empresa_id: string | null;
  numero_processo: string | null;
  data_inicio: string;
  status: string;
  envio_dbe_at: string | null;
  envio_fcn_at: string | null;
  envio_contrato_at: string | null;
  envio_taxa_at: string | null;
  assinatura_contrato_at: string | null;
  arquivamento_junta_at: string | null;
  foi_deferido: boolean;
  foi_arquivado: boolean;
  em_exigencia: boolean;
  exigencia_motivo: string | null;
  exigencia_respondida: boolean;
  detalhes_passos: Record<string, DetalhesPasso>;
  eventos?: string[];
  current_step?: string;
  dbe_deferido?: boolean;
  assinatura_deferida?: boolean;
  indeferimento_motivo?: string;
  voltar_para?: string;
  historico?: HistoricoProcesso[];
}
