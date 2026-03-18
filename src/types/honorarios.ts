
export interface HonorarioConfig {
  id?: string;
  empresa_id: string;
  valor_honorario: number;
  valor_por_funcionario: number;
  valor_por_recalculo: number;
  valor_trabalhista: number;
  valor_por_recibo: number;
  outros_servicos: Array<{ descricao: string; valor: number }>;
}

export interface HonorarioMensal {
  id?: string;
  empresa_id: string;
  competencia: string;
  qtd_funcionarios: number;
  qtd_recalculos: number;
  qtd_recibos: number;
  teve_encargo_trabalhista: boolean;
  valor_total: number;
  data_vencimento: string | null;
  data_envio: string | null;
  forma_envio: string | null;
  status: string;
  pago: boolean;
  detalhes_calculo?: Array<{ rotulo: string; qtd: number; vlrUnit: number; vlrTotal: number }>;
  observacoes?: { texto: string } | null;
  empresas?: { nome_empresa: string };
}

export interface ServicoEsporadico {
  id?: string;
  nome_cliente: string;
  cpf_cnpj: string;
  tipo_servico: string;
  valor: number;
  pago: boolean;
  competencia: string;
}
