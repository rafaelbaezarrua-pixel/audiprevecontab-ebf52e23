
export interface IRPFRecord {
  id: string;
  nome_completo: string;
  cpf: string | null;
  ano_exercicio: number;
  valor_a_pagar: number;
  status_pago: boolean;
  data_pagamento: string | null;
  status_transmissao: string;
  data_transmissao: string | null;
  feito_por: string | null;
  forma_pagamento: string | null;
}
