
export const regimeLabels: Record<string, string> = {
  simples: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
  mei: "MEI",
};

export const situacaoConfig: Record<string, { label: string; cls: string }> = {
  ativa: { label: "Ativa", cls: "badge-success" },
  paralisada: { label: "Paralisada", cls: "badge-warning" },
  baixada: { label: "Baixada", cls: "badge-danger" },
};

export const tipoProcessoLabels: Record<string, string> = {
  abertura: "Abertura de Empresa",
  alteracao: "Alteração de Empresa",
  baixa: "Baixa de Empresa",
  abertura_mei: "Abertura de MEI",
  baixa_mei: "Baixa de MEI",
};

export const eventosAlteracao = [
  "Alteração da forma de atuação",
  "Alteração da natureza jurídica",
  "Alteração de atividades econômicas (principal e secundárias)",
  "Alteração de capital social e/ou Quadro Societário",
  "Alteração de dados cadastrais",
  "Alteração de endereço entre municípios no mesmo estado",
  "Alteração de endereço no mesmo município",
  "Alteração de exercício das atividades econômicas",
  "Alteração de nome empresarial (firma ou denominação)",
  "Alteração do tipo de unidade",
  "Enquadramento / Reenquadramento / Desenquadramento de Porte de Empresa"
];

export const passosConfig = [
  { id: 'envio_dbe_at', label: 'Envio do DBE' },
  { id: 'envio_fcn_at', label: 'Envio da FCN' },
  { id: 'envio_contrato_at', label: 'Envio do Contrato' },
  { id: 'envio_taxa_at', label: 'Envio da Taxa' },
  { id: 'assinatura_contrato_at', label: 'Assinatura' },
  { id: 'arquivamento_junta_at', label: 'Arquivamento' },
];
