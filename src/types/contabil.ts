export type ContabilStatus = 'pendente' | 'em_andamento' | 'concluido' | 'nao_se_aplica';

export interface ContabilRecord {
  id?: string;
  empresa_id: string;
  competencia: string; // YYYY-MM
  
  // 1. Processos de Rotina Mensal
  importacao_extratos_status: ContabilStatus;
  conciliacao_patrimonial_status: ContabilStatus;
  lancamento_despesas_status: ContabilStatus;
  controle_imobilizado_status: ContabilStatus;
  apropriacao_despesas_status: ContabilStatus;
  integracao_folha_fiscal_status: ContabilStatus;

  // 2. Fechamentos e Demonstrações
  are_status: ContabilStatus;
  balancete_status: ContabilStatus;
  balanco_status: ContabilStatus;
  dre_status: ContabilStatus;
  dmpl_dlpa_status: ContabilStatus;
  dfc_status: ContabilStatus;
  notas_explicativas_status: ContabilStatus;

  // 3. Obrigações Acessórias
  ecd_status: ContabilStatus;
  ecf_status: ContabilStatus;
  ibge_status: ContabilStatus;

  // 4. Consultoria e Gestão
  analise_indices_status: ContabilStatus;
  indices_financeiros?: {
    liquidez_corrente?: number;
    endividamento?: number;
    rentabilidade?: number;
  };
  distribuicao_lucros_status: ContabilStatus;
  decore_status: ContabilStatus;

  observacoes?: any;
  updated_at?: string;
  created_at?: string;
}
